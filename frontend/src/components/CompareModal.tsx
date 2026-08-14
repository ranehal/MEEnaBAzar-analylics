import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { HistoryPoint, Product } from '../types';
import { CURRENCY, fmtDate, fmtPrice } from '../utils';

const COLORS = ['#E7B84E', '#46C99A', '#E5673F', '#6FA9C9', '#A78BFA', '#E26E9C', '#14b8a6'];

interface Props {
  products: Product[];
  histories: Map<number, HistoryPoint[]>;
  onClose: () => void;
  onOpen: (p: Product) => void;
}

type RangeKey = '30d' | '90d' | 'all';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: 'all', label: 'ALL', days: 0 },
];

type MergeRow = { ts: number; date: string; [k: string]: number | string };

export default function CompareModal({ products, histories, onClose, onOpen }: Props) {
  const [range, setRange] = useState<RangeKey>('all');

  const merged = useMemo(() => {
    const map = new Map<string, MergeRow>();
    for (const p of products) {
      const hist = histories.get(p.id) ?? [];
      for (const [ts, unit] of hist) {
        const date = fmtDate(ts, 'MMM d');
        const row = map.get(date) ?? { ts, date };
        row[`p_${p.id}`] = unit;
        map.set(date, row);
      }
    }
    const rows = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
    if (range === 'all' || rows.length === 0) return rows;
    const lastTs = rows[rows.length - 1].ts;
    const cutoff = lastTs - RANGES.find((r) => r.key === range)!.days * 86400000;
    return rows.filter((r) => r.ts >= cutoff);
  }, [products, histories, range]);

  const summary = useMemo(
    () =>
      products.map((p) => {
        const hist = histories.get(p.id) ?? [];
        const prices = hist.map(([, u]) => u);
        const cur = prices.length ? prices[prices.length - 1] : p.unit_price;
        const min = prices.length ? Math.min(...prices) : p.unit_price;
        const max = prices.length ? Math.max(...prices) : p.unit_price;
        const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : p.avg_price;
        return { product: p, cur, min, max, avg };
      }),
    [products, histories],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compare-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <header className="modal-head">
          <h2>Compare prices</h2>
          <div className="range-tabs">
            {RANGES.map((r) => (
              <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
        </header>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={merged} margin={{ top: 14, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--dim)" tick={{ fontSize: 11 }} tickMargin={8} />
              <YAxis stroke="var(--dim)" tick={{ fontSize: 11 }} width={56} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--line)', borderRadius: 8 }} />
              <Legend verticalAlign="top" height={30} />
              {products.map((p, idx) => (
                <Line key={p.id} type="monotone" dataKey={`p_${p.id}`} name={`${p.name}`}
                  stroke={COLORS[idx % COLORS.length]} strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="compare-table">
          {summary.map((s, idx) => (
            <button key={s.product.id} className="compare-col" onClick={() => onOpen(s.product)}
              style={{ borderTop: `3px solid ${COLORS[idx % COLORS.length]}` }}>
              <img src={s.product.image_url} alt="" loading="lazy" />
              <span className="compare-name">{s.product.name}</span>
              <div className="compare-price-row">
                <span className="label">Now</span>
                <span className="val">{CURRENCY}{fmtPrice(s.cur)}</span>
              </div>
              <div className="compare-price-row">
                <span className="label">Low</span>
                <span className="val mint">{CURRENCY}{fmtPrice(s.min)}</span>
              </div>
              <div className="compare-price-row">
                <span className="label">Avg</span>
                <span className="val">{CURRENCY}{fmtPrice(s.avg)}</span>
              </div>
              <div className="compare-price-row">
                <span className="label">High</span>
                <span className="val ember">{CURRENCY}{fmtPrice(s.max)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}