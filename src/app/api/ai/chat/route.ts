import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAllowedModules, canManageHr } from '@/lib/permissions'
import { anthropic, AI_MODEL, buildSystemText } from '@/lib/ai/anthropic'
import { companyTools, executeCompanyTool } from '@/lib/ai/tools'

// Streaming chat endpoint for Globaal AI. Runs the Anthropic tool-loop on the
// server (web_search + permission-gated company-data tools) and streams the
// assistant's text back as plain text chunks. Node runtime (SDK + tools).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Nejste přihlášen.', { status: 401 })

  const admin = createAdminClient()
  const { data: tu } = await admin.from('tenant_users').select('tenant_id, role, custom_role_id').eq('user_id', user.id).maybeSingle()
  if (!tu?.tenant_id) return new Response('Organizace nenalezena.', { status: 403 })

  let customRoleModules: string[] | null = null
  if ((tu as any).custom_role_id) {
    const { data: cr } = await admin.from('custom_roles').select('modules').eq('id', (tu as any).custom_role_id).maybeSingle()
    customRoleModules = (cr?.modules as string[]) ?? null
  }
  const allowed = getAllowedModules({ role: tu.role, customRoleModules })
  if (!allowed.includes('globaal-ai')) return new Response('Nemáte přístup k modulu Globaal AI.', { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('Globaal AI zatím není nakonfigurované: chybí ANTHROPIC_API_KEY (přidej ho do Vercel env a přenasaď).', { status: 503 })
  }

  const body = await req.json().catch(() => null)
  const conversationId = body?.conversationId as string
  const userMessage = (body?.message as string)?.trim()
  if (!conversationId || !userMessage) return new Response('Chybí konverzace nebo zpráva.', { status: 400 })

  const { data: convo } = await admin.from('ai_conversations').select('id, owner_id, title').eq('id', conversationId).eq('tenant_id', tu.tenant_id).maybeSingle()
  if (!convo) return new Response('Konverzace nenalezena.', { status: 404 })
  if (convo.owner_id && convo.owner_id !== user.id) return new Response('Nemáte přístup k této konverzaci.', { status: 403 })

  // Persist the user's message; set a title from the first message.
  await admin.from('ai_messages').insert({ conversation_id: conversationId, role: 'user', content: userMessage })
  if (!convo.title) {
    await admin.from('ai_conversations').update({ title: userMessage.slice(0, 60) }).eq('id', conversationId)
  }

  const { data: history } = await admin.from('ai_messages')
    .select('role, content').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(40)
  const messages: any[] = (history || []).map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

  const today = new Date().toISOString().slice(0, 10)
  const canHr = canManageHr(tu.role)
  const system = [{ type: 'text', text: buildSystemText({ today, allowed, canHr }), cache_control: { type: 'ephemeral' } }]
  const tools: any[] = [{ type: 'web_search_20260209', name: 'web_search' }, ...companyTools(allowed, tu.role)]
  const toolCtx = { admin, tenantId: tu.tenant_id, userId: user.id, role: tu.role, allowedModules: allowed }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = ''
      try {
        const convoMsgs = [...messages]
        for (let turn = 0; turn < 8; turn++) {
          const s = anthropic.messages.stream({
            model: AI_MODEL,
            max_tokens: 8000,
            system: system as any,
            thinking: { type: 'adaptive' } as any,
            output_config: { effort: 'medium' } as any,
            messages: convoMsgs,
            tools: tools as any,
          })
          s.on('text', (delta: string) => {
            assistantText += delta
            controller.enqueue(encoder.encode(delta))
          })
          const msg = await s.finalMessage()
          convoMsgs.push({ role: 'assistant', content: msg.content })

          if (msg.stop_reason === 'tool_use') {
            const results: any[] = []
            for (const block of msg.content as any[]) {
              if (block.type === 'tool_use') {
                const out = await executeCompanyTool(toolCtx, block.name, block.input)
                results.push({ type: 'tool_result', tool_use_id: block.id, content: out })
              }
            }
            if (results.length) { convoMsgs.push({ role: 'user', content: results }); continue }
            break
          }
          // Server tool (web_search) needs another round to finish.
          if (msg.stop_reason === 'pause_turn') continue
          break // end_turn / max_tokens / stop_sequence / refusal
        }
      } catch (e: any) {
        const m = e?.message || 'neznámá chyba'
        const note = `\n\n⚠️ Chyba AI: ${m}`
        controller.enqueue(encoder.encode(note))
        assistantText += note
      } finally {
        try {
          await admin.from('ai_messages').insert({ conversation_id: conversationId, role: 'assistant', content: assistantText || '(prázdná odpověď)' })
          await admin.from('ai_conversations').update({ updated_at: new Date() }).eq('id', conversationId)
        } catch { /* ignore */ }
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}
