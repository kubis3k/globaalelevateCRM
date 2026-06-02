import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  ShadowMaterial,
  ExtrudeGeometry,
  Shape,
  Box2,
  Box3,
  Vector2,
  Vector3,
  Color,
  CanvasTexture,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PMREMGenerator,
  type Texture,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { DEFAULT_SETTINGS, type Logo3DSettings } from './types';
import { MATERIAL_PRESETS, makeMaterial } from './materials';

export interface ExportPNGOptions {
  /** Render scale multiplier for a crisper image. Default 2. */
  scale?: number;
  /** Export with a transparent background. Default false. */
  transparent?: boolean;
}

/**
 * Framework-agnostic 3D logo engine. Owns a Three.js scene bound to a canvas.
 * Drive it imperatively: setSVG(), setSettings(), exportGLB()/exportPNG().
 */
export class Logo3DEngine {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private pmrem: PMREMGenerator;

  private material: MeshPhysicalMaterial;
  private mesh: Mesh | null = null;
  private shapes: Shape[] | null = null;

  private ground: Mesh;
  private reflector: Reflector;

  private gradientTex: Texture | null = null;
  private baseBox: Box3 | null = null;
  private settings: Logo3DSettings;

  private width = 1;
  private height = 1;
  private raf = 0;
  private readonly TARGET = 5;
  private readonly initialCamPos = new Vector3(3.4, 1.1, 8.0);

  constructor(canvas: HTMLCanvasElement, settings?: Partial<Logo3DSettings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.width = canvas.clientWidth || canvas.width || 1;
    this.height = canvas.clientHeight || canvas.height || 1;

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.exposure;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.scene = new Scene();

    this.pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new PerspectiveCamera(32, this.width / this.height, 0.1, 100);
    this.camera.position.copy(this.initialCamPos);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 22;
    this.controls.autoRotate = this.settings.autoRotate;
    this.controls.autoRotateSpeed = this.settings.rotateSpeed;
    this.controls.target.set(0, 0, 0);

    const key = new DirectionalLight(0xffffff, 2.4);
    key.position.set(5, 9, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 6;
    this.scene.add(key);

    const rim = new DirectionalLight(0x7fb0ff, 1.3);
    rim.position.set(-6, 3, -6);
    this.scene.add(rim);

    const fill = new DirectionalLight(0xffe9c7, 0.4);
    fill.position.set(-4, 0.5, 6);
    this.scene.add(fill);

    // Floor: contact shadow + optional mirror reflection.
    this.ground = new Mesh(new PlaneGeometry(60, 60), new ShadowMaterial({ opacity: 0.45 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const rdim = Math.max(2, Math.floor(this.width)) * 2;
    this.reflector = new Reflector(new PlaneGeometry(60, 60), {
      textureWidth: rdim,
      textureHeight: rdim,
      color: 0x6a7280,
    });
    this.reflector.rotation.x = -Math.PI / 2;
    this.reflector.visible = this.settings.floorReflection;
    this.scene.add(this.reflector);

    this.material = makeMaterial(MATERIAL_PRESETS[this.settings.material]);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(new Vector2(this.width, this.height), this.settings.bloom, 0.4, 0.9);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    const pr = this.renderer.getPixelRatio();
    this.composer.addPass(new SMAAPass(this.width * pr, this.height * pr));
    this.composer.setSize(this.width, this.height);

    this.applyBackground();
    this.animate = this.animate.bind(this);
    this.raf = requestAnimationFrame(this.animate);
  }

  // ---- Public API -------------------------------------------------------

  /** Load SVG markup, build & frame the extruded mesh. */
  setSVG(svg: string): void {
    const data = new SVGLoader().parse(svg);
    const shapes: Shape[] = [];
    for (const path of data.paths) {
      for (const s of SVGLoader.createShapes(path)) shapes.push(s);
    }
    if (shapes.length === 0) throw new Error('No drawable shapes found in SVG.');
    this.shapes = shapes;
    this.rebuildGeometry();
  }

  /** Update any subset of settings; only the affected parts rebuild. */
  setSettings(partial: Partial<Logo3DSettings>): void {
    const prev = this.settings;
    const next = { ...prev, ...partial };
    this.settings = next;

    if (partial.exposure !== undefined) this.renderer.toneMappingExposure = next.exposure;
    if (partial.bloom !== undefined) this.bloomPass.strength = next.bloom;
    if (partial.autoRotate !== undefined) this.controls.autoRotate = next.autoRotate;
    if (partial.rotateSpeed !== undefined) this.controls.autoRotateSpeed = next.rotateSpeed;
    if (partial.floorReflection !== undefined) this.reflector.visible = next.floorReflection;
    if (partial.background !== undefined) this.applyBackground();

    if (partial.material !== undefined) {
      const old = this.material;
      this.material = makeMaterial(MATERIAL_PRESETS[next.material]);
      if (this.mesh) this.mesh.material = this.material;
      old.dispose();
    }

    if (partial.depth !== undefined || partial.bevel !== undefined) {
      this.rebuildGeometry();
    }
  }

  getSettings(): Logo3DSettings {
    return { ...this.settings };
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
  }

  resetView(): void {
    this.camera.position.copy(this.initialCamPos);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /** Export the current mesh as a binary glTF (.glb) Blob. */
  exportGLB(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mesh) {
        reject(new Error('No graphic loaded.'));
        return;
      }
      const exporter = new GLTFExporter();
      exporter.parse(
        this.mesh,
        (result) => resolve(new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })),
        (err) => reject(err),
        { binary: true },
      );
    });
  }

