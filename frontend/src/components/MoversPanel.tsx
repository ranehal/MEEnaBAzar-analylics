import { useMemo } from 'react';
import type { Product } from '../types';
import { CURRENCY, fmtChange, fmtPrice } from '../utils';

interface Props {
  products: Product[];
  onSelect: (p: Product) => void;
}

function MoverRow({ p, onSelect }: { p: Product; onSelect: (p: Product) => void }) {
  return (
    <button className="mover-row" onClick={() => onSelect(p)}>
      <img src={p.image_url} alt="" loading="lazy" />
      <span className="mover-name">{p.name}</span>
      <span className="mover-price">
        {CURRENCY}{fmtPrice(p.unit_price)}
        <em>/ {p.unit_type}</em>
      </span>
      <span className={`mover-change ${p.change <= 0 ? 'down' : 'up'}`}>
        {fmtChange(p.change)}
      </span>
    </button>
  );
}

export default function MoversPanel({ products, onSelect }: Props) {
  const { drops, gains } = useMemo(() => {
    const scored = products
      .filter((p) => p.change !== 0 && isFinite(p.change))
      .sort((a, b) => a.change - b.change);
    return {
      drops: scored.slice(0, 6),
      gains: [...scored].reverse().slice(0, 6),
    };
  }, [products]);

  return (
    <section className="panel movers-panel">
      <header className="panel-head">
        <h3>Market Movers</h3>
        <span className="panel-hint">biggest changes today</span>
      </header>
      <div className="movers-grid">
        <div className="movers-col">
          <div className="movers-col-title down">Savers · price dropped</div>
          {drops.map((p) => <MoverRow key={p.id} p={p} onSelect={onSelect} />)}
        </div>
        <div className="movers-col">
          <div className="movers-col-title up">Pricier · price rose</div>
          {gains.map((p) => <MoverRow key={p.id} p={p} onSelect={onSelect} />)}
        </div>
      </div>
    </section>
  );
}