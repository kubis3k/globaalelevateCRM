'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Download, Save, Upload, FolderOpen, Loader2, Trash2, Film, Plus, ChevronUp, ChevronDown, Layers as LayersIcon } from 'lucide-react'
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
type Layer = { id: string; name: string; fit: string; scale: number; x: number; y: number; opacity: number; entrance: string; loop: string }

const selectClass = 'h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const FORMATS = [
  { k: '16:9', l: 'Na šířku (16:9)', w: 1280, h: 720, g: 'Standardní' },
  { k: '1:1', l: 'Čtverec (1:1)', w: 1080, h: 1080, g: 'Standardní' },
  { k: '9:16', l: 'Na výšku (9:16)', w: 720, h: 1280, g: 'Standardní' },
  { k: '4:5', l: 'Panel (4:5)', w: 1080, h: 1350, g: 'Standardní' },
  { k: 'led-up', l: 'LED horní 15×1 (1920×128)', w: 1920, h: 128, g: 'LED stěny' },
  { k: 'led-center', l: 'LED střed 10×3 (1280×384)', w: 1280, h: 384, g: 'LED stěny' },
  { k: 'led-side', l: 'LED boční 2×5 (256×640)', w: 256, h: 640, g: 'LED stěny' },
  { k: 'resolume', l: 'Resolume / Full HD (1920×1080)', w: 1920, h: 1080, g: 'LED stěny' },
]
const FORMAT_GROUPS = ['Standardní', 'LED stěny']
const BACKGROUNDS = [{ k: 'gradient', l: 'Gradient' }, { k: 'particles', l: 'Částice' }, { k: 'waves', l: 'Vlny' }, { k: 'solid', l: 'Jednolitá' }]
const FITS = [{ k: 'contain', l: 'Vejít (na střed)' }, { k: 'cover', l: 'Vyplnit (celá plocha)' }]
const ENTRANCES = [{ k: 'none', l: 'Žádný' }, { k: 'fade', l: 'Prolnutí' }, { k: 'scale', l: 'Zvětšení' }, { k: 'slideUp', l: 'Zezdola' }, { k: 'slideLeft', l: 'Zleva' }]
const LOOPS = [
  { k: 'none', l: 'Žádná' },
  { k: 'wave', l: 'Vlnění (pozadí)' },
  { k: 'float', l: 'Plování' },
  { k: 'sway', l: 'Houpání do stran' },
  { k: 'bounce', l: 'Skákání' },
  { k: 'pulse', l: 'Pulz' },
  { k: 'breathe', l: 'Dýchání' },
  { k: 'heartbeat', l: 'Tep' },
  { k: 'zoom', l: 'Zoom tam a zpět' },
  { k: 'zoomIn', l: 'Pomalé přibližování' },
  { k: 'pan', l: 'Posun (pan)' },
  { k: 'orbit', l: 'Kroužení' },
  { k: 'rotate', l: 'Rotace pomalá' },
  { k: 'spin', l: 'Rotace rychlá' },
  { k: 'swing', l: 'Kývání' },
  { k: 'tilt', l: 'Náklon' },
  { k: 'wobble', l: 'Kymácení' },
  { k: 'shake', l: 'Třesení' },
  { k: 'flip', l: 'Překlápění' },
  { k: 'flicker', l: 'Blikání' },
  { k: 'glitch', l: 'Glitch' },
]

