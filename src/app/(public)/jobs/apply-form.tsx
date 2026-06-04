'use client'

import { useState, useTransition } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'
import { applyToJob } from './actions'

const fieldClass = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-colors focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20'

export function ApplyForm({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set('jobId', jobId)
    start(async () => {
      const r = await applyToJob(fd)
      if (r?.error) { setError(r.error); return }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-300" />
        <h3 className="mt-3 text-lg font-semibold text-white">Přihláška odeslána!</h3>
        <p className="mt-1 text-sm text-zinc-300">Děkujeme. Ozveme se vám co nejdříve.</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-base font-semibold text-white">Reagovat na pozici</h3>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><label className="text-xs text-zinc-400">Jméno a příjmení *</label><input name="name" required className={fieldClass} placeholder="Jan Novák" /></div>
        <div className="space-y-1"><label className="text-xs text-zinc-400">Telefon</label><input name="phone" className={fieldClass} placeholder="+420…" /></div>
        <div className="space-y-1 sm:col-span-2"><label className="text-xs text-zinc-400">E-mail</label><input type="email" name="email" className={fieldClass} placeholder="jan@email.cz" /></div>
      </div>
      <div className="space-y-1"><label className="text-xs text-zinc-400">Pár slov o vás</label><textarea name="message" rows={4} className={fieldClass} placeholder="Proč se hodíte, zkušenosti, dostupnost…" /></div>
      <div className="space-y-1">
        <label className="text-xs text-zinc-400">Životopis (CV) — PDF/DOC, max 8 MB</label>
        <input type="file" name="cv" accept=".pdf,.doc,.docx,application/pdf" className="block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-300 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#06070b] hover:file:bg-amber-200" />
      </div>
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-semibold text-[#06070b] transition-colors hover:bg-amber-200 disabled:opacity-60">
        <Send className="size-4" />{pending ? 'Odesílám…' : 'Odeslat přihlášku'}
      </button>
      <p className="text-center text-[11px] text-zinc-500">Odesláním souhlasíte se zpracováním osobních údajů pro účely náboru.</p>
    </form>
  )
}
