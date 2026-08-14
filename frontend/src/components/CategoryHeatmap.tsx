import { useMemo } from 'react';
import type { Category, Product } from '../types';
import { fmtChange } from '../utils';

interface Props {
  categories: Category[];
  products: Product[];
  selected: Set<number>;
  onToggle: (id: number) => void;
}

export default function CategoryHeatmap({ categories, products, selected, onToggle }: Props) {
  const stats = useMemo(() => {
    const map = new Map<number, { count: number; change: number }>();
    for (const p of products) {
      const cur = map.get(p.category_id) ?? { count: 0, change: 0 };
      cur.count += 1;
      cur.change += isFinite(p.change) ? p.change : 0;
      map.set(p.category_id, cur);
    }
    return map;
  }, [products]);

  return (
    <section className="panel heatmap-panel">
      <header className="panel-head">
        <h3>Category Health</h3>
        <span className="panel-hint">avg price move per category</span>
      </header>
      <div className="heatmap-grid">
        {categories.map((c) => {
          const s = stats.get(c.id);
          if (!s || s.count === 0) return null;
          const avg = s.change / s.count;
          const active = selected.has(c.id);
          const cls = avg < -0.5 ? 'cool' : avg > 0.5 ? 'hot' : 'flat';
          return (
            <button
              key={c.id}
              className={`heat-cell ${cls} ${active ? 'active' : ''}`}
              onClick={() => onToggle(c.id)}
              title={`${c.name}: avg ${fmtChange(avg)} across ${s.count} items`}
            >
              <span className="heat-name">{c.name}</span>
              <span className="heat-value">{fmtChange(avg)}</span>
              <span className="heat-count">{s.count} items</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}