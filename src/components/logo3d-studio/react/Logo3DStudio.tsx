import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Logo3DViewer, type Logo3DViewerHandle } from './Logo3DViewer';
import {
  DEFAULT_SETTINGS,
  type BackgroundSetting,
  type GraphicSourceType,
  type HistoryItem,
  type Logo3DSettings,
  type MaterialPresetName,
} from '../core/types';
import { MATERIAL_PRESETS } from '../core/materials';
import { fileToSvg } from '../core/vectorize';
import { LocalStorageHistoryStore } from '../store/LocalStorageHistoryStore';
import type { HistoryStore } from '../store/types';
import './styles.css';

export interface Logo3DStudioProps {
  /** Persistence adapter. Defaults to browser localStorage. */
  store?: HistoryStore;
  /** Optional SVG to load on first mount. */
  initialSvg?: string;
  initialName?: string;
  initialSettings?: Partial<Logo3DSettings>;
  /** Auto-persist the current graphic + edits to the store. Default true. */
  autoSave?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Optional: persist the current render (PNG data URL) somewhere, e.g. Documents. */
  onSaveToDocuments?: (dataUrl: string, name: string) => Promise<void> | void;
}

const BACKGROUNDS: { id: BackgroundSetting; label: string; css: string }[] = [
  { id: 'studio', label: 'Studio', css: 'radial-gradient(circle at 50% 35%, #1c2230, #05060a)' },
  { id: '#0b0d12', label: 'Tmavá', css: '#0b0d12' },
  { id: '#eef1f5', label: 'Světlá', css: '#eef1f5' },
  { id: '#0a2540', label: 'Modrá', css: '#0a2540' },
  {
    id: 'transparent',
    label: 'Průhledná',
    css: 'repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%) 50% / 12px 12px',
  },
];

const ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,.svg,.png,.jpg,.jpeg,.webp';

function genId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(name: string): string {
  return name.trim().replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'logo-3d';
}

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

