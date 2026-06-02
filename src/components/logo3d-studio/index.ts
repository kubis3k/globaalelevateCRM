// Public API of the Logo3D Studio module.

// Core (framework-agnostic)
export { Logo3DEngine } from './core/Logo3DEngine';
export type { ExportPNGOptions } from './core/Logo3DEngine';
export { MATERIAL_PRESETS, makeMaterial } from './core/materials';
export type { MaterialPreset } from './core/materials';
export {
  fileToSvg,
  rasterToSvg,
  readSvgFile,
  isSvgFile,
} from './core/vectorize';
export type { VectorizeOptions, VectorizeResult, RasterSource } from './core/vectorize';
export {
  DEFAULT_SETTINGS,
} from './core/types';
export type {
  Logo3DSettings,
  MaterialPresetName,
  MaterialParams,
  BackgroundSetting,
  GraphicSourceType,
  HistoryItem,
} from './core/types';

// Store
export { LocalStorageHistoryStore } from './store/LocalStorageHistoryStore';
export type { HistoryStore } from './store/types';

// React
export { Logo3DViewer } from './react/Logo3DViewer';
export type { Logo3DViewerHandle, Logo3DViewerProps } from './react/Logo3DViewer';
export { Logo3DStudio } from './react/Logo3DStudio';
export type { Logo3DStudioProps } from './react/Logo3DStudio';
