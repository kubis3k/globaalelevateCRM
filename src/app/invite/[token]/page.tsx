import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from './invite-form'

// Veřejná stránka (bez přihlášení) — klient si tu nastaví heslo a vytvoří
// portálový účet. Token se ověřuje service-role klientem (žádná session).
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: invite } = await admin.from('portal_invites').select('email, display_name, used_at, expires_at').eq('token', token).maybeSingle()

  const invalidReason = !invite
    ? 'Pozvánka nenalezena nebo je neplatná.'
    : invite.used_at
      ? 'Tato pozvánka už byla využita.'
      : new Date(invite.expires_at) < new Date()
        ? 'Pozvánka vypršela. Požádejte o novou.'
        : null

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex justify-center">
          <Image src="/logo.png" alt="Globaal Elevate" width={176} height={56} className="logo-smart object-contain" priority />
        </div>

        <div className="mb-7 text-center">
          <h1 className="text-base font-semibold tracking-tight text-foreground">Klientský portál</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{invalidReason ? 'Pozvánka' : 'Nastavte si heslo a přihlaste se'}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {invalidReason ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <p>{invalidReason}</p>
            </div>
          ) : (
            <InviteForm token={token} email={invite!.email} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Máte už účet? <Link href="/login" className="text-primary hover:underline">Přihlásit se</Link>
        </p>
      </div>
    </div>
  )
}
