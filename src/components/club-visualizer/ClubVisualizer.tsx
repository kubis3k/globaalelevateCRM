'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { FolderOpen, Loader2, X, Image as ImageIcon, Film, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { getDocumentUrl } from '@/app/(dashboard)/documents/actions'

type VizDoc = { id: string; name: string; kind: 'image' | 'video' }
type ZoneKey = 'up' | 'center' | 'left' | 'right'

// ── Club dimensions (metres). Approx. OX Club Prague (former Retro Music Hall,
//    nám. Míru): large hall ~1200 cap, balcony/Gold VIP, Diamond VIP glass booth
//    over the DJ, 6 bars. EDIT THESE when exact survey numbers arrive. ──
const CLUB = {
  W: 18,            // hall width (approx — awaiting survey)
  L: 34,            // hall length (approx)
  H: 9,             // hall height (approx)
  balconyY: 4.4,    // gallery floor height (approx)
  balconyDepth: 3.2,// gallery depth from each side wall (approx)
  // Stage — EXACT survey (manager): width 8.58 m, total depth 6.12 m,
  // front playable depth 3.65 m, DJ-booth zone depth 5.0 m.
  stageW: 8.58, stageDepth: 6.12, stageFront: 3.65, boothZone: 5.0, riserH: 0.7,
}
const BACK = -CLUB.L / 2

const ZONES: { key: ZoneKey; label: string; w: number; h: number; pos: [number, number, number] }[] = [
  { key: 'up', label: 'Horní 1920×128', w: 14, h: 14 * 128 / 1920, pos: [0, 6.5, BACK + 0.16] },
  { key: 'center', label: 'Střed 1280×384', w: 7.6, h: 7.6 * 384 / 1280, pos: [0, 3.7, BACK + 0.16] },
  { key: 'left', label: 'Levý 256×640', w: 3.6 * 256 / 640, h: 3.6, pos: [-5.6, 3.2, BACK + 0.4] },
  { key: 'right', label: 'Pravý 256×640', w: 3.6 * 256 / 640, h: 3.6, pos: [5.6, 3.2, BACK + 0.4] },
]

function labelTexture(text: string, w: number, h: number): THREE.CanvasTexture {
  const scale = 64
  const cw = Math.max(64, Math.round(w * scale)), ch = Math.max(64, Math.round(h * scale))
  const c = document.createElement('canvas'); c.width = cw; c.height = ch
  const x = c.getContext('2d')!
  x.fillStyle = '#0c0c12'; x.fillRect(0, 0, cw, ch)
  x.strokeStyle = '#2a6f86'; x.lineWidth = 2
  for (let i = 32; i < cw; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, ch); x.globalAlpha = 0.22; x.stroke() }
  for (let j = 32; j < ch; j += 32) { x.beginPath(); x.moveTo(0, j); x.lineTo(cw, j); x.globalAlpha = 0.22; x.stroke() }
  x.globalAlpha = 1; x.fillStyle = '#7fdcef'; x.textAlign = 'center'; x.textBaseline = 'middle'
  x.font = `${Math.round(Math.min(cw, ch) * 0.14)}px sans-serif`
  x.fillText(text, cw / 2, ch / 2)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

// Decorative "OXOX" balcony-front pattern (matches the club's perforated panels).
function oxPatternTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const x = c.getContext('2d')!
  x.fillStyle = '#1a1a20'; x.fillRect(0, 0, 256, 64)
  x.fillStyle = '#3a3a46'; x.font = 'bold 34px sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'center'
  const seq = 'OXOXOXOX'
  for (let i = 0; i < seq.length; i++) x.fillText(seq[i], 16 + i * 32, 32)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping
  return t
}