  /** Render the current view to a PNG data URL (optionally high-res / transparent). */
  exportPNG(opts: ExportPNGOptions = {}): string {
    const scale = opts.scale ?? 2;
    const transparent = opts.transparent ?? false;
    const { width: w, height: h } = this;
    const prevBg = this.scene.background;

    if (transparent) {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    }
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w * scale, h * scale, false);
    this.composer.setSize(w * scale, h * scale);
    this.composer.render();
    const url = this.renderer.domElement.toDataURL('image/png');

    // restore
    this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    if (transparent) {
      this.scene.background = prevBg;
      this.applyClearColor();
    }
    this.composer.render();
    return url;
  }

  /** Square PNG thumbnail (data URL) of the current view. */
  getThumbnail(size = 256): string {
    this.composer.render();
    const src = this.renderer.domElement;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, size, size);
    const sa = src.width / src.height;
    let dw = size;
    let dh = size;
    if (sa > 1) dh = size / sa;
    else dw = size * sa;
    ctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh);
    return c.toDataURL('image/png');
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.mesh?.geometry.dispose();
    this.material.dispose();
    this.ground.geometry.dispose();
    (this.ground.material as ShadowMaterial).dispose();
    this.reflector.geometry.dispose();
    this.gradientTex?.dispose();
    this.pmrem.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }

  // ---- Internals --------------------------------------------------------

  private measurePlanar(shapes: Shape[]): number {
    const box = new Box2();
    for (const s of shapes) {
      for (const p of s.getPoints(12)) box.expandByPoint(p);
    }
    const size = box.getSize(new Vector2());
    return Math.max(size.x, size.y) || 1;
  }

  private rebuildGeometry(): void {
    if (!this.shapes) return;
    const planar = this.measurePlanar(this.shapes);
    const depth = Math.max(0.001, this.settings.depth) * planar;
    const bevel = Math.max(0, this.settings.bevel) * planar;

    const geo = new ExtrudeGeometry(this.shapes, {
      depth,
      curveSegments: 26,
      steps: 1,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 5,
    });
    geo.computeBoundingBox();
    const center = geo.boundingBox!.getCenter(new Vector3());
    geo.translate(-center.x, -center.y, -center.z);
    const scale = this.TARGET / planar;
    geo.scale(scale, -scale, scale); // flip Y: SVG space is y-down
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    this.baseBox = geo.boundingBox!.clone();

    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.mesh = new Mesh(geo, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
    this.positionFloor();
  }

  private positionFloor(): void {
    if (!this.baseBox) return;
    const y = this.baseBox.min.y - 0.02;
    this.ground.position.y = y;
    this.reflector.position.y = y - 0.001;
  }

  private makeGradientTexture(): Texture {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 512;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 200, 30, 32, 300, 460);
    grd.addColorStop(0, '#1c2230');
    grd.addColorStop(0.45, '#0d1018');
    grd.addColorStop(1, '#05060a');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 512);
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }

  private applyBackground(): void {
    const bg = this.settings.background;
    if (bg === 'transparent') {
      this.scene.background = null;
    } else if (bg === 'studio') {
      if (!this.gradientTex) this.gradientTex = this.makeGradientTexture();
      this.scene.background = this.gradientTex;
    } else {
      this.scene.background = new Color(bg);
    }
    this.applyClearColor();
  }

  private applyClearColor(): void {
    if (this.settings.background === 'transparent') this.renderer.setClearColor(0x000000, 0);
    else this.renderer.setClearColor(0x000000, 1);
  }

  private animate(): void {
    this.raf = requestAnimationFrame(this.animate);
    this.controls.update();
    this.composer.render();
  }
}
