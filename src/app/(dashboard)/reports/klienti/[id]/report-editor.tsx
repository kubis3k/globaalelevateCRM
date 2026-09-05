'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, Send, Undo2, Download } from 'lucide-react'
import { toast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { saveClientReport, sendClientReport, unsendClientReport, deleteClientReport } from '../actions'

type Metric = { label: string; value: string; note: string }
type Section = { heading: string; body: string }

const field = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring'

export function ReportEditor({
  report,
  clientName,
  initialMetrics,
  initialSections,
}: {
  report: { id: string; title: string; period_label: string | null; summary: string | null; status: string; sent_at: string | null }
  clientName: string
  initialMetrics: Metric[]
  initialSections: Section[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState(report.title)
  const [period, setPeriod] = useState(report.period_label ?? '')
  const [summary, setSummary] = useState(report.summary ?? '')
  const [metrics, setMetrics] = useState<Metric[]>(initialMetrics)
  const [sections, setSections] = useState<Section[]>(initialSections.length ? initialSections : [{ heading: '', body: '' }])
  const [sent, setSent] = useState(report.status === 'sent')
  const [pending, start] = useTransition()

  const doSave = async () => {
    const res = await saveClientReport(report.id, { title, periodLabel: period, summary, metrics, sections })
    if (res?.error) { toast.error('Chyba', res.error); return false }
    return true
  }

  const onSave = () => start(async () => { if (await doSave()) { toast.success('Uloženo'); router.refresh() } })
  const onPreview = () => start(async () => { if (await doSave()) window.open(`/api/reports/${report.id}/pdf`, '_blank') })
  const onSend = () => start(async () => {
    if (!(await doSave())) return
    const res = await sendClientReport(report.id)
    if (res?.error) { toast.error('Chyba', res.error); return }
    setSent(true); toast.success('Report odeslán klientovi'); router.refresh()
  })
  const onUnsend = () => start(async () => {
    const res = await unsendClientReport(report.id)
    if (res?.error) { toast.error('Chyba', res.error); return }
    setSent(false); toast.success('Vráceno do konceptu'); router.refresh()
  })
  const onDelete = () => {
    if (!confirm('Opravdu smazat tento report?')) return
    start(async () => { await deleteClientReport(report.id) })
  }

  const setMetric = (i: number, patch: Partial<Metric>) => setMetrics((a) => a.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const setSection = (i: number, patch: Partial<Section>) => setSections((a) => a.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/reports/klienti" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> Zpět na reporty
        </Link>
        <div className="flex items-center gap-2">
          {sent ? <Badge variant="success">Odesláno klientovi</Badge> : <Badge variant="info">Koncept</Badge>}
          <span className="text-sm text-muted-foreground">Klient: <span className="font-medium text-foreground">{clientName}</span></span>
        </div>
      </div>

      {/* Hlavička */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Název reportu</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Marketing – srpen 2026" className={field} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Období</label>
          <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Srpen 2026" className={field} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Shrnutí</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Krátké shrnutí výsledků za období…" className={field} />
        </div>
      </div>

      {/* Metriky */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Klíčové metriky</h2>
            <p className="text-xs text-muted-foreground">Dlaždice s čísly (návštěvnost, konverze, dosah, útrata…).</p>
          </div>
          <button type="button" onClick={() => setMetrics((a) => [...a, { label: '', value: '', note: '' }])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="size-3.5" /> Přidat metriku
          </button>
        </div>
        {metrics.length === 0 && <p className="text-sm text-muted-foreground">Zatím žádné metriky.</p>}
        {metrics.map((m, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input value={m.label} onChange={(e) => setMetric(i, { label: e.target.value })} placeholder="Název (Návštěvnost)" className={field + ' sm:flex-1'} />
            <input value={m.value} onChange={(e) => setMetric(i, { value: e.target.value })} placeholder="Hodnota (12 480)" className={field + ' sm:w-40'} />
            <input value={m.note} onChange={(e) => setMetric(i, { note: e.target.value })} placeholder="Poznámka (+18 %)" className={field + ' sm:w-40'} />
            <button type="button" onClick={() => setMetrics((a) => a.filter((_, j) => j !== i))} aria-label="Odebrat" className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Sekce */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sekce</h2>
            <p className="text-xs text-muted-foreground">Textové bloky — co se dělo, komentář, další kroky.</p>
          </div>
          <button type="button" onClick={() => setSections((a) => [...a, { heading: '', body: '' }])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Plus className="size-3.5" /> Přidat sekci
          </button>
        </div>
        {sections.map((s, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border/70 p-3">
            <div className="flex items-center gap-2">
              <input value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} placeholder="Nadpis sekce" className={field + ' flex-1 font-medium'} />
              <button type="button" onClick={() => setSections((a) => a.filter((_, j) => j !== i))} aria-label="Odebrat" className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
            <textarea value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} rows={4} placeholder="Text sekce…" className={field} />
          </div>
        ))}
      </div>

      {/* Akce */}
      <div className="sticky bottom-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <button type="button" onClick={onSave} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 disabled:opacity-60">
          <Save className="size-4" /> Uložit
        </button>
        <button type="button" onClick={onPreview} disabled={pending} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60">
          <Download className="size-4" /> Náhled PDF
        </button>
        {sent ? (
          <button type="button" onClick={onUnsend} disabled={pending} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60">
            <Undo2 className="size-4" /> Vrátit do konceptu
          </button>
        ) : (
          <button type="button" onClick={onSend} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground shadow-xs transition-colors hover:bg-success/90 disabled:opacity-60">
            <Send className="size-4" /> Odeslat klientovi
          </button>
        )}
        <button type="button" onClick={onDelete} disabled={pending} className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60">
          <Trash2 className="size-4" /> Smazat
        </button>
      </div>
    </div>
  )
}
