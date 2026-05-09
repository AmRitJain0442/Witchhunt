// Minimalistic data-viz primitives for the dashboard.
// SparkLine, AdherenceRing, DayRhythm — kolam-tinted, no axes.

'use client';

import { useId, type ReactNode } from 'react';

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- */
/* SparkLine — smooth curve with optional area fill                 */
/* --------------------------------------------------------------- */
export function SparkLine({
  data,
  width = 320,
  height = 88,
  color = 'var(--gold)',
  fill = true,
  showDots = true,
  thickness = 1.6,
  className = '',
  pad = 6,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  showDots?: boolean;
  thickness?: number;
  className?: string;
  pad?: number;
}) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!data?.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  // smooth cubic-bezier path
  const d: string[] = [];
  d.push(`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`);
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const tension = 0.35;
    const cp1x = x0 + stepX * tension;
    const cp1y = y0;
    const cp2x = x1 - stepX * tension;
    const cp2y = y1;
    d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`);
  }
  const linePath = d.join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1][0].toFixed(2)} ${(height - pad).toFixed(2)} L ${points[0][0].toFixed(2)} ${(height - pad).toFixed(2)} Z`;

  const gradId = `sl-${reactId}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots &&
        points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === points.length - 1 ? 3 : 1.6}
            fill={i === points.length - 1 ? color : 'var(--surface-raised)'}
            stroke={color}
            strokeWidth={i === points.length - 1 ? 0 : 1.4}
          />
        ))}
    </svg>
  );
}

/* --------------------------------------------------------------- */
/* AdherenceRing — circular progress with petal-styled hub          */
/* --------------------------------------------------------------- */
export function AdherenceRing({
  pct,
  size = 168,
  color = 'var(--gold)',
  trackColor,
  label,
  sublabel,
  thickness = 8,
}: {
  pct: number;
  size?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  thickness?: number;
}) {
  const safe = Math.max(0, Math.min(100, pct));
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness * 2) / 2;
  const c = TAU * r;
  const filled = (c * safe) / 100;
  const dotCount = 24;
  const dotR = r + thickness * 0.5;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0">
        {/* dot crown */}
        {Array.from({ length: dotCount }).map((_, i) => {
          const a = (TAU * i) / dotCount - Math.PI / 2;
          const big = i % 6 === 0;
          return (
            <circle
              key={i}
              cx={cx + dotR * Math.cos(a)}
              cy={cy + dotR * Math.sin(a)}
              r={big ? 1.6 : 1}
              fill={big ? color : 'var(--kolam-dot)'}
              opacity={big ? 0.85 : 0.45}
            />
          );
        })}
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor ?? 'color-mix(in oklch, var(--gold) 14%, var(--surface-raised))'}
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        {/* progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 8px color-mix(in oklch, ${color} 35%, transparent))` }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <div className="font-display text-[40px] font-medium leading-none italic text-gold-grad" style={{ fontVariationSettings: '"SOFT" 100' }}>
          {Math.round(safe)}
          <span className="text-[20px] text-tx-3 not-italic">%</span>
        </div>
        {label && (
          <div className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">{label}</div>
        )}
        {sublabel && <div className="mt-1 text-[11px] text-tx-3">{sublabel}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- */
/* DayRhythm — 24-hour horizontal kolam timeline                   */
/* --------------------------------------------------------------- */
type DayMark = {
  hour: number; // 0-23.99
  status: 'taken' | 'pending' | 'overdue' | 'skipped';
  label?: string;
};

const STATUS_COLORS: Record<DayMark['status'], string> = {
  taken: 'var(--gold)',
  pending: 'var(--peacock)',
  overdue: 'var(--vermilion)',
  skipped: 'var(--tx-3)',
};

export function DayRhythm({
  marks,
  height = 86,
  className = '',
  legend = true,
  nowHour,
}: {
  marks: DayMark[];
  height?: number;
  className?: string;
  legend?: boolean;
  nowHour?: number; // 0-23.99
}) {
  const ticks = [0, 6, 12, 18, 24];
  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full overflow-hidden rounded-[18px]"
           style={{
             height,
             background:
               'linear-gradient(90deg, color-mix(in oklch, var(--peacock) 16%, var(--surface-raised)) 0%, color-mix(in oklch, var(--gold) 14%, var(--surface-raised)) 50%, color-mix(in oklch, var(--vermilion) 16%, var(--surface-raised)) 100%)',
             border: '1px solid color-mix(in oklch, var(--gold) 18%, var(--clay-rim))',
             boxShadow: 'inset 0 1px 0 color-mix(in oklch, var(--gold) 22%, transparent), inset 0 -8px 14px color-mix(in oklch, var(--indigo-deep) 60%, transparent)',
           }}>
        {/* dotted center axis */}
        <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2"
             style={{ background: 'repeating-linear-gradient(90deg, color-mix(in oklch, var(--gold) 60%, transparent) 0 3px, transparent 3px 9px)', opacity: 0.55 }} />

        {/* hour ticks */}
        {ticks.map((t) => (
          <div key={t} className="absolute top-0 bottom-0 flex flex-col justify-between"
               style={{ left: `calc(${(t / 24) * 100}% + 0px)` }}>
            <span className="mt-1 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.18em] text-tx-3 opacity-80">
              {String(t).padStart(2, '0')}
            </span>
            <span className="-translate-x-1/2 mb-1 h-1.5 w-px"
                  style={{ background: 'color-mix(in oklch, var(--gold) 50%, transparent)' }} />
          </div>
        ))}

        {/* now line */}
        {nowHour !== undefined && (
          <div className="absolute top-0 bottom-0 w-px"
               style={{
                 left: `${(Math.max(0, Math.min(24, nowHour)) / 24) * 100}%`,
                 background: 'linear-gradient(180deg, transparent, var(--gold), transparent)',
                 boxShadow: '0 0 12px color-mix(in oklch, var(--gold) 65%, transparent)',
               }}>
            <span className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full px-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-indigo-deep"
                  style={{ background: 'var(--gold)' }}>
              now
            </span>
          </div>
        )}

        {/* dose marks */}
        {marks.map((m, i) => {
          const x = (Math.max(0, Math.min(24, m.hour)) / 24) * 100;
          const c = STATUS_COLORS[m.status];
          return (
            <div key={i} className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                 style={{ left: `${x}%` }}>
              <span className="block rounded-full"
                    style={{
                      width: m.status === 'overdue' ? 10 : 8,
                      height: m.status === 'overdue' ? 10 : 8,
                      background: c,
                      border: '2px solid var(--surface-raised)',
                      boxShadow: `0 0 0 1px color-mix(in oklch, ${c} 60%, transparent), 0 0 12px color-mix(in oklch, ${c} 55%, transparent)`,
                    }} />
              {m.label && (
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{ background: 'var(--surface-raised)', color: 'var(--tx-1)', border: '1px solid color-mix(in oklch, var(--gold) 28%, transparent)' }}>
                  {m.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {legend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-tx-3">
          <LegendDot color={STATUS_COLORS.taken} label="taken" />
          <LegendDot color={STATUS_COLORS.pending} label="pending" />
          <LegendDot color={STATUS_COLORS.overdue} label="overdue" />
          <LegendDot color={STATUS_COLORS.skipped} label="skipped" />
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {label}
    </span>
  );
}

/* --------------------------------------------------------------- */
/* StatStrip — small metric badge with trend                        */
/* --------------------------------------------------------------- */
export function StatStrip({
  label,
  value,
  delta,
  color = 'var(--gold)',
  icon,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  color?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full px-3 py-1.5"
         style={{ background: `color-mix(in oklch, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklch, ${color} 28%, transparent)` }}>
      {icon && <span style={{ color }}>{icon}</span>}
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-tx-3">{label}</span>
      <span className="font-mono text-[12px] font-semibold text-tx-1">{value}</span>
      {delta && <span className="font-mono text-[10px]" style={{ color }}>{delta}</span>}
    </div>
  );
}
