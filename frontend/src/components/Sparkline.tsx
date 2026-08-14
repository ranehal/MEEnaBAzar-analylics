import { useMemo } from 'react';
import type { HistoryPoint } from '../types';
import { PLACEHOLDER_IMG } from '../utils';

interface Props {
  points: HistoryPoint[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}

export default function Sparkline({
  points,
  width = 80,
  height = 24,
  color = 'var(--gold)',
  fill = true,
  strokeWidth = 1.5,
}: Props) {
  const path = useMemo(() => {
    if (!points || points.length < 2) return null;
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const pad = 1.5;
    const coords = points.map(([ts, price]) => {
      const x = pad + ((ts - minX) / spanX) * (width - pad * 2);
      const y = pad + (1 - (price - minY) / spanY) * (height - pad * 2);
      return [x, y] as const;
    });
    const line = coords
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${height} L${coords[0][0].toFixed(1)},${height} Z`;
    return { line, area, last: coords[coords.length - 1] };
  }, [points, width, height]);

  if (!path) {
    return (
      <img src={PLACEHOLDER_IMG} alt="" width={width} height={height}
        style={{ objectFit: 'contain', opacity: 0.35 }} />
    );
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {fill && (
        <path d={path.area} fill={color} opacity={0.14} stroke="none" />
      )}
      <path d={path.line} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={path.last[0]} cy={path.last[1]} r={1.8} fill={color} />
    </svg>
  );
}