import type { HistoryItem } from '../core/types';
import type { HistoryStore } from './types';

const DEFAULT_KEY = 'logo3d.history.v1';

/** Default history store — persists to the browser's localStorage. */
export class LocalStorageHistoryStore implements HistoryStore {
  constructor(private key: string = DEFAULT_KEY) {}

  private read(): HistoryItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  }

  private write(items: HistoryItem[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(items));
  }

  async list(): Promise<HistoryItem[]> {
    return this.read().sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async get(id: string): Promise<HistoryItem | null> {
    return this.read().find((i) => i.id === id) ?? null;
  }

  async save(item: HistoryItem): Promise<void> {
    const items = this.read();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    this.write(items);
  }

  async remove(id: string): Promise<void> {
    this.write(this.read().filter((i) => i.id !== id));
  }

  async clear(): Promise<void> {
    this.write([]);
  }
}