export function Logo3DStudio(props: Logo3DStudioProps) {
  const { initialSvg, initialName = 'Logo', initialSettings, autoSave = true, className, style, onSaveToDocuments } = props;
  const store = useMemo<HistoryStore>(() => props.store ?? new LocalStorageHistoryStore(), [props.store]);

  const [settings, setSettings] = useState<Logo3DSettings>({ ...DEFAULT_SETTINGS, ...initialSettings });
  const [svg, setSvg] = useState<string | null>(initialSvg ?? null);
  const [sourceType, setSourceType] = useState<GraphicSourceType>('svg');
  const [name, setName] = useState<string>(initialName);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);

  const viewerRef = useRef<Logo3DViewerHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    setHistory(await store.list());
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Give the current graphic an id the first time the user actually edits or
  // names it. The initial demo (initialSvg) is NOT persisted until then, so it
  // never spams history on reload. Uploads / loads set their own id.
  const ensureId = useCallback(() => {
    setCurrentId((id) => id ?? genId());
  }, []);

  const update = useCallback(
    <K extends keyof Logo3DSettings>(key: K, value: Logo3DSettings[K]) => {
      setSettings((s) => ({ ...s, [key]: value }));
      ensureId();
    },
    [ensureId],
  );

  // Debounced auto-save of the current graphic + its settings.
  useEffect(() => {
    if (!autoSave || !currentId || svg == null) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const thumbnail = viewerRef.current?.getThumbnail(256) ?? '';
      void (async () => {
        const prev = await store.get(currentId);
        const now = Date.now();
        const item: HistoryItem = {
          id: currentId,
          name,
          createdAt: prev?.createdAt ?? now,
          updatedAt: now,
          sourceType,
          svg,
          thumbnail: thumbnail || prev?.thumbnail || '',
          settings,
        };
        await store.save(item);
        await refresh();
      })();
    }, 700);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [svg, settings, name, currentId, sourceType, autoSave, store, refresh]);

  const ingestFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const { svg: out, sourceType: st } = await fileToSvg(file);
      setSvg(out);
      setSourceType(st);
      setName(file.name.replace(/\.[^.]+$/, '') || 'Grafika');
      setCurrentId(genId());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void ingestFile(file);
    },
    [ingestFile],
  );

  const loadItem = useCallback((item: HistoryItem) => {
    setSvg(item.svg);
    setSourceType(item.sourceType);
    setName(item.name);
    setSettings(item.settings);
    setCurrentId(item.id);
  }, []);

  const deleteItem = useCallback(
    async (e: ReactMouseEvent, id: string) => {
      e.stopPropagation();
      await store.remove(id);
      if (id === currentId) setCurrentId(null);
      await refresh();
    },
    [store, currentId, refresh],
  );

  const exportGLB = useCallback(async () => {
    try {
      const blob = await viewerRef.current?.exportGLB();
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${sanitize(name)}.glb`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [name]);

  const exportPNG = useCallback(() => {
    const url = viewerRef.current?.exportPNG({ scale: 2 });
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitize(name)}.png`;
    a.click();
  }, [name]);

  const saveToDocuments = useCallback(async () => {
    if (!onSaveToDocuments) return;
    const url = viewerRef.current?.exportPNG({ scale: 2 });
    if (!url) return;
    setSavingDoc(true);
    try {
      await onSaveToDocuments(url, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDoc(false);
    }
  }, [onSaveToDocuments, name]);

  return (
    <div className={`l3d${className ? ` ${className}` : ''}`} style={style}>
      {/* Sidebar */}
      <aside className="l3d-sidebar">
        <div className="l3d-brand">
          <h2>3D&nbsp;STUDIO</h2>
          <p>LOGA &amp; GRAFIKY</p>
        </div>

        <div
          className={`l3d-drop${dragging ? ' drag' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div>
            <strong>Nahrát grafiku</strong>
          </div>
          <div style={{ marginTop: 4 }}>PNG / JPG / SVG — přetáhni sem nebo klikni</div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ingestFile(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="l3d-history">
          <div className="l3d-history-label">Historie</div>
          {history.length === 0 ? (
            <div className="l3d-empty">Zatím prázdné. Nahraj logo nebo grafiku a uloží se sem automaticky.</div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className={`l3d-item${item.id === currentId ? ' active' : ''}`}
                onClick={() => loadItem(item)}
              >
                {item.thumbnail ? (
                  <img className="l3d-thumb" src={item.thumbnail} alt={item.name} />
                ) : (
                  <div className="l3d-thumb" />
                )}
                <div className="l3d-item-meta">
                  <div className="l3d-item-name">{item.name}</div>
                  <div className="l3d-item-date">{fmtDate(item.updatedAt)}</div>
                </div>
                <button className="l3d-del" title="Smazat" onClick={(e) => void deleteItem(e, item.id)}>
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main viewport */}
      <div className="l3d-main">
        <Logo3DViewer
          ref={viewerRef}
          className="l3d-viewer"
          svg={svg}
          settings={settings}
          onError={(e) => setError(e instanceof Error ? e.message : String(e))}
        />

        {/* Controls */}
        <div className="l3d-controls">
          <div className="l3d-group">
            <div className="l3d-glabel">Materiál</div>
            <div className="l3d-row">
              {(Object.keys(MATERIAL_PRESETS) as MaterialPresetName[]).map((key) => (
                <div
                  key={key}
                  className={`l3d-chip${settings.material === key ? ' active' : ''}`}
                  onClick={() => update('material', key)}
                >
                  {MATERIAL_PRESETS[key].label}
                </div>
              ))}
            </div>
          </div>

          <div className="l3d-group">
            <div className="l3d-glabel">
              <span>Hloubka</span>
              <span>{Math.round(settings.depth * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.05}
              max={0.6}
              step={0.01}
              value={settings.depth}
              onChange={(e) => update('depth', parseFloat(e.target.value))}
            />
          </div>

          <div className="l3d-group">
            <div className="l3d-glabel">
              <span>Zkosení hran</span>
              <span>{Math.round(settings.bevel * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.12}
              step={0.005}
              value={settings.bevel}
              onChange={(e) => update('bevel', parseFloat(e.target.value))}
            />
          </div>

          <div className="l3d-group">
            <div className="l3d-glabel">Pozadí</div>
            <div className="l3d-row">
              {BACKGROUNDS.map((bg) => (
                <div
                  key={bg.id}
                  title={bg.label}
                  className={`l3d-swatch${settings.background === bg.id ? ' active' : ''}`}
                  style={{ background: bg.css }}
                  onClick={() => update('background', bg.id)}
                />
              ))}
            </div>
          </div>

          <div className="l3d-group">
            <div className={`l3d-toggle${settings.autoRotate ? ' on' : ''}`} onClick={() => update('autoRotate', !settings.autoRotate)}>
              <span>Auto-otáčení</span>
              <span className="l3d-dot" />
            </div>
            <div className={`l3d-toggle${settings.floorReflection ? ' on' : ''}`} onClick={() => update('floorReflection', !settings.floorReflection)}>
              <span>Odraz na podlaze</span>
              <span className="l3d-dot" />
            </div>
          </div>

          <div className="l3d-group">
            <div className="l3d-glabel">
              <span>Lesk / Bloom</span>
              <span>{Math.round(settings.bloom * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.01}
              value={settings.bloom}
              onChange={(e) => update('bloom', parseFloat(e.target.value))}
            />
          </div>

          <div className="l3d-group l3d-row">
            <button className="l3d-btn" style={{ flex: 2 }} onClick={() => void exportGLB()}>
              ⬇ .glb
            </button>
            <button className="l3d-btn" style={{ flex: 1 }} onClick={exportPNG}>
              PNG
            </button>
          </div>

          {onSaveToDocuments && (
            <div className="l3d-group">
              <button className="l3d-btn" style={{ width: '100%' }} onClick={() => void saveToDocuments()} disabled={savingDoc}>
                {savingDoc ? 'Ukládám…' : '💾 Uložit do Dokumentů'}
              </button>
            </div>
          )}
        </div>

        {/* Top bar: name + reset */}
        <div className="l3d-topbar">
          <input
            className="l3d-nameinput"
            value={name}
            placeholder="Název grafiky"
            onChange={(e) => {
              setName(e.target.value);
              ensureId();
            }}
          />
          <button className="l3d-btn ghost" onClick={() => viewerRef.current?.resetView()}>
            Reset
          </button>
        </div>

        {svg == null && <div className="l3d-hint">Nahraj logo vlevo a uvidíš ho ve 3D.</div>}
        {busy && <div className="l3d-busy">Zpracovávám grafiku…</div>}
        {error && (
          <div className="l3d-error" onClick={() => setError(null)}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
