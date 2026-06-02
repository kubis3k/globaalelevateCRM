'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Download, Save, Upload, FolderOpen, Loader2, Trash2, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { getDocumentUrl, uploadDocument } from '../documents/actions'

type DocImage = { id: string; name: string; category: string }
type Particle = { x: number; y: number; vx: number; vy: number; r: number; o: number }

const STAGE_W = 1280, STAGE_H = 720
const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const BACKGROUNDS = [{ k: 'gradient', l: 'Gradient' }, { k: 'particles', l: 'Částice' }, { k: 'waves', l: 'Vlny' }, { k: 'solid', l: 'Jednolitá' }]
const ENTRANCES = [{ k: 'none', l: 'Žádný' }, { k: 'fade', l: 'Prolnutí' }, { k: 'scale', l: 'Zvětšení' }, { k: 'slideUp', l: 'Zezdola' }, { k: 'slideLeft', l: 'Zleva' }]
const LOOPS = [{ k: 'none', l: 'Žádná' }, { k: 'float', l: 'Plování' }, { k: 'pulse', l: 'Pulz' }, { k: 'rotate', l: 'Rotace' }]

type Params = { bg: string; colorA: string; colorB: string; scale: number; entrance: string; loop: string; duration: number; fps: number }

function drawBackground(ctx: CanvasRenderingContext2D, p: Params, t: number, particles: Particle[]) {
  const { bg, colorA, colorB } = p
  if (bg === 'solid') { ctx.fillStyle = colorA; ctx.fillRect(0, 0, STAGE_W, STAGE_H); return }
  if (bg === 'gradient') {
    const s = (Math.sin(t * 0.5) + 1) / 2
    const g = ctx.createLinearGradient(0, 0, STAGE_W, STAGE_H)
    g.addColorStop(0, colorA)
    g.addColorStop(Math.max(0.05, Math.min(0.95, 0.3 + 0.4 * s)), colorB)
    g.addColorStop(1, colorA)
    ctx.fillStyle = g; ctx.fillRect(0, 0, STAGE_W, STAGE_H); return
  }
  if (bg === 'waves') {
    ctx.fillStyle = colorA; ctx.fillRect(0, 0, STAGE_W, STAGE_H)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, STAGE_H)
      for (let x = 0; x <= STAGE_W; x += 12) {
        const y = STAGE_H * 0.55 + Math.sin((x / STAGE_W) * 6.28 * 1.5 + t * 1.2 + i * 0.9) * (40 + i * 18) + i * 40
        ctx.lineTo(x, y)
      }
      ctx.lineTo(STAGE_W, STAGE_H); ctx.closePath()
      ctx.fillStyle = colorB; ctx.globalAlpha = 0.16 + i * 0.07; ctx.fill()
    }
    ctx.globalAlpha = 1; return
  }
  // particles
  ctx.fillStyle = colorA; ctx.fillRect(0, 0, STAGE_W, STAGE_H)
  ctx.fillStyle = colorB
  for (const pt of particles) {
    let px = (pt.x + t * pt.vx * 22) % STAGE_W; if (px < 0) px += STAGE_W
    let py = (pt.y + t * pt.vy * 22) % STAGE_H; if (py < 0) py += STAGE_H
    ctx.globalAlpha = pt.o
    ctx.beginPath(); ctx.arc(px, py, pt.r, 0, 6.2832); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, p: Params, t: number) {
  const prog = Math.min(1, t / 0.8)
  const eo = 1 - Math.pow(1 - prog, 3)
  let alpha = 1, dx = 0, dy = 0, sc = 1, rot = 0
  if (p.entrance === 'fade') alpha = prog
  if (p.entrance === 'scale') { alpha = prog; sc = 0.6 + 0.4 * eo }
  if (p.entrance === 'slideUp') { alpha = prog; dy = (1 - eo) * STAGE_H * 0.15 }
  if (p.entrance === 'slideLeft') { alpha = prog; dx = -(1 - eo) * STAGE_W * 0.2 }
  if (p.loop === 'float') dy += Math.sin(t * 1.8) * STAGE_H * 0.012
  if (p.loop === 'pulse') sc *= 1 + 0.04 * Math.sin(t * 2.2)
  if (p.loop === 'rotate') rot = t * 0.35
  const baseH = STAGE_H * p.scale
  const ratio = (img.width || 1) / (img.height || 1)
  const dh = baseH * sc, dw = dh * ratio
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.translate(STAGE_W / 2 + dx, STAGE_H / 2 + dy)
  ctx.rotate(rot)
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

export function AnimationStudio({ documentImages }: { documentImages: DocImage[] }) {
  const [params, setParams] = useState<Params>({ bg: 'gradient', colorA: '#0f172a', colorB: '#6366f1', scale: 0.4, entrance: 'fade', loop: 'float', duration: 5, fps: 30 })
  const [playing, setPlaying] = useState(true)
  const [logoName, setLogoName] = useState<string | null>(null)
  const [logoReady, setLogoReady] = useState(false)
  const [picker, setPicker] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef(params); paramsRef.current = params
  const playingRef = useRef(playing); playingRef.current = playing
  const logoRef = useRef<HTMLImageElement | null>(null)
  const objUrlRef = useRef<string | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const tRef = useRef<number>(0)

  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: 70 }, () => ({
      x: Math.random() * STAGE_W, y: Math.random() * STAGE_H,
      vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
      r: 1 + Math.random() * 3, o: 0.15 + Math.random() * 0.45,
    }))
  }

  const renderAt = useCallback((t: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    drawBackground(ctx, paramsRef.current, t, particlesRef.current)
    if (logoRef.current) drawLogo(ctx, logoRef.current, paramsRef.current, t)
  }, [])

  // Preview loop
  useEffect(() => {
    if (!playing) { renderAt(tRef.current); return }
    startRef.current = performance.now() - tRef.current * 1000
    const tick = () => {
      const dur = paramsRef.current.duration
      let t = (performance.now() - startRef.current) / 1000
      if (t >= dur) { startRef.current = performance.now(); t = 0 }
      tRef.current = t
      renderAt(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, renderAt])

  // Redraw a static frame when params/logo change while paused
  useEffect(() => { if (!playingRef.current) renderAt(tRef.current) }, [params, logoReady, renderAt])

  async function setLogoFromBlob(blob: Blob, name: string) {
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current)
    const url = URL.createObjectURL(blob)
    objUrlRef.current = url
    const img = new Image()
    img.onload = () => { logoRef.current = img; setLogoName(name); setLogoReady((v) => !v) }
    img.onerror = () => toast.error('Chyba', 'Obrázek se nepodařilo načíst.')
    img.src = url
  }

  function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setLogoFromBlob(f, f.name)
  }

  async function importFromDocuments(doc: DocImage) {
    setPicker(false)
    try {
      const res = await getDocumentUrl(doc.id)
      if (res.error || !res.url) { toast.error('Chyba', res.error || 'Nepodařilo se načíst.'); return }
      const r = await fetch(res.url)
      const blob = await r.blob()
      await setLogoFromBlob(blob, doc.name)
      toast.success('Logo importováno', doc.name)
    } catch (e: any) {
      toast.error('Chyba', e?.message || 'Import selhal.')
    }
  }

  function removeLogo() {
    logoRef.current = null; setLogoName(null); setLogoReady((v) => !v)
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null }
  }

  function pickMime() {
    const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    return cands.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || 'video/webm'
  }

  async function exportWebm() {
    const canvas = canvasRef.current; if (!canvas) return
    setExporting(true); setExported(null); setPlaying(false)
    cancelAnimationFrame(rafRef.current)
    try {
      const fps = paramsRef.current.fps, dur = paramsRef.current.duration
      const stream = canvas.captureStream(fps)
      const rec = new MediaRecorder(stream, { mimeType: pickMime() })
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      const stopped = new Promise<void>((res) => { rec.onstop = () => res() })
      const begin = performance.now()
      rec.start()
      await new Promise<void>((resolve) => {
        const frame = () => {
          const t = (performance.now() - begin) / 1000
          renderAt(t)
          if (t >= dur) resolve()
          else requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      })
      rec.stop()
      await stopped
      setExported(new Blob(chunks, { type: 'video/webm' }))
      toast.success('Video vytvořeno')
    } catch (e: any) {
      toast.error('Export selhal', e?.message || 'Zkus prohlížeč Chrome/Edge.')
    } finally {
      setExporting(false); tRef.current = 0; setPlaying(true)
    }
  }

  function download() {
    if (!exported) return
    const url = URL.createObjectURL(exported)
    const a = document.createElement('a')
    a.href = url; a.download = `animace-${Date.now()}.webm`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  async function saveToDocuments() {
    if (!exported) return
    setSaving(true)
    try {
      const name = `Animace ${new Date().toLocaleDateString('cs-CZ')}.webm`
      const fd = new FormData()
      fd.set('file', new File([exported], name, { type: 'video/webm' }))
      fd.set('name', name); fd.set('category', 'other')
      const res = await uploadDocument(fd)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Uloženo do Dokumentů')
    } finally { setSaving(false) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      {/* Stage */}
      <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border bg-black shadow-xs">
          <canvas ref={canvasRef} width={STAGE_W} height={STAGE_H} className="aspect-video w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" variant="outline" onClick={() => { if (playing) { setPlaying(false) } else { setPlaying(true) } }}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}{playing ? 'Pauza' : 'Přehrát'}
          </Button>
          <Button size="lg" onClick={exportWebm} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}{exporting ? 'Renderuji…' : 'Exportovat video'}
          </Button>
          {exported && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1">
              <span className="text-xs text-muted-foreground">Hotovo:</span>
              <Button size="sm" variant="outline" onClick={download}><Download className="size-4" />Stáhnout</Button>
              <Button size="sm" onClick={saveToDocuments} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Do Dokumentů</Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Export běží v prohlížeči (WebM). Nejlépe funguje v Chrome/Edge. Délka {params.duration}s @ {params.fps} fps.</p>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Logo / grafika</Label>
          {logoName ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">{logoName}</span>
              <button onClick={removeLogo} aria-label="Odebrat" className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Vlož 3D logo z Dokumentů nebo nahraj soubor.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setPicker(true)}><FolderOpen className="size-4" />Z Dokumentů</Button>
            <label className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted">
              <Upload className="size-3.5" />Nahrát
              <input type="file" accept="image/*" className="hidden" onChange={onUploadFile} />
            </label>
          </div>
          {logoName && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">Velikost loga: {Math.round(params.scale * 100)} %</Label>
              <input type="range" min={10} max={90} step={5} value={Math.round(params.scale * 100)} onChange={(e) => setParams((p) => ({ ...p, scale: Number(e.target.value) / 100 }))} className="w-full accent-primary" />
            </div>
          )}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs font-semibold text-foreground">Pozadí</Label>
          <select value={params.bg} onChange={(e) => setParams((p) => ({ ...p, bg: e.target.value }))} className={selectClass}>
            {BACKGROUNDS.map((b) => <option key={b.k} value={b.k}>{b.l}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Barva 1<input type="color" value={params.colorA} onChange={(e) => setParams((p) => ({ ...p, colorA: e.target.value }))} className="h-7 w-full rounded border border-input bg-background" /></label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Barva 2<input type="color" value={params.colorB} onChange={(e) => setParams((p) => ({ ...p, colorB: e.target.value }))} className="h-7 w-full rounded border border-input bg-background" /></label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nástup loga</Label>
            <select value={params.entrance} onChange={(e) => setParams((p) => ({ ...p, entrance: e.target.value }))} className={selectClass}>
              {ENTRANCES.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Smyčka loga</Label>
            <select value={params.loop} onChange={(e) => setParams((p) => ({ ...p, loop: e.target.value }))} className={selectClass}>
              {LOOPS.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Délka (s)</Label>
            <Input type="number" min={2} max={20} value={params.duration} onChange={(e) => setParams((p) => ({ ...p, duration: Math.max(2, Math.min(20, Number(e.target.value) || 5)) }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">FPS</Label>
            <select value={params.fps} onChange={(e) => setParams((p) => ({ ...p, fps: Number(e.target.value) }))} className={selectClass}>
              <option value={24}>24</option><option value={30}>30</option><option value={60}>60</option>
            </select>
          </div>
        </div>
      </div>

      {picker && (
        <Dialog open onOpenChange={(o) => { if (!o) setPicker(false) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import z Dokumentů</DialogTitle>
              <DialogDescription>Vyber uložené 3D logo nebo grafiku (obrázky z modulu Dokumenty).</DialogDescription>
            </DialogHeader>
            {documentImages.length === 0 ? (
              <EmptyState icon={FolderOpen} title="Žádné obrázky" description="Nahraj 3D logo do Dokumentů, pak ho tu uvidíš." />
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {documentImages.map((d) => (
                  <button key={d.id} onClick={() => importFromDocuments(d)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted">
                    <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-foreground">{d.name}</span>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
