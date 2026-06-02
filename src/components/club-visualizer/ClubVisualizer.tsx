'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { FolderOpen, Loader2, X, Image as ImageIcon, Film, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { getDocumentUrl } from '@/app/(dashboard)/documents/actions'

type VizDoc = { id: string; name: string; kind: 'image' | 'video' }
type ZoneKey = 'up' | 'center' | 'left' | 'right'

// Room dimensions (approx. metres) modelled after the OX Club layout.
const W = 14, L = 26, H = 7, BACK = -L / 2

const ZONES: { key: ZoneKey; label: string; w: number; h: number; pos: [number, number, number] }[] = [
  { key: 'up', label: 'Horní 1920×128', w: 11, h: 11 * 128 / 1920, pos: [0, 5.6, BACK + 0.15] },
  { key: 'center', label: 'Střed 1280×384', w: 6.2, h: 6.2 * 384 / 1280, pos: [0, 3.2, BACK + 0.15] },
  { key: 'left', label: 'Levý 256×640', w: 3.0 * 256 / 640, h: 3.0, pos: [-4.4, 2.8, BACK + 0.35] },
  { key: 'right', label: 'Pravý 256×640', w: 3.0 * 256 / 640, h: 3.0, pos: [4.4, 2.8, BACK + 0.35] },
]

function labelTexture(text: string, w: number, h: number): THREE.CanvasTexture {
  const scale = 64
  const cw = Math.max(64, Math.round(w * scale)), ch = Math.max(64, Math.round(h * scale))
  const c = document.createElement('canvas'); c.width = cw; c.height = ch
  const x = c.getContext('2d')!
  x.fillStyle = '#0c0c12'; x.fillRect(0, 0, cw, ch)
  x.strokeStyle = '#1d6f86'; x.lineWidth = 2
  const step = 32
  for (let i = step; i < cw; i += step) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, ch); x.globalAlpha = 0.25; x.stroke() }
  for (let j = step; j < ch; j += step) { x.beginPath(); x.moveTo(0, j); x.lineTo(cw, j); x.globalAlpha = 0.25; x.stroke() }
  x.globalAlpha = 1; x.fillStyle = '#5fd0e6'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = `${Math.round(Math.min(cw, ch) * 0.14)}px sans-serif`
  x.fillText(text, cw / 2, ch / 2)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

