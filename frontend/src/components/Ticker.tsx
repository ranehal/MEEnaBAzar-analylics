import { useMemo } from 'react';
import type { Product } from '../types';
import { CURRENCY, fmtChange, fmtPrice } from '../utils';

interface Props {
  products: Product[];
}

export default function Ticker({ products }: Props) {
  const items = useMemo(() => {
    const withHistory = products.filter((p) => (p.history?.length ?? 0) >= 2);
    const pool = withHistory.length > 0 ? withHistory : products;
    const sorted = [...pool].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const top = sorted.slice(0, 14);
    return top.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.unit_price,
      unit: p.unit_type,
      change: p.change,
    }));
  }, [products]);

  const tape = items
    .map(
      (it) =>
        `${it.name}  ${CURRENCY}${fmtPrice(it.price)}/${it.unit}  ${fmtChange(it.change)}`,
    )
    .join('   •   ');

  if (!tape) return null;

  return (
    <div className="ticker" role="marquee" aria-label="Live price ticker">
      <div className="ticker-label">
        <span className="live-dot" />
        LIVE TAPE
      </div>
      <div className="ticker-viewport">
        <div className="ticker-track">
          <span className="ticker-text">{tape}&nbsp;•&nbsp;</span>
          <span className="ticker-text" aria-hidden="true">{tape}&nbsp;•&nbsp;</span>
        </div>
      </div>
    </div>
  );
}