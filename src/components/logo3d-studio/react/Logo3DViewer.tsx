import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from 'react';
import { Logo3DEngine, type ExportPNGOptions } from '../core/Logo3DEngine';
import type { Logo3DSettings } from '../core/types';

export interface Logo3DViewerHandle {
  exportGLB(): Promise<Blob>;
  exportPNG(opts?: ExportPNGOptions): string;
  getThumbnail(size?: number): string;
  resetView(): void;
  getEngine(): Logo3DEngine | null;
}

export interface Logo3DViewerProps {
  /** SVG markup to render in 3D. null = nothing loaded yet. */
  svg: string | null;
  settings: Logo3DSettings;
  className?: string;
  style?: CSSProperties;
  onError?: (error: unknown) => void;
}

function diffSettings(prev: Logo3DSettings | null, next: Logo3DSettings): Partial<Logo3DSettings> {
  if (!prev) return { ...next };
  const out: Partial<Logo3DSettings> = {};
  if (prev.material !== next.material) out.material = next.material;
  if (prev.depth !== next.depth) out.depth = next.depth;
  if (prev.bevel !== next.bevel) out.bevel = next.bevel;
  if (prev.background !== next.background) out.background = next.background;
  if (prev.autoRotate !== next.autoRotate) out.autoRotate = next.autoRotate;
  if (prev.rotateSpeed !== next.rotateSpeed) out.rotateSpeed = next.rotateSpeed;
  if (prev.floorReflection !== next.floorReflection) out.floorReflection = next.floorReflection;
  if (prev.exposure !== next.exposure) out.exposure = next.exposure;
  if (prev.bloom !== next.bloom) out.bloom = next.bloom;
  return out;
}

/**
 * Headless-ish 3D viewer: a canvas bound to a {@link Logo3DEngine}.
 * Controlled entirely by `svg` + `settings` props; imperative actions via ref.
 */
export const Logo3DViewer = forwardRef<Logo3DViewerHandle, Logo3DViewerProps>(function Logo3DViewer(
  { svg, settings, className, style, onError },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Logo3DEngine | null>(null);
  const prevSettings = useRef<Logo3DSettings | null>(null);
  const settingsRef = useRef(settings);
  const svgRef = useRef(svg);
  const onErrorRef = useRef(onError);
  const loadedSvg = useRef<string | null>(null);
  settingsRef.current = settings;
  svgRef.current = svg;
  onErrorRef.current = onError;

  // Create the engine once; tear it down on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Logo3DEngine(canvas, settingsRef.current);
    engineRef.current = engine;
    prevSettings.current = settingsRef.current;

    if (svgRef.current) {
      try {
        engine.setSVG(svgRef.current);
        loadedSvg.current = svgRef.current;
      } catch (e) {
        onErrorRef.current?.(e);
      }
    }

    const parent = canvas.parentElement;
    const ro = new ResizeObserver(() => {
      if (parent) engine.resize(parent.clientWidth, parent.clientHeight);
    });
    if (parent) {
      engine.resize(parent.clientWidth, parent.clientHeight);
      ro.observe(parent);
    }

    return () => {
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to SVG changes (skip the initial value already loaded on mount).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || svg == null || svg === loadedSvg.current) return;
    try {
      engine.setSVG(svg);
      loadedSvg.current = svg;
    } catch (e) {
      onErrorRef.current?.(e);
    }
  }, [svg]);

  // React to settings changes (apply only the diff).
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const diff = diffSettings(prevSettings.current, settings);
    if (Object.keys(diff).length > 0) engine.setSettings(diff);
    prevSettings.current = settings;
  }, [settings]);

  useImperativeHandle(
    ref,
    (): Logo3DViewerHandle => ({
      exportGLB: () =>
        engineRef.current ? engineRef.current.exportGLB() : Promise.reject(new Error('Engine not ready')),
      exportPNG: (opts) => engineRef.current?.exportPNG(opts) ?? '',
      getThumbnail: (size) => engineRef.current?.getThumbnail(size) ?? '',
      resetView: () => engineRef.current?.resetView(),
      getEngine: () => engineRef.current,
    }),
    [],
  );

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
});
