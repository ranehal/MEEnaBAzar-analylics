import { useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot, ResponsiveContainer,
} from 'recharts';
import { Bell, Heart, BellRing } from 'lucide-react';
import type { HistoryPoint, PriceKey, Product } from '../types';
import { CURRENCY, fmtChange, fmtDate, fmtPrice } from '../utils';

export type RangeKey = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '6m', label: '6M', days: 182 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'ALL', days: 0 },
];

interface Props {
  product: Product;
  history: HistoryPoint[];
  isFav: boolean;
  watchTarget: number | null;
  onClose: () => void;
  onToggleFav: () => void;
  onSaveAlert: (target: number) => void;
  onRemoveAlert: () => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { date: string; unit_price: number; actual_price: number } }>;
  unitType?: string;
}

function ChartTooltip({ active, payload, unitType }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tip">
      <div className="chart-tip-date">{p.date}</div>
      <div className="chart-tip-row">
        <span>per {unitType}</span>
        <b>{CURRENCY}{fmtPrice(p.unit_price)}</b>
      </div>
      <div className="chart-tip-row">
        <span>pack price</span>
        <b>{CURRENCY}{fmtPrice(p.actual_price)}</b>
      </div>
    </div>
  );
}

export default function ItemModal({
  product, history, isFav, watchTarget, onClose, onToggleFav, onSaveAlert, onRemoveAlert,
}: Props) {
  const [range, setRange] = useState<RangeKey>('all');
  const [priceKey, setPriceKey] = useState<PriceKey>('unit_price');
  const [alertInput, setAlertInput] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const filtered = useMemo(() => {
    if (range === 'all' || history.length === 0) return history;
    const days = RANGES.find((r) => r.key === range)?.days ?? 0;
    const lastTs = history[history.length - 1][0];
    const cutoff = lastTs - days * 86400000;
    return history.filter(([ts]) => ts >= cutoff);
  }, [history, range]);

  const chartData = useMemo(
    () => filtered.map(([ts, unit, actual]) => ({
      ts,
      date: fmtDate(ts, 'MMM d'),
      unit_price: unit,
      actual_price: actual,
    })),
    [filtered],
  );

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const prices = filtered.map(([, u]) => u);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const current = prices[prices.length - 1];
    const prev = prices.length > 1 ? prices[prices.length - 2] : current;
    const change = prev ? ((current - prev) / prev) * 100 : 0;

    let suggestion = 'HOLDING';
    let sugClass = 'flat';
    if (current <= min) { suggestion = 'ALL TIME LOW'; sugClass = 'great'; }
    else if (current > avg * 1.1) { suggestion = 'WAIT FOR DROP'; sugClass = 'wait'; }
    else if (current < avg * 0.95) { suggestion = 'GREAT DEAL'; sugClass = 'great'; }
    else { suggestion = 'AVERAGE PRICE'; sugClass = 'flat'; }

    return { min, max, avg, current, change, suggestion, sugClass };
  }, [filtered]);

  const lowPoint = useMemo(() => {
    if (!chartData.length) return null;
    let low = chartData[0];
    for (const d of chartData) if (d.unit_price < low.unit_price) low = d;
    return low;
  }, [chartData]);

  const dataKey = priceKey === 'unit_price' ? 'unit_price' : 'actual_price';
  const stroke = priceKey === 'unit_price' ? 'var(--gold)' : 'var(--slate)';
  const label = priceKey === 'unit_price' ? `Per ${product.unit_type}` : 'Pack price';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content item-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <header className="item-head">
          <div className="item-thumb">
            <img src={product.image_url} alt={product.name} />
          </div>
          <div className="item-head-info">
            <h2>{product.name}</h2>
            <p className="item-sub">Pack {product.unit} · tracked per {product.unit_type}</p>
            <div className="item-actions">
              <button className={`icon-btn ${isFav ? 'on' : ''}`} onClick={onToggleFav} title="Favorite">
                <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
                {isFav ? 'Favorited' : 'Favorite'}
              </button>
              {watchTarget !== null ? (
                <button className="icon-btn alert-on" onClick={onRemoveAlert} title="Remove alert">
                  <BellRing size={15} />
                  Alert at {CURRENCY}{fmtPrice(watchTarget)}
                </button>
              ) : (
                <button className="icon-btn" onClick={() => setShowAlert((s) => !s)} title="Set price alert">
                  <Bell size={15} />
                  Set alert
                </button>
              )}
            </div>
            {showAlert && watchTarget === null && (
              <form
                className="alert-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = parseFloat(alertInput);
                  if (isFinite(v) && v > 0) { onSaveAlert(v); setAlertInput(''); setShowAlert(false); }
                }}
              >
                <input
                  type="number" step="0.01" min="0" placeholder={`target per ${product.unit_type} (${CURRENCY})`}
                  value={alertInput} onChange={(e) => setAlertInput(e.target.value)} autoFocus
                />
                <button type="submit">Save</button>
              </form>
            )}
          </div>
          <div className="item-price-block">
            <div className="item-price">
              {CURRENCY}{fmtPrice(stats?.current ?? product.unit_price)}
              <span className="item-price-unit">/{product.unit_type}</span>
            </div>
            <div className={`suggestion-pill ${stats?.sugClass}`}>{stats?.suggestion}</div>
            <div className={`item-change ${(stats?.change ?? 0) <= 0 ? 'down' : 'up'}`}>
              {fmtChange(stats?.change ?? 0)} this period
            </div>
          </div>
        </header>

        <div className="chart-toolbar">
          <div className="range-tabs">
            {RANGES.map((r) => (
              <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="price-tabs">
            <button className={priceKey === 'unit_price' ? 'active' : ''} onClick={() => setPriceKey('unit_price')}>
              Per {product.unit_type}
            </button>
            <button className={priceKey === 'actual_price' ? 'active' : ''} onClick={() => setPriceKey('actual_price')}>
              Pack price
            </button>
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 14, right: 18, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="steamFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--dim)" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} tickMargin={8} minTickGap={28} />
              <YAxis stroke="var(--dim)" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} width={56}
                tickFormatter={(v: number) => `${v}`} domain={['auto', 'auto']} />
              <Tooltip content={<ChartTooltip unitType={product.unit_type} />} cursor={{ stroke: 'var(--dim)', strokeDasharray: '3 3' }} />
              {stats && (
                <ReferenceLine y={stats.avg} stroke="var(--dim)" strokeDasharray="4 4" label={{ value: 'avg', position: 'insideTopRight', fill: 'var(--dim)', fontSize: 11 }} />
              )}
              {lowPoint && range !== 'all' && (
                <>
                  <ReferenceLine y={lowPoint.unit_price} stroke="var(--mint)" strokeDasharray="4 4" label={{ value: 'low', position: 'insideBottomLeft', fill: 'var(--mint)', fontSize: 11 }} />
                  <ReferenceDot x={lowPoint.date} y={lowPoint.unit_price} r={4} fill="var(--mint)" stroke="var(--ink)" strokeWidth={2} />
                </>
              )}
              <Area type="monotone" dataKey={dataKey} name={label} stroke={stroke} strokeWidth={2.5}
                fill="url(#steamFill)" activeDot={{ r: 5 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-box">
              <span className="label">Current</span>
              <span className="value">{CURRENCY}{fmtPrice(stats.current)}</span>
            </div>
            <div className="stat-box">
              <span className="label">Period Low</span>
              <span className="value mint">{CURRENCY}{fmtPrice(stats.min)}</span>
            </div>
            <div className="stat-box">
              <span className="label">Average</span>
              <span className="value">{CURRENCY}{fmtPrice(stats.avg)}</span>
            </div>
            <div className="stat-box">
              <span className="label">Period High</span>
              <span className="value ember">{CURRENCY}{fmtPrice(stats.max)}</span>
            </div>
            <div className="stat-box">
              <span className="label">Period change</span>
              <span className={`value ${stats.change <= 0 ? 'mint' : 'ember'}`}>{fmtChange(stats.change)}</span>
            </div>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="hist-table-wrap">
            <table className="hist-table">
              <thead>
                <tr><th>Date</th><th>Per {product.unit_type}</th><th>Pack price</th><th>Δ</th></tr>
              </thead>
              <tbody>
                {chartData.slice(-10).reverse().map((d, i) => {
                  const prev = chartData[chartData.length - 1 - i - 1];
                  const delta = prev ? ((d.unit_price - prev.unit_price) / prev.unit_price) * 100 : 0;
                  return (
                    <tr key={d.ts}>
                      <td>{fmtDate(d.ts, 'MMM d, yyyy')}</td>
                      <td>{CURRENCY}{fmtPrice(d.unit_price)}</td>
                      <td>{CURRENCY}{fmtPrice(d.actual_price)}</td>
                      <td className={delta <= 0 ? 'mint' : 'ember'}>{delta === 0 ? '—' : fmtChange(delta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}