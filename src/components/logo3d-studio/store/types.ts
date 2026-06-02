import type { HistoryItem } from '../core/types';

/**
 * Persistence adapter for the 3D-graphics history.
 *
 * The default implementation ({@link LocalStorageHistoryStore}) keeps everything
 * in the browser. To persist to your own backend, implement this interface
 * (e.g. call your REST API or Supabase/Firebase) and pass it to <Logo3DStudio store={...} />.
 */
export interface HistoryStore {
  /** All items, newest first. */
  list(): Promise<HistoryItem[]>;
  get(id: string): Promise<HistoryItem | null>;
  /** Insert or update by id. */
  save(item: HistoryItem): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}