type Params = { format: string; bg: string; colorA: string; colorB: string; brightness: number; contrast: number; saturate: number; duration: number; fps: number }
const dimsOf = (format: string) => { const f = FORMATS.find((x) => x.k === format) || FORMATS[0]; return { w: f.w, h: f.h } }
function genId() { const c = globalThis.crypto as Crypto | undefined; return c?.randomUUID ? c.randomUUID() : `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }

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
  const P = Math.max(8, Math.round(w * 0.045)); const ow = w + 2 * P
  if (off.width !== ow || off.height !== h) { off.width = ow; off.height = h }
  const octx = off.getContext('2d'); if (!octx) return
  octx.clearRect(0, 0, ow, h)
  const s = Math.max(ow / img.width, h / img.height)
  const dw = img.width * s, dh = img.height * s
  octx.drawImage(img, (ow - dw) / 2, (h - dh) / 2, dw, dh)
  const slices = Math.ceil(h / 8), sh = h / slices
  for (let i = 0; i < slices; i++) {
    const y = i * sh, dxv = Math.sin(i * 0.4 + t * 1.8) * P, hh = Math.min(sh + 1, h - y)
    ctx.drawImage(off, P + dxv, y, w, hh, 0, y, w, hh)
  }
}

const MOTION_PERIOD = 8
// Per-frame transform for a layer's motion (deterministic in t → loops cleanly).
function motion(loop: string, t: number, w: number, h: number) {
  const m = { dx: 0, dy: 0, sc: 1, scX: 1, rot: 0, alpha: 1, cz: 1 }
  switch (loop) {
    case 'float': m.dy = Math.sin(t * 1.8) * h * 0.012; break
    case 'sway': m.dx = Math.sin(t * 1.6) * w * 0.03; break
    case 'bounce': m.dy = -Math.abs(Math.sin(t * 2.0)) * h * 0.05; break
    case 'pulse': m.sc = 1 + 0.05 * Math.sin(t * 2.2); break
    case 'breathe': m.sc = 1 + 0.025 * Math.sin(t * 0.8); break
    case 'heartbeat': m.sc = 1 + 0.08 * Math.pow(Math.max(0, Math.sin(t * 3)), 6); break
    case 'zoom': m.sc = 1.04 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.5)); m.cz = 1.04; break
    case 'zoomIn': m.sc = 1 + 0.18 * ((t % MOTION_PERIOD) / MOTION_PERIOD); break
    case 'pan': m.dx = Math.sin(t * 0.3) * w * 0.045; m.dy = Math.cos(t * 0.25) * h * 0.045; m.cz = 1.15; break
    case 'orbit': m.dx = Math.cos(t) * w * 0.03; m.dy = Math.sin(t) * h * 0.03; m.cz = 1.12; break
    case 'rotate': m.rot = t * 0.35; m.cz = 1.45; break
    case 'spin': m.rot = t * 1.4; m.cz = 1.45; break
    case 'swing': m.rot = Math.sin(t * 1.5) * 0.35; m.cz = 1.3; break
    case 'tilt': m.rot = Math.sin(t * 1.2) * 0.12; m.cz = 1.1; break
    case 'wobble': m.rot = Math.sin(t * 2) * 0.1; m.sc = 1 + 0.03 * Math.sin(t * 2.6); m.cz = 1.2; break
    case 'shake': m.dx = (Math.sin(t * 40) + Math.sin(t * 57)) * w * 0.004; m.dy = Math.cos(t * 43) * h * 0.004; break
    case 'flip': m.scX = Math.cos(t * 1.4); m.cz = 1.05; break
    case 'flicker': m.alpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 3)); break
    case 'glitch': m.dx = Math.sin(t * 9) > 0.9 ? (((t * 97) % 1) - 0.5) * w * 0.06 : 0; break
  }
  return m
}

function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer, img: HTMLImageElement, t: number, w: number, h: number, off: HTMLCanvasElement) {
  const prog = Math.min(1, t / 0.8), eo = 1 - Math.pow(1 - prog, 3)
  const fadeIn = layer.entrance !== 'none' ? prog : 1

  // Cover + Vlnění is a special per-slice warp.
  if (layer.fit === 'cover' && layer.loop === 'wave') {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, fadeIn * layer.opacity)); drawWave(ctx, img, t, w, h, off); ctx.restore(); return
  }

  let edx = 0, edy = 0, esc = 1
  if (layer.entrance === 'scale') esc = 0.6 + 0.4 * eo
  if (layer.entrance === 'slideUp') edy = (1 - eo) * h * 0.15
  if (layer.entrance === 'slideLeft') edx = -(1 - eo) * w * 0.2

  const m = motion(layer.loop, t, w, h)
  const offX = layer.x * w, offY = layer.y * h
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, fadeIn * layer.opacity * m.alpha))
  ctx.translate(w / 2 + m.dx + edx + offX, h / 2 + m.dy + edy + offY)
  if (m.rot) ctx.rotate(m.rot)
  ctx.scale(m.scX || 0.0001, 1)
  if (layer.fit === 'cover') {
    const s = Math.max(w / img.width, h / img.height) * m.cz * m.sc
    const dw = img.width * s, dh = img.height * s
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  } else {
    const baseH = h * layer.scale * esc * m.sc, ratio = (img.width || 1) / (img.height || 1)
    const dh = baseH, dw = dh * ratio
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  }
  ctx.restore()
}

export function AnimationStudio({ documentImages }: { documentImages: DocImage[] }) {
  const [params, setParams] = useState<Params>({ format: '16:9', bg: 'gradient', colorA: '#0f172a', colorB: '#6366f1', brightness: 1, contrast: 1, saturate: 1, duration: 5, fps: 30 })
  const [layers, setLayers] = useState<Layer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(true)
  const [picker, setPicker] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState<Blob | null>(null)
  const [saving, setSaving] = useState(false)
  const [, setTick] = useState(0)

  const dims = dimsOf(params.format)
  const portrait = dims.h > dims.w
  const selected = layers.find((l) => l.id === selectedId) || null

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offRef = useRef<HTMLCanvasElement | null>(null)
  const paramsRef = useRef(params); paramsRef.current = params
  const layersRef = useRef(layers); layersRef.current = layers
  const playingRef = useRef(playing); playingRef.current = playing
  const imagesRef = useRef<Record<string, { img: HTMLImageElement; url: string }>>({})
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
    const fp = paramsRef.current
    ctx.filter = `brightness(${fp.brightness}) contrast(${fp.contrast}) saturate(${fp.saturate})`
    drawBackground(ctx, fp, t, particlesRef.current, w, h)
    for (const layer of layersRef.current) {
      const entry = imagesRef.current[layer.id]
      if (entry?.img && offRef.current) drawLayer(ctx, layer, entry.img, t, w, h, offRef.current)
    }
    ctx.filter = 'none'
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

  useEffect(() => { if (!playingRef.current) renderAt(tRef.current) }, [params, layers, renderAt])

  function addLayerFromBlob(blob: Blob, name: string) {
    const id = genId()
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      imagesRef.current[id] = { img, url }
      // First layer defaults to a full background; later layers to centered logos.
      const isFirst = layersRef.current.length === 0
      const layer: Layer = { id, name, fit: isFirst ? 'cover' : 'contain', scale: 0.4, x: 0, y: 0, opacity: 1, entrance: isFirst ? 'none' : 'fade', loop: isFirst ? 'wave' : 'float' }
      setLayers((prev) => [...prev, layer])
      setSelectedId(id)
      setTick((n) => n + 1)
    }
    img.onerror = () => { URL.revokeObjectURL(url); toast.error('Chyba', 'Obrázek se nepodařilo načíst.') }
    img.src = url
  }
  function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) addLayerFromBlob(f, f.name); e.target.value = '' }
  async function importFromDocuments(doc: DocImage) {
    setPicker(false)
    try {
      const res = await getDocumentUrl(doc.id)
      if (res.error || !res.url) { toast.error('Chyba', res.error || 'Nepodařilo se načíst.'); return }
      const blob = await (await fetch(res.url)).blob()
      addLayerFromBlob(blob, doc.name); toast.success('Vrstva přidána', doc.name)
    } catch (e: any) { toast.error('Chyba', e?.message || 'Import selhal.') }
  }
  function removeLayer(id: string) {
    const e = imagesRef.current[id]; if (e) { URL.revokeObjectURL(e.url); delete imagesRef.current[id] }
    setLayers((prev) => prev.filter((l) => l.id !== id))
    if (selectedId === id) setSelectedId(null)
  }
  function updateLayer(id: string, patch: Partial<Layer>) { setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))) }
  function move(id: string, dir: 'front' | 'back') {
    setLayers((prev) => {
      const i = prev.findIndex((l) => l.id === id); if (i < 0) return prev
      const j = dir === 'front' ? i + 1 : i - 1
      if (j < 0 || j >= prev.length) return prev
      const copy = [...prev];[copy[i], copy[j]] = [copy[j], copy[i]]; return copy
    })
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
    a.href = url; a.download = `animace-${params.format}-${Date.now()}.webm`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  async function saveToDocuments() {
    if (!exported) return
    setSaving(true)
    try {
      const name = `Animace ${params.format} ${new Date().toLocaleDateString('cs-CZ')}.webm`
      const fd = new FormData()
      fd.set('file', new File([exported], name, { type: 'video/webm' })); fd.set('name', name); fd.set('category', 'other')
      const res = await uploadDocument(fd)
      if (res?.error) toast.error('Chyba', res.error); else toast.success('Uloženo do Dokumentů')
    } finally { setSaving(false) }
  }

  const display = [...layers].reverse() // front layer on top of the list

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <div className="flex justify-center overflow-auto rounded-xl border border-border bg-black p-2 shadow-xs">
          <canvas ref={canvasRef} width={dims.w} height={dims.h} className="block w-full"
            style={{ aspectRatio: `${dims.w} / ${dims.h}`, maxHeight: '72vh', width: portrait ? 'auto' : '100%' }} />
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
        <p className="text-xs text-muted-foreground">Plátno {dims.w}×{dims.h}px · {params.duration}s @ {params.fps} fps · export WebM (Chrome/Edge).</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">Formát plátna</Label>
          <select value={params.format} onChange={(e) => setParams((p) => ({ ...p, format: e.target.value }))} className={selectClass}>
            {FORMAT_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {FORMATS.filter((f) => f.g === g).map((f) => <option key={f.k} value={f.k}>{f.l}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs font-semibold text-foreground">Pozadí (spodní vrstva)</Label>
          <select value={params.bg} onChange={(e) => setParams((p) => ({ ...p, bg: e.target.value }))} className={selectClass}>
            {BACKGROUNDS.map((b) => <option key={b.k} value={b.k}>{b.l}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Barva 1<input type="color" value={params.colorA} onChange={(e) => setParams((p) => ({ ...p, colorA: e.target.value }))} className="h-7 w-full rounded border border-input bg-background" /></label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">Barva 2<input type="color" value={params.colorB} onChange={(e) => setParams((p) => ({ ...p, colorB: e.target.value }))} className="h-7 w-full rounded border border-input bg-background" /></label>
          </div>
        </div>

        {/* Light & color */}
        <div className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs font-semibold text-foreground">Světlo & barvy</Label>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Jas: {Math.round(params.brightness * 100)} %</Label>
            <input type="range" min={30} max={200} step={5} value={Math.round(params.brightness * 100)} onChange={(e) => setParams((p) => ({ ...p, brightness: Number(e.target.value) / 100 }))} className="w-full accent-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Kontrast: {Math.round(params.contrast * 100)} %</Label>
            <input type="range" min={50} max={200} step={5} value={Math.round(params.contrast * 100)} onChange={(e) => setParams((p) => ({ ...p, contrast: Number(e.target.value) / 100 }))} className="w-full accent-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sytost: {Math.round(params.saturate * 100)} %</Label>
            <input type="range" min={0} max={200} step={5} value={Math.round(params.saturate * 100)} onChange={(e) => setParams((p) => ({ ...p, saturate: Number(e.target.value) / 100 }))} className="w-full accent-primary" />
          </div>
          {(params.brightness !== 1 || params.contrast !== 1 || params.saturate !== 1) && (
            <button onClick={() => setParams((p) => ({ ...p, brightness: 1, contrast: 1, saturate: 1 }))} className="text-[11px] text-primary hover:underline">Reset světla</button>
          )}
        </div>

        {/* Layers */}
        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><LayersIcon className="size-3.5" />Vrstvy ({layers.length})</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setPicker(true)}><FolderOpen className="size-4" />Z Dokumentů</Button>
            <label className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-input bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted">
              <Plus className="size-3.5" />Nahrát<input type="file" accept="image/*" className="hidden" onChange={onUploadFile} />
            </label>
          </div>
          {layers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Přidej vrstvu — třeba vlnité pozadí, pak logo přes něj.</p>
          ) : (
            <div className="space-y-1">
              {display.map((l) => (
                <div key={l.id} className={cn('flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm', selectedId === l.id ? 'border-primary/50 bg-primary/5' : 'border-border')}>
                  <button onClick={() => setSelectedId(l.id)} className="min-w-0 flex-1 truncate text-left text-foreground">{l.name}</button>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{l.fit === 'cover' ? 'výplň' : 'logo'}</span>
                  <button onClick={() => move(l.id, 'front')} aria-label="Navrch" className="rounded p-0.5 text-muted-foreground hover:text-foreground"><ChevronUp className="size-3.5" /></button>
                  <button onClick={() => move(l.id, 'back')} aria-label="Dospod" className="rounded p-0.5 text-muted-foreground hover:text-foreground"><ChevronDown className="size-3.5" /></button>
                  <button onClick={() => removeLayer(l.id)} aria-label="Smazat" className="rounded p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              <p className="px-1 text-[10px] text-muted-foreground">Nahoře = navrchu (kreslí se naposled).</p>
            </div>
          )}
        </div>

        {/* Selected layer controls */}
        {selected && (
          <div className="space-y-2 border-t border-border pt-3">
            <Label className="text-xs font-semibold text-foreground">Vrstva: {selected.name}</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Výplň</Label>
              <select value={selected.fit} onChange={(e) => updateLayer(selected.id, { fit: e.target.value })} className={selectClass}>
                {FITS.map((f) => <option key={f.k} value={f.k}>{f.l}</option>)}
              </select>
            </div>
            {selected.fit === 'contain' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Velikost: {Math.round(selected.scale * 100)} %</Label>
                  <input type="range" min={5} max={100} step={5} value={Math.round(selected.scale * 100)} onChange={(e) => updateLayer(selected.id, { scale: Number(e.target.value) / 100 })} className="w-full accent-primary" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Pozice X: {Math.round(selected.x * 100)}</Label>
                    <input type="range" min={-50} max={50} step={1} value={Math.round(selected.x * 100)} onChange={(e) => updateLayer(selected.id, { x: Number(e.target.value) / 100 })} className="w-full accent-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Pozice Y: {Math.round(selected.y * 100)}</Label>
                    <input type="range" min={-50} max={50} step={1} value={Math.round(selected.y * 100)} onChange={(e) => updateLayer(selected.id, { y: Number(e.target.value) / 100 })} className="w-full accent-primary" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Průhlednost: {Math.round(selected.opacity * 100)} %</Label>
              <input type="range" min={10} max={100} step={5} value={Math.round(selected.opacity * 100)} onChange={(e) => updateLayer(selected.id, { opacity: Number(e.target.value) / 100 })} className="w-full accent-primary" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nástup</Label>
                <select value={selected.entrance} onChange={(e) => updateLayer(selected.id, { entrance: e.target.value })} className={selectClass}>
                  {ENTRANCES.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pohyb</Label>
                <select value={selected.loop} onChange={(e) => updateLayer(selected.id, { loop: e.target.value })} className={selectClass}>
                  {LOOPS.map((x) => <option key={x.k} value={x.k}>{x.l}</option>)}
                </select>
              </div>
            </div>
            {selected.loop === 'wave' && selected.fit !== 'cover' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Tip: Vlnění funguje nejlépe s výplní „Vyplnit".</p>
            )}
          </div>
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
              <DialogTitle>Přidat vrstvu z Dokumentů</DialogTitle>
              <DialogDescription>Vyber 3D logo nebo grafiku (obrázky z modulu Dokumenty).</DialogDescription>
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
