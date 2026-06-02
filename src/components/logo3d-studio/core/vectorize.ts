// Client-side vectorization: turns an uploaded raster (PNG/JPG) into clean SVG
// paths using potrace compiled to WebAssembly. SVG uploads are passed through.
//
// SSR-safe: the WASM module is imported lazily on first use.

export interface VectorizeOptions {
  /** Luminance cut 0..255 — pixels darker than this become the shape. Default 160. */
  threshold?: number;
  /** Trace light shapes on a dark background instead. Default false. */
  invert?: boolean;
  /** Speckle suppression — drop areas smaller than this. Default 2. */
  turdSize?: number;
  /** Corner smoothing 0..1.34. Default 1. */
  alphaMax?: number;
  /** Curve optimization tolerance. Default 0.2. */
  optTolerance?: number;
  /** Color used to flatten transparency before tracing. Default '#ffffff'. */
  background?: string;
}

export type RasterSource = File | Blob | HTMLImageElement | ImageData;

export interface VectorizeResult {
  svg: string;
  sourceType: 'svg' | 'raster';
}

let _mod: typeof import('esm-potrace-wasm') | null = null;
let _ready: Promise<void> | null = null;

async function ensureReady(): Promise<typeof import('esm-potrace-wasm')> {
  if (!_mod) _mod = await import('esm-potrace-wasm');
  if (!_ready) _ready = _mod.init();
  await _ready;
  return _mod;
}

export function isSvgFile(file: File): boolean {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
}

export async function readSvgFile(file: File): Promise<string> {
  return file.text();
}

function applyThreshold(id: ImageData, threshold: number, invert: boolean): ImageData {
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255;
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * a + 255 * (1 - a);
    let dark = lum < threshold;
    if (invert) dark = !dark;
    const v = dark ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  return id;
}

async function toThresholdedImageData(
  source: RasterSource,
  bg: string,
  threshold: number,
  invert: boolean,
): Promise<ImageData> {
  if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
    return applyThreshold(source, threshold, invert);
  }

  let width: number;
  let height: number;
  let paint: (ctx: CanvasRenderingContext2D) => void;

  if (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) {
    width = source.naturalWidth;
    height = source.naturalHeight;
    paint = (ctx) => ctx.drawImage(source, 0, 0);
  } else {
    const bitmap = await createImageBitmap(source as Blob);
    width = bitmap.width;
    height = bitmap.height;
    paint = (ctx) => ctx.drawImage(bitmap, 0, 0);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  paint(ctx);
  const id = ctx.getImageData(0, 0, width, height);
  return applyThreshold(id, threshold, invert);
}

/** Vectorize a raster source into SVG markup. */
export async function rasterToSvg(source: RasterSource, opts: VectorizeOptions = {}): Promise<string> {
  const {
    threshold = 160,
    invert = false,
    turdSize = 2,
    alphaMax = 1,
    optTolerance = 0.2,
    background = '#ffffff',
  } = opts;

  const mod = await ensureReady();
  const imageData = await toThresholdedImageData(source, background, threshold, invert);

  return mod.potrace(imageData, {
    turdsize: turdSize,
    turnpolicy: 4,
    alphamax: alphaMax,
    opticurve: 1,
    opttolerance: optTolerance,
    pathonly: false,
    extractcolors: false,
  });
}

/** Convert any uploaded file (SVG or raster) into SVG markup ready for 3D. */
export async function fileToSvg(file: File, opts?: VectorizeOptions): Promise<VectorizeResult> {
  if (isSvgFile(file)) {
    return { svg: await readSvgFile(file), sourceType: 'svg' };
  }
  return { svg: await rasterToSvg(file, opts), sourceType: 'raster' };
}
