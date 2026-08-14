import type { Dataset, HistoryPoint, Product } from './types';

interface HistoryRow {
  scraped_at: string;
  unit_price: number;
  actual_price: number;
}

const importMeta = import.meta as { env?: Record<string, string | undefined> };

export const API_BASE: string =
  importMeta.env?.VITE_API_BASE ?? 'http://localhost:8000';

const STATIC_DATA_URL = 'data/meenatracker.json';

let datasetPromise: Promise<Dataset> | null = null;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getDataset(): Promise<Dataset> {
  if (datasetPromise) return datasetPromise;

  const load = async (): Promise<Dataset> => {
    try {
      const catRes = await fetchWithTimeout(`${API_BASE}/categories`, 1200);
      if (!catRes.ok) throw new Error('live api unavailable');
      const categories = await catRes.json();

      const prodRes = await fetchWithTimeout(`${API_BASE}/products`, 5000);
      if (!prodRes.ok) throw new Error('live api unavailable');
      const products = await prodRes.json();

      return { mode: 'live', categories, category_counts: {}, products };
    } catch {
      const snapRes = await fetch(STATIC_DATA_URL);
      if (!snapRes.ok) throw new Error('static snapshot missing');
      const snap = await snapRes.json();
      return {
        mode: 'static',
        generated_at: snap.generated_at,
        categories: snap.categories,
        category_counts: snap.category_counts ?? {},
        products: snap.products,
      };
    }
  };

  datasetPromise = load().catch((err) => {
    datasetPromise = null;
    throw err;
  });

  return datasetPromise;
}

export async function getProductHistory(
  id: number,
  dataset: Dataset,
  product?: Product,
): Promise<HistoryPoint[]> {
  if (dataset.mode === 'static') return product?.history ?? [];
  const res = await fetch(`${API_BASE}/products/${id}/history`);
  if (!res.ok) return [];
  const data = (await res.json()) as HistoryRow[];
  return data
    .map((d) => [
      new Date(d.scraped_at).getTime(),
      Number(d.unit_price),
      Number(d.actual_price),
    ] as HistoryPoint)
    .filter((p: HistoryPoint) => p[0] > 0);
}

export async function toggleFavoriteApi(id: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/products/${id}/favorite`, { method: 'POST' });
  } catch {
    /* static mode — favorites are local-only */
  }
}