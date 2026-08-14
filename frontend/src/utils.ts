import { format } from 'date-fns';
import type { Density, WatchItem } from './types';

export const CURRENCY = '৳';

export const fmtPrice = (n: number): string => {
  if (!isFinite(n)) return '—';
  return n >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toFixed(2);
};

export const fmtChange = (n: number): string =>
  `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

export const fmtDate = (ts: number, pattern = 'MMM d, yyyy'): string =>
  format(new Date(ts), pattern);

export const fmtShortDate = (ts: number): string =>
  format(new Date(ts), 'MMM d');

export const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#141a16"/><text x="50" y="50" font-family="Arial" font-size="10" fill="#4a534a" text-anchor="middle" dominant-baseline="middle">MEENA</text></svg>`,
  );

/* ---------------- localStorage helpers ---------------- */

const LS_KEYS = {
  favs: 'meena_favs',
  watch: 'meena_watchlist',
  density: 'meena_density',
  compare: 'meena_compare',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export const loadFavs = (): number[] => read<number[]>(LS_KEYS.favs, []);
export const saveFavs = (favs: number[]) => write(LS_KEYS.favs, favs);

export const loadWatch = (): WatchItem[] => read<WatchItem[]>(LS_KEYS.watch, []);
export const saveWatch = (watch: WatchItem[]) => write(LS_KEYS.watch, watch);

export const loadDensity = (): Density => read<Density>(LS_KEYS.density, 'compact');
export const saveDensity = (d: Density) => write(LS_KEYS.density, d);

export const loadCompare = (): number[] => read<number[]>(LS_KEYS.compare, []);
export const saveCompare = (ids: number[]) => write(LS_KEYS.compare, ids);