export function ClubVisualizer({ documents }: { documents: VizDoc[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const ledRef = useRef<Record<ZoneKey, THREE.Mesh>>({} as any)
  const contentRef = useRef<Record<string, { url: string; tex: THREE.Texture; video?: HTMLVideoElement }>>({})
  const lightsRef = useRef<{ all: { i: number; obj: THREE.Light }[] } | null>(null)
  const sph = useRef({ radius: 27, theta: 0, phi: 1.18 })
  const target = useRef(new THREE.Vector3(0, 3, -13))
  const rafRef = useRef(0)

  const [assigned, setAssigned] = useState<Record<ZoneKey, string | null>>({ up: null, center: null, left: null, right: null })
  const [picker, setPicker] = useState<ZoneKey | null>(null)
  const [busy, setBusy] = useState<ZoneKey | null>(null)
  const [light, setLight] = useState(1.2)

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x111116)
    const camera = new THREE.PerspectiveCamera(55, wrap.clientWidth / wrap.clientHeight, 0.1, 300); cameraRef.current = camera
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(wrap.clientWidth, wrap.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.outputColorSpace = THREE.SRGBColorSpace
    wrap.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none'
    rendererRef.current = renderer

    const { W, L, H, balconyY, balconyDepth } = CLUB

    // ── Bright, neutral lighting (no club red/blue tint) ──
    const lights: { i: number; obj: THREE.Light }[] = []
    const reg = (obj: THREE.Light, i: number) => { lights.push({ i, obj }); scene.add(obj); return obj }
    reg(new THREE.HemisphereLight(0xffffff, 0x6a6a72, 1.0), 1.0)
    reg(new THREE.AmbientLight(0xffffff, 0.55), 0.55)
    const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(6, 14, 10); reg(dir, 0.7)
    // soft white downlights along the room → "lit club" feel, natural colour
    for (const z of [-10, -2, 6, 12]) {
      const sp = new THREE.SpotLight(0xfff4ea, 0.55, 30, Math.PI / 3.5, 0.6, 1.2)
      sp.position.set(0, H - 0.5, z); sp.target.position.set(0, 0, z); scene.add(sp.target); reg(sp, 0.55)
    }
    lightsRef.current = { all: lights }

    const matRoom = new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x26262e, roughness: 0.6, metalness: 0.2 })
    const matPlat = new THREE.MeshStandardMaterial({ color: 0x44444f, roughness: 0.85 })
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.4, metalness: 0.7 })
    const matDark = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 1 })

    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0) => {
      const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.rotation.x = rx; mesh.rotation.y = ry; scene.add(mesh); return mesh
    }
    // shell
    add(new THREE.PlaneGeometry(W, L), matFloor, 0, 0, 0, -Math.PI / 2)
    add(new THREE.PlaneGeometry(W, H), matRoom, 0, H / 2, BACK)
    add(new THREE.PlaneGeometry(L, H), matRoom, -W / 2, H / 2, 0, 0, Math.PI / 2)
    add(new THREE.PlaneGeometry(L, H), matRoom, W / 2, H / 2, 0, 0, -Math.PI / 2)
    add(new THREE.PlaneGeometry(W, L), matDark, 0, H, 0, Math.PI / 2)
    add(new THREE.PlaneGeometry(W, H), matRoom, 0, H / 2, L / 2, 0, Math.PI) // front wall (behind camera)

    // raised side lanes (ground)
    add(new THREE.BoxGeometry(2.6, 0.45, L - 4), matPlat, -(W / 2 - 1.6), 0.22, 1)
    add(new THREE.BoxGeometry(2.6, 0.45, L - 4), matPlat, (W / 2 - 1.6), 0.22, 1)
    // stage (exact survey) — riser from the back wall forward by stageDepth
    add(new THREE.BoxGeometry(CLUB.stageW, CLUB.riserH, CLUB.stageDepth), matPlat, 0, CLUB.riserH / 2, BACK + CLUB.stageDepth / 2 + 0.1)
    // front playable lip (lower step at the audience edge, depth = stageFront)
    add(new THREE.BoxGeometry(CLUB.stageW, CLUB.riserH * 0.7, CLUB.stageFront), matPlat, 0, CLUB.riserH * 0.35, BACK + CLUB.stageDepth + 0.1 - CLUB.stageFront / 2)
    // DJ booth — within the booth zone (depth boothZone), on top of the riser
    add(new THREE.BoxGeometry(3.6, 1.3, 1.4), matMetal, 0, CLUB.riserH + 0.65, BACK + CLUB.boothZone / 2 + 0.1)

    // ── Balcony / gallery (Gold VIP) on both sides ──
    const oxTex = oxPatternTexture()
    const matFront = new THREE.MeshStandardMaterial({ map: oxTex, color: 0x9a9aa6, roughness: 0.8 })
    const matRail = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.3, metalness: 0.8 })
    for (const sgn of [-1, 1]) {
      const innerX = sgn * (W / 2 - balconyDepth)
      add(new THREE.BoxGeometry(balconyDepth, 0.3, L - 6), matPlat, sgn * (W / 2 - balconyDepth / 2), balconyY, 0) // gallery floor
      const front = oxTex.clone(); front.needsUpdate = true; front.repeat.set((L - 6) / 2.5, 1)
      const fmat = matFront.clone(); fmat.map = front
      add(new THREE.PlaneGeometry(L - 6, 1.0), fmat, innerX, balconyY + 0.5, 0, 0, Math.PI / 2) // OX front panel
      add(new THREE.BoxGeometry(0.06, 0.06, L - 6), matRail, innerX, balconyY + 1.05, 0) // top rail
    }

    // ── Diamond VIP glass booth above the DJ ──
    const glass = new THREE.MeshStandardMaterial({ color: 0xc4ccd4, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.16 })
    add(new THREE.BoxGeometry(3.6, 2.0, 1.6), glass, 0, 5.6, BACK + 0.9)
    add(new THREE.BoxGeometry(3.7, 0.08, 1.7), matMetal, 0, 4.6, BACK + 0.9) // booth base

    // ── A couple of bars (counters) ──
    const matBarTop = new THREE.MeshStandardMaterial({ color: 0x5a5a66, roughness: 0.5, metalness: 0.3 })
    add(new THREE.BoxGeometry(1.3, 1.15, 7), matDark, W / 2 - 1.8, 0.58, 7); add(new THREE.BoxGeometry(1.5, 0.1, 7.2), matBarTop, W / 2 - 1.8, 1.16, 7)
    add(new THREE.BoxGeometry(1.3, 1.15, 5), matDark, -(W / 2 - 1.8), 0.58, 9); add(new THREE.BoxGeometry(1.5, 0.1, 5.2), matBarTop, -(W / 2 - 1.8), 1.16, 9)

    // ── Ceiling truss + fixtures (visual, emissive) ──
    const matTruss = new THREE.MeshStandardMaterial({ color: 0x202026, roughness: 0.6, metalness: 0.6 })
    const fixture = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3e0, emissiveIntensity: 1.4 })
    for (const z of [-9, -3, 3, 9]) {
      add(new THREE.BoxGeometry(W - 1.5, 0.14, 0.14), matTruss, 0, H - 0.4, z)
      for (const fx of [-5, -1.7, 1.7, 5]) add(new THREE.SphereGeometry(0.13, 12, 12), fixture, fx, H - 0.55, z)
    }

    // ── LED zones ──
    for (const z of ZONES) {
      const bezel = new THREE.Mesh(new THREE.PlaneGeometry(z.w + 0.14, z.h + 0.14), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 }))
      bezel.position.set(z.pos[0], z.pos[1], z.pos[2] - 0.02); scene.add(bezel)
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: labelTexture(z.label, z.w, z.h), toneMapped: false })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.h), mat)
      mesh.position.set(z.pos[0], z.pos[1], z.pos[2]); scene.add(mesh)
      ledRef.current[z.key] = mesh
    }

    // ── Custom orbit ──
    let dragging = false, px = 0, py = 0
    const dom = renderer.domElement
    const onDown = (e: PointerEvent) => { dragging = true; px = e.clientX; py = e.clientY; dom.setPointerCapture(e.pointerId) }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY
      sph.current.theta -= dx * 0.005
      sph.current.phi = Math.max(0.12, Math.min(1.52, sph.current.phi - dy * 0.005))
    }
    const onUp = (e: PointerEvent) => { dragging = false; try { dom.releasePointerCapture(e.pointerId) } catch { } }
    const onWheel = (e: WheelEvent) => { e.preventDefault(); sph.current.radius = Math.max(5, Math.min(60, sph.current.radius * (1 + e.deltaY * 0.001))) }
    dom.addEventListener('pointerdown', onDown); dom.addEventListener('pointermove', onMove)
    dom.addEventListener('pointerup', onUp); dom.addEventListener('pointerleave', onUp)
    dom.addEventListener('wheel', onWheel, { passive: false })

    const tmp = new THREE.Vector3()
    const loop = () => {
      const s = sph.current
      tmp.setFromSphericalCoords(s.radius, s.phi, s.theta)
      camera.position.copy(target.current).add(tmp); camera.lookAt(target.current)
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

  useEffect(() => {
    const l = lightsRef.current; if (!l) return
    for (const e of l.all) e.obj.intensity = e.i * light
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

  function setView(v: 'parket' | 'dj' | 'shora' | 'bok' | 'balkon') {
    if (v === 'parket') { sph.current = { radius: 27, theta: 0, phi: 1.18 }; target.current.set(0, 3, -13) }
    if (v === 'dj') { sph.current = { radius: 11, theta: 0, phi: 1.4 }; target.current.set(0, 3.6, BACK + 2.6) }
    if (v === 'shora') { sph.current = { radius: 30, theta: 0, phi: 0.4 }; target.current.set(0, 1, -6) }
    if (v === 'bok') { sph.current = { radius: 26, theta: 0.95, phi: 1.12 }; target.current.set(0, 3, -10) }
    if (v === 'balkon') { sph.current = { radius: 20, theta: 0.5, phi: 1.05 }; target.current.set(0, 4.5, -12) }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-3">
        <div ref={wrapRef} className="h-[72vh] w-full overflow-hidden rounded-xl border border-border bg-black" />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Pohled:</span>
          <Button size="sm" variant="outline" onClick={() => setView('parket')}>Z parketu</Button>
          <Button size="sm" variant="outline" onClick={() => setView('dj')}>Od DJ</Button>
          <Button size="sm" variant="outline" onClick={() => setView('balkon')}>Z balkonu</Button>
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
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Sun className="size-3.5" />Osvětlení klubu: {Math.round(light * 100)} %</Label>
          <input type="range" min={20} max={250} step={10} value={Math.round(light * 100)} onChange={(e) => setLight(Number(e.target.value) / 100)} className="w-full accent-primary" />
        </div>
        <p className="text-[11px] text-muted-foreground">Stage má přesné rozměry dle zaměření (8,58 × 6,12 m). Rozměry sálu/balkonu jsou zatím přibližné — doplníme, až je dodáš.</p>
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
