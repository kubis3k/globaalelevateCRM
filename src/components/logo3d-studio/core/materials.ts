import { MeshPhysicalMaterial, DoubleSide } from 'three';
import type { MaterialParams, MaterialPresetName } from './types';

export interface MaterialPreset extends MaterialParams {
  /** Human label for UI. */
  label: string;
}

export const MATERIAL_PRESETS: Record<MaterialPresetName, MaterialPreset> = {
  obsidian: { label: 'Obsidián', color: 0x101014, metalness: 0.0, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.85, reflectivity: 0.5 },
  gold:     { label: 'Zlato',    color: 0xffc14d, metalness: 1.0, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.45 },
  chrome:   { label: 'Chrom',    color: 0xf3f6fb, metalness: 1.0, roughness: 0.045, clearcoat: 0, envMapIntensity: 1.55 },
  steel:    { label: 'Ocel',     color: 0xb9c0c8, metalness: 1.0, roughness: 0.34, clearcoat: 0, envMapIntensity: 1.25 },
};

export function makeMaterial(p: MaterialParams): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: p.color,
    metalness: p.metalness,
    roughness: p.roughness,
    clearcoat: p.clearcoat ?? 0,
    clearcoatRoughness: p.clearcoatRoughness ?? 0,
    envMapIntensity: p.envMapIntensity ?? 1,
    reflectivity: p.reflectivity ?? 0.5,
    side: DoubleSide,
  });
}
