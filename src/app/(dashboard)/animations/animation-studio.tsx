'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Download, Save, Upload, FolderOpen, Loader2, Trash2, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { getDocumentUrl, uploadDocument } from '../documents/actions'

type DocImage = { id: string; name: string; category: string }
type Particle = { x: number; y: number; vx: number; vy: number; r: number; o: number }

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const FORMATS = [
  { k: '16:9', l: 'Na šířku (16:9)', w: 1280, h: 720 },
  { k: '1:1', l: 'Čtverec (1:1)', w: 1080, h: 1080 },
  { k: '9:16', l: 'Na výšku (9:16)', w: 720, h: 1280 },
  { k: '4:5', l: 'Panel (4:5)', w: 1080, h: 1350 },
]
const BACKGROUNDS = [{ k: 'gradient', l: 'Gradient' }, { k: 'particles', l: 'Částice' }, { k: 'waves', l: 'Vlny' }, { k: 'solid', l: 'Jednolitá' }]
const FITS = [{ k: 'contain', l: 'Vejít (logo na střed)' }, { k: 'cover', l: 'Vyplnit (přes celou plochu)' }]
const ENTRANCES = [{ k: 'none', l: 'Žádný' }, { k: 'fade', l: 'Prolnutí' }, { k: 'scale', l: 'Zvětšení' }, { k: 'slideUp', l: 'Zezdola' }, { k: 'slideLeft', l: 'Zleva' }]
const LOOPS = [
  { k: 'none', l: 'Žádná' }, { k: 'wave', l: 'Vlnění (pozadí)' }, { k: 'zoom', l: 'Pomalý zoom' },
  { k: 'pan', l: 'Posun' }, { k: 'float', l: 'Plování' }, { k: 'pulse', l: 'Pulz' }, { k: 'rotate', l: 'Rotace' },
]

type Params = { format: string; bg: string; colorA: string; colorB: string; fit: string; scale: number; entrance: string; loop: string; duration: number; fps: number }
const dimsOf = (format: string) => { const f = FORMATS.find((x) => x.k === format) || FORMATS[0]; return { w: f.w, h: f.h } }

function drawBackground(ctx: CanvasRenderingContext2D, p: Params, t: number, particles: Particle[], w: number, h: number) {
  const { bg, colorA, colorB } = p
  if (bg === 'solid') { ctx.fillStyle = colorA; ctx.fillRect(0, 0, w, h); return }
  if (bg === 'gradient') {
    const s = (Math.sin(t * 0.5) + 1) / 2
    const g = ctx.createLinearGradient(0, 0, w, h)
    g.addColorStop(0, colorA); g.addColorStop(Math.max(0.05, Math.min(0.95, 0.3 + 0.4 * s)), colorB); g.addColorStop(1, colorA)
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); return
  }
  if (bg === 'waves') {
    ctx.fillStyle = colorA; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(0, h)
      for (let x = 0; x <= w; x += 12) {
        const y = h * 0.55 + Math.sin((x / w) * 6.28 * 1.5 + t * 1.2 + i * 0.9) * (h * 0.06 + i * h * 0.025) + i * h * 0.05
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h); ctx.closePath()
      ctx.fillStyle = colorB; ctx.globalAlpha = 0.16 + i * 0.07; ctx.fill()
    }
    ctx.globalAlpha = 1; return
  }
  ctx.fillStyle = colorA; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = colorB
  for (const pt of particles) {
    const ax = (((pt.x + t * pt.vx) % 1) + 1) % 1 * w
    const ay = (((pt.y + t * pt.vy) % 1) + 1) % 1 * h
    ctx.globalAlpha = pt.o
    ctx.beginPath(); ctx.arc(ax, ay, pt.r, 0, 6.2832); ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawWave(ctx: CanvasRenderingContext2D, img: HTMLImageElement, t: number, w: number, h: number, off: HTMLCanvasElement) {
  const P = Math.max(8, Math.round(w * 0.045))
  const ow = w + 2 * P
  if (off.width !== ow || off.height !== h) { off.width = ow; off.height = h }
  const octx = off.getContext('2d'); if (!octx) return
  octx.clearRect(0, 0, ow, h)
  const s = Math.max(ow / img.width, h / img.height)
  const dw = img.width * s, dh = img.height * s
  octx.drawImage(img, (ow - dw) / 2, (h - dh) / 2, dw, dh)
  const slices = Math.ceil(h / 8), sh = h / slices
  for (let i = 0; i < slices; i++) {
    const y = i * sh
    const dxv = Math.sin(i * 0.4 + t * 1.8) * P
    const hh = Math.min(sh + 1, h - y)
    ctx.drawImage(off, P + dxv, y, w, hh, 0, y, w, hh)
  }
}

function drawLayer(ctx: CanvasRenderingContext2D, img: HTMLImageElement, p: Params, t: number, w: number, h: number, off: HTMLCanvasElement) {
  const prog = Math.min(1, t / 0.8), eo = 1 - Math.pow(1 - prog, 3)
  const fade = (p.entrance === 'fade' || p.entrance === 'scale' || p.entrance === 'slideUp' || p.entrance === 'slideLeft') ? prog : 1
  let edx = 0, edy = 0, esc = 1
  if (p.entrance === 'scale') esc = 0.6 + 0.4 * eo
  if (p.entrance === 'slideUp') edy = (1 - eo) * h * 0.15
  if (p.entrance === 'slideLeft') edx = -(1 - eo) * w * 0.2

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, fade))

  if (p.fit === 'cover') {
    if (p.loop === 'wave') { drawWave(ctx, img, t, w, h, off); ctx.restore(); return }
    let zoom = 1, dx = 0, dy = 0
    if (p.loop === 'zoom') zoom = 1.04 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.5))
    if (p.loop === 'pan') { zoom = 1.12; dx = Math.sin(t * 0.3) * w * 0.04; dy = Math.cos(t * 0.25) * h * 0.04 }
    if (p.loop === 'float') dy += Math.sin(t * 1.8) * h * 0.01
    if (p.loop === 'pulse') zoom *= 1 + 0.03 * Math.sin(t * 2.2)
    const s = Math.max(w / img.width, h / img.height) * zoom
    const dw = img.width * s, dh = img.height * s
    ctx.drawImage(img, (w - dw) / 2 + dx + edx, (h - dh) / 2 + dy + edy, dw, dh)
    ctx.restore(); return
  }

  // contain — image as a centered logo, sized by the slider
  let dx = edx, dy = edy, sc = esc, rot = 0
  if (p.loop === 'float') dy += Math.sin(t * 1.8) * h * 0.012
  if (p.loop === 'pulse') sc *= 1 + 0.04 * Math.sin(t * 2.2)
  if (p.loop === 'rotate') rot = t * 0.35
  if (p.loop === 'zoom') sc *= 1.04 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.5))
  const baseH = h * p.scale, ratio = (img.width || 1) / (img.height || 1)
  const dh = baseH * sc, dw = dh * ratio
  ctx.translate(w / 2 + dx, h / 2 + dy); ctx.rotate(rot)
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

