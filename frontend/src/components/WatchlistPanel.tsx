import type { Product, WatchItem } from '../types';
import { CURRENCY, fmtPrice } from '../utils';

interface Props {
  watch: WatchItem[];
  products: Product[];
  onRemove: (id: number) => void;
  onSelect: (p: Product) => void;
  onClose: () => void;
}

export default function WatchlistPanel({ watch, products, onRemove, onSelect, onClose }: Props) {
  const byId = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="watch-overlay" onClick={onClose}>
      <aside className="watch-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="watch-head">
          <h3>Price Alerts</h3>
          <button className="watch-close" onClick={onClose} aria-label="Close">✕</button>
        </header>
        <p className="watch-desc">
          Set a target per-unit price. When the tracked price drops to it, the item lights up.
        </p>
        {watch.length === 0 && (
          <div className="watch-empty">
            No alerts yet. Open any item and choose “Set alert”.
          </div>
        )}
        <div className="watch-list">
          {watch.map((w) => {
            const p = byId.get(w.productId);
            if (!p) return null;
            const hit = p.unit_price <= w.targetPrice;
            const diff = ((p.unit_price - w.targetPrice) / w.targetPrice) * 100;
            return (
              <div className={`watch-item ${hit ? 'hit' : ''}`} key={w.productId}>
                <button className="watch-item-main" onClick={() => onSelect(p)}>
                  <img src={p.image_url} alt="" loading="lazy" />
                  <div className="watch-item-info">
                    <span className="watch-item-name">{p.name}</span>
                    <span className="watch-item-price">
                      now {CURRENCY}{fmtPrice(p.unit_price)} vs target {CURRENCY}{fmtPrice(w.targetPrice)}
                    </span>
                  </div>
                  <span className="watch-item-diff">{diff <= 0 ? 'TARGET HIT' : `${diff.toFixed(0)}% to go`}</span>
                </button>
                <button className="watch-item-remove" onClick={() => onRemove(w.productId)} aria-label="Remove alert">✕</button>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}