export function ClubVisualizer({ documents }: { documents: VizDoc[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const ledRef = useRef<Record<ZoneKey, THREE.Mesh>>({} as any)
  const contentRef = useRef<Record<string, { url: string; tex: THREE.Texture; video?: HTMLVideoElement }>>({})
  const lightsRef = useRef<{ amb: THREE.AmbientLight; hemi: THREE.HemisphereLight; dir: THREE.DirectionalLight; spot: THREE.SpotLight } | null>(null)
  const sph = useRef({ radius: 19, theta: 0, phi: 1.24 })
  const target = useRef(new THREE.Vector3(0, 2.6, -11))
  const rafRef = useRef(0)

  const [assigned, setAssigned] = useState<Record<ZoneKey, string | null>>({ up: null, center: null, left: null, right: null })
  const [picker, setPicker] = useState<ZoneKey | null>(null)
  const [busy, setBusy] = useState<ZoneKey | null>(null)
  const [light, setLight] = useState(1)

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0a0d); sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(55, wrap.clientWidth / wrap.clientHeight, 0.1, 200); cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(wrap.clientWidth, wrap.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.outputColorSpace = THREE.SRGBColorSpace
    wrap.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none'
    rendererRef.current = renderer

    // ── Neutral / natural lighting (no club red/blue tint) ──
    const hemi = new THREE.HemisphereLight(0xffffff, 0x35353c, 0.55 * light)
    const amb = new THREE.AmbientLight(0xffffff, 0.2 * light)
    const dir = new THREE.DirectionalLight(0xffffff, 0.5 * light); dir.position.set(4, 10, 8)
    const spot = new THREE.SpotLight(0xfff3e3, 0.7 * light, 40, Math.PI / 4, 0.5); spot.position.set(0, 6.5, -5)
    spot.target.position.set(0, 0, -11)
    scene.add(hemi, amb, dir, spot, spot.target)
    lightsRef.current = { amb, hemi, dir, spot }

    const matRoom = new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.96, metalness: 0, side: THREE.DoubleSide })
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x0e0e13, roughness: 0.7, metalness: 0.15 })
    const matPlat = new THREE.MeshStandardMaterial({ color: 0x1d1d24, roughness: 0.9 })
    const matDark = new THREE.MeshStandardMaterial({ color: 0x070709, roughness: 1 })

    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0) => {
      const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.rotation.x = rx; mesh.rotation.y = ry; scene.add(mesh); return mesh
    }
    add(new THREE.PlaneGeometry(W, L), matFloor, 0, 0, 0, -Math.PI / 2)            // floor
    add(new THREE.PlaneGeometry(W, H), matRoom, 0, H / 2, BACK)                    // back wall
    add(new THREE.PlaneGeometry(L, H), matRoom, -W / 2, H / 2, 0, 0, Math.PI / 2) // left wall
    add(new THREE.PlaneGeometry(L, H), matRoom, W / 2, H / 2, 0, 0, -Math.PI / 2) // right wall
    add(new THREE.PlaneGeometry(W, L), matDark, 0, H, 0, Math.PI / 2)             // ceiling
    // raised side lanes
    add(new THREE.BoxGeometry(2.2, 0.5, L - 3), matPlat, -(W / 2 - 1.5), 0.25, 1)
    add(new THREE.BoxGeometry(2.2, 0.5, L - 3), matPlat, (W / 2 - 1.5), 0.25, 1)
    // stage riser + DJ booth
    add(new THREE.BoxGeometry(8, 0.6, 3), matPlat, 0, 0.3, BACK + 1.8)
    add(new THREE.BoxGeometry(3.2, 1.2, 1.1), matDark, 0, 0.9, BACK + 2.0)
    // truss bars (hint)
    for (const z of [-3, 1, 5]) add(new THREE.BoxGeometry(W - 1, 0.12, 0.12), matDark, 0, H - 0.3, z)

    // ── LED zones ──
    for (const z of ZONES) {
      const bezel = new THREE.Mesh(new THREE.PlaneGeometry(z.w + 0.12, z.h + 0.12), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 }))
      bezel.position.set(z.pos[0], z.pos[1], z.pos[2] - 0.02); scene.add(bezel)
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: labelTexture(z.label, z.w, z.h), toneMapped: false })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.h), mat)
      mesh.position.set(z.pos[0], z.pos[1], z.pos[2]); scene.add(mesh)
      ledRef.current[z.key] = mesh
    }

    // ── Custom orbit controls ──
    let dragging = false, px = 0, py = 0
    const dom = renderer.domElement
    const onDown = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY; dom.setPointerCapture(e.pointerId) }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY
      sph.current.theta -= dx * 0.005
      sph.current.phi = Math.max(0.15, Math.min(1.5, sph.current.phi - dy * 0.005))
    }
    const onUp = (e: PointerEvent) => { dragging = false; try { dom.releasePointerCapture(e.pointerId) } catch { } }
    const onWheel = (e: WheelEvent) => { e.preventDefault(); sph.current.radius = Math.max(5, Math.min(42, sph.current.radius * (1 + e.deltaY * 0.001))) }
    dom.addEventListener('pointerdown', onDown); dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerup', onUp); dom.addEventListener('pointerleave', onUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    const tmp = new THREE.Vector3()
    const loop = () => {
      const s = sph.current
      tmp.setFromSphericalCoords(s.radius, s.phi, s.theta)
      camera.position.copy(target.current).add(tmp)
      camera.lookAt(target.current)
      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()

    const ro = new ResizeObserver(() => {
      if (!wrap.clientWidth) return
      renderer.setSize(wrap.clientWidth, wrap.clientHeight)
      camera.aspect = wrap.clientWidth / wrap.clientHeight; camera.updateProjectionMatrix()
    })
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(rafRef.current); ro.disconnect()
      dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('pointerup', onUp); dom.removeEventListener('pointerleave', onUp); dom.removeEventListener('wheel', onWheel)
      Object.values(contentRef.current).forEach((c) => { try { URL.revokeObjectURL(c.url); c.tex.dispose(); c.video?.pause() } catch { } })
      renderer.dispose(); if (dom.parentElement) dom.parentElement.removeChild(dom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Light intensity slider
  useEffect(() => {
    const l = lightsRef.current; if (!l) return
    l.hemi.intensity = 0.55 * light; l.amb.intensity = 0.2 * light; l.dir.intensity = 0.5 * light; l.spot.intensity = 0.7 * light
  }, [light])

  function cleanupZone(zone: ZoneKey) {
    const cur = contentRef.current[zone]
    if (cur) { try { URL.revokeObjectURL(cur.url); cur.tex.dispose(); cur.video?.pause() } catch { } delete contentRef.current[zone] }
  }

  async function assign(zone: ZoneKey, doc: VizDoc) {
    setPicker(null); setBusy(zone)
    try {
      const res = await getDocumentUrl(doc.id)
      if (res.error || !res.url) { toast.error('Chyba', res.error || 'Nepodařilo se načíst.'); return }
      const blob = await (await fetch(res.url)).blob()
      const url = URL.createObjectURL(blob)
      const mesh = ledRef.current[zone]; if (!mesh) return
      const mat = mesh.material as THREE.MeshBasicMaterial
      cleanupZone(zone)
      if (doc.kind === 'video') {
        const v = document.createElement('video'); v.src = url; v.loop = true; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous'
        await v.play().catch(() => { })
        const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace
        mat.map = tex; mat.needsUpdate = true
        contentRef.current[zone] = { url, tex, video: v }
      } else {
        const img = new Image(); img.src = url
        try { await img.decode() } catch { }
        const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true
        mat.map = tex; mat.needsUpdate = true
        contentRef.current[zone] = { url, tex }
      }
      setAssigned((a) => ({ ...a, [zone]: doc.name }))
    } catch (e: any) {
      toast.error('Chyba', e?.message || 'Načtení selhalo.')
    } finally { setBusy(null) }
  }

  function clearZone(zone: ZoneKey) {
    const mesh = ledRef.current[zone]; if (!mesh) return
    cleanupZone(zone)
    const z = ZONES.find((x) => x.key === zone)!
    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.map = labelTexture(z.label, z.w, z.h); mat.needsUpdate = true
    setAssigned((a) => ({ ...a, [zone]: null }))
  }

  function setView(v: 'parket' | 'dj' | 'shora' | 'bok') {
    if (v === 'parket') { sph.current = { radius: 19, theta: 0, phi: 1.24 }; target.current.set(0, 2.6, -11) }
    if (v === 'dj') { sph.current = { radius: 8, theta: 0, phi: 1.4 }; target.current.set(0, 2.8, -12) }
    if (v === 'shora') { sph.current = { radius: 22, theta: 0, phi: 0.45 }; target.current.set(0, 1, -6) }
    if (v === 'bok') { sph.current = { radius: 19, theta: 0.95, phi: 1.2 }; target.current.set(0, 2.6, -9) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-3">
        <div ref={wrapRef} className="h-[70vh] w-full overflow-hidden rounded-xl border border-border bg-black" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Pohled:</span>
          <Button size="sm" variant="outline" onClick={() => setView('parket')}>Z parketu</Button>
          <Button size="sm" variant="outline" onClick={() => setView('dj')}>Od DJ</Button>
          <Button size="sm" variant="outline" onClick={() => setView('shora')}>Shora</Button>
          <Button size="sm" variant="outline" onClick={() => setView('bok')}>Z boku</Button>
          <span className="ml-2 text-xs text-muted-foreground">Táhni myší = otáčení · kolečko = zoom</span>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <Label className="text-xs font-semibold text-foreground">LED panely u stage</Label>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Přiřaď grafiku/animaci z Dokumentů na každou zónu. Videa (export z Animací) se přehrají živě.</p>
        </div>
        {ZONES.map((z) => (
          <div key={z.key} className="space-y-1.5 rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{z.label}</span>
              {busy === z.key && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            {assigned[z.key] ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{assigned[z.key]}</span>
                <button onClick={() => clearZone(z.key)} aria-label="Vyčistit" className="rounded p-0.5 hover:text-destructive"><X className="size-3.5" /></button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">Bez obsahu</p>
            )}
            <Button size="sm" variant="outline" className="w-full" onClick={() => setPicker(z.key)}><FolderOpen className="size-4" />Vložit obsah</Button>
          </div>
        ))}

        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sun className="size-3.5" />Osvětlení scény: {Math.round(light * 100)} %</Label>
          <input type="range" min={20} max={200} step={10} value={Math.round(light * 100)} onChange={(e) => setLight(Number(e.target.value) / 100)} className="w-full accent-primary" />
        </div>
      </div>

      {picker && (
        <Dialog open onOpenChange={(o) => { if (!o) setPicker(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vložit na: {ZONES.find((z) => z.key === picker)?.label}</DialogTitle>
              <DialogDescription>Vyber grafiku nebo animaci z Dokumentů (obrázky + videa).</DialogDescription>
            </DialogHeader>
            {documents.length === 0 ? (
              <EmptyState icon={FolderOpen} title="Žádný obsah" description="Ulož 3D logo nebo export animace do Dokumentů, pak ho tu uvidíš." />
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {documents.map((d) => (
                  <button key={d.id} onClick={() => assign(picker, d)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted">
                    {d.kind === 'video' ? <Film className="size-4 shrink-0 text-primary" /> : <ImageIcon className="size-4 shrink-0 text-muted-foreground" />}
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
