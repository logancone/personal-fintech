import { useState } from 'react';
import type { Bucket } from './range.ts';
import { compact, usd } from './data';

const W = 860, H = 300, L = 48, R = 8, T = 14, B = 28;

function niceMax(v: number) {
  const p = Math.pow(10, Math.floor(Math.log10(v || 1)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function CashFlowChart({ buckets }: { buckets: Bucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = buckets.length;
  const max = niceMax(Math.max(...buckets.flatMap(b => [b.in, b.out]), 1));
  const iw = W - L - R, ih = H - T - B, gw = iw / n, bw = Math.min(24, gw * 0.36);
  const y = (v: number) => T + ih - (v / max) * ih;
  const step = Math.ceil(n / 8);
  const hb = hover !== null ? buckets[hover] : null;

  return (
    <div className="chart">
      <div className="readout" aria-live="polite">
        {hb ? (
          <>
            <strong>{hb.full}</strong>
            <span className="in">In {usd(hb.in)}</span>
            <span className="out">Out {usd(hb.out)}</span>
            <span>Net {hb.in - hb.out >= 0 ? '+' : '−'}{usd(Math.abs(hb.in - hb.out))}</span>
          </>
        ) : (
          <span>Point at a bar to see that period</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Money in and money out over time" onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(f * max)} y2={y(f * max)} className="grid" />
            <text x={L - 8} y={y(f * max) + 4} textAnchor="end" className="tick">{compact(f * max)}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const cx = L + gw * i + gw / 2;
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={L + gw * i} y={T} width={gw} height={ih + B} className={hover === i ? 'col on' : 'col'} />
              {b.in > 0.5 && <rect x={cx - bw - 1} y={y(b.in)} width={bw} height={T + ih - y(b.in)} rx={3} className="bar-in" />}
              {b.out > 0.5 && <rect x={cx + 1} y={y(b.out)} width={bw} height={T + ih - y(b.out)} rx={3} className="bar-out" />}
              {i % step === 0 && <text x={cx} y={H - 8} textAnchor="middle" className="tick">{b.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Donut({ data, total }: { data: { name: string; value: number; color: string }[]; total: number }) {
  const r = 64, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 180 180" className="donut" role="img" aria-label="Spending by category">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
      {data.map(d => {
        const len = Math.max((d.value / total) * C - 2, 0);
        const el = (
          <circle key={d.name} cx="90" cy="90" r={r} fill="none" stroke={d.color} strokeWidth="18"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 90 90)" />
        );
        acc += (d.value / total) * C;
        return el;
      })}
      <text x="90" y="86" textAnchor="middle" className="donut-n">{usd(total)}</text>
      <text x="90" y="106" textAnchor="middle" className="donut-l">spent</text>
    </svg>
  );
}