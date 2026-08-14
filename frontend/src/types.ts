export interface Category {
  id: number;
  name: string;
  url?: string | null;
  is_custom?: boolean;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  unit: string;
  unit_type: string;
  image_url: string;
  is_favorite?: boolean;
  actual_price: number;
  unit_price: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  change: number;
  history?: HistoryPoint[];
}

/** [timestamp_ms, unit_price, actual_price] — compact static-snapshot format */
export type HistoryPoint = [number, number, number];

export interface Dataset {
  mode: 'live' | 'static';
  generated_at?: string;
  categories: Category[];
  category_counts: Record<string, number>;
  products: Product[];
}

export interface WatchItem {
  productId: number;
  targetPrice: number;
  addedAt: number;
}

export type Density = 'comfortable' | 'compact' | 'dense';

export type PriceKey = 'unit_price' | 'actual_price';