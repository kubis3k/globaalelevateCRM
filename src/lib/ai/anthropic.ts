import 'server-only'
import Anthropic from '@anthropic-ai/sdk'

// Shared Anthropic client + system-prompt builder for Globaal AI.
// Pass a fallback so constructing the client never throws at import/build time
// when the key is absent; the route guards real usage with a 503 if it's unset.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'not-configured' })

// Strong default model (the chat). Per Anthropic guidance, don't downgrade for
// cost silently — this is the company's choice via their API key.
export const AI_MODEL = 'claude-opus-4-8'

const MODULE_HINTS: Record<string, string> = {
  crm: 'CRM (klienti, aktivity)',
  finance: 'faktury a finance',
  invoices: 'faktury a finance',
  hr: 'HR (zaměstnanci, dovolená)',
  calendar: 'kalendář',
  documents: 'dokumenty',
  milestones: 'firemní cíle (týden/měsíc/rok)',
  personal: 'osobní cíle uživatele',
  projects: 'projekty/zakázky (stav, úkoly)',
  time: 'výkazy práce (odpracované hodiny, fakturovatelnost)',
  quotes: 'nabídky a katalog produktů/služeb',
}

// Stable within a day (date only) so the prompt-cache breakpoint survives across
// requests; it invalidates at most once per day.
export function buildSystemText(opts: { today: string; allowed: string[]; canHr: boolean }): string {
  const sources = new Set<string>()
  for (const m of opts.allowed) {
    if (m === 'hr' && !opts.canHr) continue
    if (MODULE_HINTS[m]) sources.add(MODULE_HINTS[m])
  }
  const sourceList = sources.size
    ? Array.from(sources).join(', ')
    : 'žádné (uživatel nemá přístup k firemním datovým modulům)'

  return [
    'Jsi „Globaal AI" — interní AI asistent společnosti Globaal Elevate Production s.r.o. (doména globaalelevate.com).',
    `Dnešní datum: ${opts.today}.`,
    '',
    'Pomáháš zaměstnancům firmy s dotazy, researchem a prací s interními daty. Specializuješ se na:',
    '• Research: když odpověď závisí na aktuálních informacích z internetu (ceny, trh, konkurence, novinky, legislativa, fakta), použij nástroj web_search a v odpovědi uveď zdroje (odkazy).',
    '• Znalost firmy: pomocí firemních nástrojů si načti reálná data místo hádání.',
    '',
    `Firemní datové nástroje dostupné tomuto uživateli: ${sourceList}.`,
    'Nástroje volej jen když je to potřeba — u běžné konverzace nevolej nic.',
    '',
    'Zásady:',
    '• Odpovídej česky, věcně a stručně; používej odrážky a nadpisy, když to zpřehlední.',
    '• Nevymýšlej si firemní data ani fakta. Když nástroj nic nevrátí nebo uživatel na daný modul nemá přístup, řekni to otevřeně.',
    '• U informací z webu vždy uveď zdroj.',
    '• Jsi důvěrný interní nástroj — data zůstávají uvnitř firmy.',
  ].join('\n')
}
