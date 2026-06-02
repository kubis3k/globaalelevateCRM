// Shared types for the Logo3D Studio module.

export type MaterialPresetName = 'obsidian' | 'gold' | 'chrome' | 'steel';

/** Subset of MeshPhysicalMaterial params used by presets. */
export interface MaterialParams {
  color: number;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  envMapIntensity?: number;
  reflectivity?: number;
}

/**
 * Background can be:
 *  - 'studio'      → soft radial studio gradient (default)
 *  - 'transparent' → no background (alpha; useful for PNG export over your UI)
 *  - any CSS hex   → solid color, e.g. '#0b0d12'
 */
export type BackgroundSetting = 'studio' | 'transparent' | (string & {});

/** All user-editable parameters of a 3D graphic. Fully serializable. */
export interface Logo3DSettings {
  material: MaterialPresetName;
  /** Extrusion thickness as a fraction of the graphic's planar size (0..1). */
  depth: number;
  /** Bevel size as a fraction of the graphic's planar size (0..1). */
  bevel: number;
  background: BackgroundSetting;
  autoRotate: boolean;
  /** Auto-rotation speed (0..3). */
  rotateSpeed: number;
  floorReflection: boolean;
  /** Tone-mapping exposure (0.5..1.5). */
  exposure: number;
  /** Bloom strength (0..1). */
  bloom: number;
}

export const DEFAULT_SETTINGS: Logo3DSettings = {
  material: 'obsidian',
  depth: 0.22,
  bevel: 0.05,
  background: 'studio',
  autoRotate: true,
  rotateSpeed: 0.85,
  floorReflection: false,
  exposure: 0.95,
  bloom: 0.18,
};

export type GraphicSourceType = 'svg' | 'raster';

/** A saved 3D graphic in the history. Fully serializable (safe for localStorage / JSON API). */
export interface HistoryItem {
  id: string;
  name: string;
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms of last edit. */
  updatedAt: number;
  /** Where the graphic came from. */
  sourceType: GraphicSourceType;
  originalFileName?: string;
  /** The (vectorized) SVG markup used to build the 3D mesh. */
  svg: string;
  /** Small PNG preview as a data URL. */
  thumbnail: string;
  settings: Logo3DSettings;
}