export function AnimationStudio({ documentImages }: { documentImages: DocImage[] }) {
  const [params, setParams] = useState<Params>({ format: '16:9', bg: 'gradient', colorA: '#0f172a', colorB: '#6366f1', fit: 'contain', scale: 0.4, entrance: 'fade', loop: 'float', duration: 5, fps: 30 })
  const [playing, setPlaying] = useState(true)
  const [logoName, setLogoName] = useState<string | null>(null)
  const [logoReady, setLogoReady] = useState(false)
  const [picker, setPicker] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)

  const dims = dimsOf(params.format)
  const portrait = dims.h > dims.w

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offRef = useRef<HTMLCanvasElement | null>(null)
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
      x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.04, vy: (Math.random() - 0.5) * 0.04,
      r: 1 + Math.random() * 3, o: 0.15 + Math.random() * 0.45,
    }))
  }
  if (!offRef.current && typeof document !== 'undefined') offRef.current = document.createElement('canvas')

  const renderAt = useCallback((t: number) => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = canvas.width, h = canvas.height
    drawBackground(ctx, paramsRef.current, t, particlesRef.current, w, h)
    if (logoRef.current && offRef.current) drawLayer(ctx, logoRef.current, paramsRef.current, t, w, h, offRef.current)
  }, [])

  useEffect(() => {
    if (!playing) { renderAt(tRef.current); return }
    startRef.current = performance.now() - tRef.current * 1000
    const tick = () => {
      const dur = paramsRef.current.duration
      let t = (performance.now() - startRef.current) / 1000
      if (t >= dur) { startRef.current = performance.now(); t = 0 }
      tRef.current = t; renderAt(t)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, renderAt])

  // Redraw a static frame when params/format/logo change while paused
  useEffect(() => { if (!playingRef.current) renderAt(tRef.current) }, [params, logoReady, renderAt])

  function setLogoFromBlob(blob: Blob, name: string) {
    if (objUrlRef.current) URL.revokeObjectURL(objUrlRef.current)
    const url = URL.createObjectURL(blob); objUrlRef.current = url
    const img = new Image()
    img.onload = () => { logoRef.current = img; setLogoName(name); setLogoReady((v) => !v) }
    img.onerror = () => toast.error('Chyba', 'Obrázek se nepodařilo načíst.')
    img.src = url
  }
  function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) setLogoFromBlob(f, f.name) }
  async function importFromDocuments(doc: DocImage) {
    setPicker(false)
    try {
      const res = await getDocumentUrl(doc.id)
      if (res.error || !res.url) { toast.error('Chyba', res.error || 'Nepodařilo se načíst.'); return }
      const blob = await (await fetch(res.url)).blob()
      setLogoFromBlob(blob, doc.name); toast.success('Vloženo', doc.name)
    } catch (e: any) { toast.error('Chyba', e?.message || 'Import selhal.') }
  }
  function removeLogo() {
    logoRef.current = null; setLogoName(null); setLogoReady((v) => !v)
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null }
  }

  function pickMime() {
    const c = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    return c.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || 'video/webm'
  }
  async function exportWebm() {
    const canvas = canvasRef.current; if (!canvas) return
    setExporting(true); setExported(null); setPlaying(false); cancelAnimationFrame(rafRef.current)
    try {
      const fps = paramsRef.current.fps, dur = paramsRef.current.duration
      const stream = canvas.captureStream(fps)
      const rec = new MediaRecorder(stream, { mimeType: pickMime() })
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      const stopped = new Promise<void>((res) => { rec.onstop = () => res() })
      const begin = performance.now(); rec.start()
      await new Promise<void>((resolve) => {
        const frame = () => { const t = (performance.now() - begin) / 1000; renderAt(t); if (t >= dur) resolve(); else requestAnimationFrame(frame) }
        requestAnimationFrame(frame)
      })
      rec.stop(); await stopped
      setExported(new Blob(chunks, { type: 'video/webm' })); toast.success('Video vytvořeno')
    } catch (e: any) {
      toast.error('Export selhal', e?.message || 'Zkus prohlížeč Chrome/Edge.')
    } finally { setExporting(false); tRef.current = 0; setPlaying(true) }
  }
  function download() {
    if (!exported) return
    const url = URL.createObjectURL(exported); const a = document.createElement('a')
    a.href = url; a.download = `animace-${Date.now()}.webm`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  async function saveToDocuments() {
    if (!exported) return
    setSaving(true)
    try {
      const name = `Animace ${new Date().toLocaleDateString('cs-CZ')}.webm`
      const fd = new FormData()
      fd.set('file', new File([exported], name, { type: 'video/webm' })); fd.set('name', name); fd.set('category', 'other')
      const res = await uploadDocument(fd)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Uloženo do Dokumentů')
    } finally { setSaving(false) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-3">
        <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-black p-2 shadow-xs">
          <canvas
            ref={canvasRef}
            width={dims.w}
            height={dims.h}
            className="block w-full"
            style={{ aspectRatio: `${dims.w} / ${dims.h}`, maxHeight: '72vh', width: portrait ? 'auto' : '100%' }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" variant="outline" onClick={() => setPlaying((v) => !v)}>
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
        <p className="text-xs text-muted-foreground">Export běží v prohlížeči (WebM). Nejlépe Chrome/Edge. {params.duration}s @ {params.fps} fps · {params.format}.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Formát</Label>
          <select value={params.format} onChange={(e) => setParams((p) => ({ ...p, format: e.target.value }))} className={selectClass}>
            {FORMATS.map((f) => <option key={f.k} value={f.k}>{f.l}</option>)}
          </select>
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs font-semibold text-foreground">Logo / grafika</Label>
          {logoName ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">{logoName}</span>
              <button onClick={removeLogo} aria-label="Odebrat" className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Vlož 3D logo / grafiku z Dokumentů nebo nahraj soubor.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setPicker(true)}><FolderOpen className="size-4" />Z Dokumentů</Button>
            <label className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted">
              <Upload className="size-3.5" />Nahrát<input type="file" accept="image/*" className="hidden" onChange={onUploadFile} />
            </label>
          </div>
          {logoName && (
            <div className="space-y-2 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Výplň</Label>
                <select value={params.fit} onChange={(e) => setParams((p) => ({ ...p, fit: e.target.value }))} className={selectClass}>
                  {FITS.map((f) => <option key={f.k} value={f.k}>{f.l}</option>)}
                </select>
              </div>
              {params.fit === 'contain' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Velikost loga: {Math.round(params.scale * 100)} %</Label>
                  <input type="range" min={10} max={100} step={5} value={Math.round(params.scale * 100)} onChange={(e) => setParams((p) => ({ ...p, scale: Number(e.target.value) / 100 }))} className="w-full accent-primary" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs font-semibold text-foreground">Pozadí (za grafikou)</Label>
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
            <Label className="text-xs text-muted-foreground">Nástup</Label>
            <select value={params.entrance} onChange={(e) => setParams((p) => ({ ...p, entrance: e.target.value }))} className={selectClass}>
              {ENTRANCES.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pohyb / smyčka</Label>
            <select value={params.loop} onChange={(e) => setParams((p) => ({ ...p, loop: e.target.value }))} className={selectClass}>
              {LOOPS.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
            </select>
          </div>
        </div>
        {params.loop === 'wave' && params.fit !== 'cover' && (
          <p className="-mt-2 text-[11px] text-amber-600 dark:text-amber-400">Tip: Vlnění funguje nejlépe s výplní „Vyplnit (přes celou plochu)".</p>
        )}

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
              <DialogTitle>Vložit z Dokumentů</DialogTitle>
              <DialogDescription>Vyber uložené 3D logo nebo grafiku (obrázky z modulu Dokumenty).</DialogDescription>
            </DialogHeader>
            {documentImages.length === 0 ? (
              <EmptyState icon={FolderOpen} title="Žádné obrázky" description="Ulož 3D logo z 3D Studia do Dokumentů, pak ho tu uvidíš." />
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {documentImages.map((d) => (
                  <button key={d.id} onClick={() => importFromDocuments(d)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted">
                    <FolderOpen className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-foreground">{d.name}</span>
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
