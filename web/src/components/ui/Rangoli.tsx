// Folk-art SVG primitives: kolam dot grid, animated rangoli mandala,
// jasmine sprigs, and a radial petal-ring layout helper.

import type { CSSProperties, ReactNode } from 'react';

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- */
/* KolamDotGrid — full-bleed dotted grid background                */
/* --------------------------------------------------------------- */
export function KolamDotGrid({
  className = '',
  size = 'md',
  fade = true,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fade?: boolean;
}) {
  const sizeClass =
    size === 'sm' ? '' : size === 'lg' ? 'kolam-dots-bg-lg' : 'kolam-dots-bg';
  const overrideStyle =
    size === 'sm'
      ? ({
          backgroundImage:
            'radial-gradient(circle at center, var(--kolam-dot) 0.9px, transparent 1.1px)',
          backgroundSize: '20px 20px',
        } as CSSProperties)
      : undefined;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${sizeClass} ${className}`}
      style={{
        ...overrideStyle,
        opacity: 0.5,
        maskImage: fade
          ? 'radial-gradient(ellipse at center, black 30%, transparent 78%)'
          : undefined,
        WebkitMaskImage: fade
          ? 'radial-gradient(ellipse at center, black 30%, transparent 78%)'
          : undefined,
      }}
    />
  );
}

/* --------------------------------------------------------------- */
/* RangoliMandala — concentric petal rings, draw-on-load            */
/* --------------------------------------------------------------- */
type Ring = {
  count: number;
  innerR: number;
  outerR: number;
  color: string;
  width?: number;
  delay?: number;
  rotate?: number;
};

function petalPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  angle: number,
  half: number,
) {
  const x1 = cx + innerR * Math.cos(angle - half);
  const y1 = cy + innerR * Math.sin(angle - half);
  const x2 = cx + outerR * Math.cos(angle);
  const y2 = cy + outerR * Math.sin(angle);
  const x3 = cx + innerR * Math.cos(angle + half);
  const y3 = cy + innerR * Math.sin(angle + half);
  const cpr = (innerR + outerR) / 1.6;
  const cp1x = cx + cpr * Math.cos(angle - half * 0.55);
  const cp1y = cy + cpr * Math.sin(angle - half * 0.55);
  const cp2x = cx + cpr * Math.cos(angle + half * 0.55);
  const cp2y = cy + cpr * Math.sin(angle + half * 0.55);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)} Q ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

export function RangoliMandala({
  size = 480,
  className = '',
  intensity = 'full',
  rotate = true,
  ariaLabel,
}: {
  size?: number;
  className?: string;
  intensity?: 'full' | 'soft';
  rotate?: boolean;
  ariaLabel?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const u = size / 480;

  const rings: Ring[] = intensity === 'soft'
    ? [
        { count: 8, innerR: 80 * u, outerR: 116 * u, color: 'var(--gold)', width: 1.4, delay: 0 },
        { count: 16, innerR: 130 * u, outerR: 168 * u, color: 'var(--vermilion-soft)', width: 1, delay: 250 },
        { count: 24, innerR: 178 * u, outerR: 200 * u, color: 'var(--peacock)', width: 0.9, delay: 500 },
      ]
    : [
        { count: 6, innerR: 56 * u, outerR: 96 * u, color: 'var(--gold)', width: 1.6, delay: 0 },
        { count: 12, innerR: 100 * u, outerR: 138 * u, color: 'var(--vermilion-soft)', width: 1.3, delay: 220 },
        { count: 18, innerR: 142 * u, outerR: 168 * u, color: 'var(--gold)', width: 1, delay: 440, rotate: Math.PI / 36 },
        { count: 24, innerR: 172 * u, outerR: 196 * u, color: 'var(--peacock)', width: 1, delay: 660 },
        { count: 36, innerR: 200 * u, outerR: 218 * u, color: 'var(--gold-soft)', width: 0.8, delay: 880 },
      ];

  const outerDots = 60;
  const outerR = 232 * u;
  const innerDots = 24;
  const innerDotR = 132 * u;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={`kolam-stroke ${className}`}
      role="img"
      aria-label={ariaLabel ?? 'Rangoli mandala'}
    >
      {/* center bloom */}
      <g className="petal-pulse">
        <circle cx={cx} cy={cy} r={26 * u} fill="none" stroke="var(--gold)" strokeWidth={1.4} opacity={0.55} />
        <circle cx={cx} cy={cy} r={16 * u} fill="var(--gold)" opacity={0.18} />
        <circle cx={cx} cy={cy} r={9 * u} fill="var(--gold)" opacity={0.95} />
        <circle cx={cx} cy={cy} r={4 * u} fill="var(--vermilion)" />
      </g>

      {/* petal rings */}
      {rings.map((ring, ri) => {
        const half = TAU / ring.count / 2;
        const rot = ring.rotate ?? 0;
        return (
          <g
            key={ri}
            className={rotate && ri === rings.length - 1 ? 'slow-spin' : rotate && ri === 1 ? 'slow-spin-rev' : ''}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            {Array.from({ length: ring.count }).map((_, i) => {
              const angle = (TAU * i) / ring.count + rot;
              return (
                <path
                  key={i}
                  d={petalPath(cx, cy, ring.innerR, ring.outerR, angle, half)}
                  pathLength={1}
                  stroke={ring.color}
                  strokeWidth={ring.width ?? 1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.85}
                  style={{ animationDelay: `${ring.delay ?? 0}ms` }}
                />
              );
            })}
          </g>
        );
      })}

      {/* inner dot ring */}
      <g>
        {Array.from({ length: innerDots }).map((_, i) => {
          const a = (TAU * i) / innerDots;
          return (
            <circle
              key={`id-${i}`}
              cx={cx + innerDotR * Math.cos(a)}
              cy={cy + innerDotR * Math.sin(a)}
              r={1.4 * u}
              fill="var(--gold)"
              opacity={0.7}
            />
          );
        })}
      </g>

      {/* outer dot crown */}
      <g>
        {Array.from({ length: outerDots }).map((_, i) => {
          const a = (TAU * i) / outerDots;
          const big = i % 6 === 0;
          return (
            <circle
              key={`od-${i}`}
              cx={cx + outerR * Math.cos(a)}
              cy={cy + outerR * Math.sin(a)}
              r={big ? 2.2 * u : 1.2 * u}
              fill={big ? 'var(--vermilion)' : 'var(--kolam-dot)'}
              opacity={big ? 0.85 : 0.55}
            />
          );
        })}
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- */
/* JasmineSprig — small floral flourish for accents                 */
/* --------------------------------------------------------------- */
export function JasmineSprig({
  size = 56,
  className = '',
  color = 'var(--jasmine)',
  accent = 'var(--vermilion)',
}: {
  size?: number;
  className?: string;
  color?: string;
  accent?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.18;
  const petals = 5;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={className} aria-hidden>
      {Array.from({ length: petals }).map((_, i) => {
        const a = (TAU * i) / petals - Math.PI / 2;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        return (
          <ellipse
            key={i}
            cx={px}
            cy={py}
            rx={r * 0.85}
            ry={r * 0.42}
            fill={color}
            opacity={0.92}
            transform={`rotate(${(a * 180) / Math.PI + 90} ${px} ${py})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.45} fill={accent} />
    </svg>
  );
}

/* --------------------------------------------------------------- */
/* OrganQuadrant — score-arc petal for /health                      */
/* --------------------------------------------------------------- */
export function OrganQuadrant({
  startAngle,
  endAngle,
  innerR,
  outerR,
  score,
  cx,
  cy,
  color,
}: {
  startAngle: number;
  endAngle: number;
  innerR: number;
  outerR: number;
  score: number; // 0-100
  cx: number;
  cy: number;
  color: string;
}) {
  const filled = startAngle + ((endAngle - startAngle) * score) / 100;

  function arc(r: number, a0: number, a1: number) {
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return { x0, y0, x1, y1, large };
  }
  const oTrack = arc(outerR, startAngle, endAngle);
  const iTrack = arc(innerR, endAngle, startAngle);
  const trackPath = `M ${oTrack.x0} ${oTrack.y0} A ${outerR} ${outerR} 0 ${oTrack.large} 1 ${oTrack.x1} ${oTrack.y1} L ${iTrack.x0} ${iTrack.y0} A ${innerR} ${innerR} 0 ${iTrack.large} 0 ${iTrack.x1} ${iTrack.y1} Z`;

  const oFill = arc(outerR, startAngle, filled);
  const iFill = arc(innerR, filled, startAngle);
  const fillPath = `M ${oFill.x0} ${oFill.y0} A ${outerR} ${outerR} 0 ${oFill.large} 1 ${oFill.x1} ${oFill.y1} L ${iFill.x0} ${iFill.y0} A ${innerR} ${innerR} 0 ${iFill.large} 0 ${iFill.x1} ${iFill.y1} Z`;

  return (
    <g>
      <path d={trackPath} fill={`color-mix(in oklch, ${color} 18%, transparent)`} stroke={`color-mix(in oklch, ${color} 35%, transparent)`} strokeWidth={1} />
      <path d={fillPath} fill={`color-mix(in oklch, ${color} 75%, transparent)`} />
    </g>
  );
}

/* --------------------------------------------------------------- */
/* PetalRing — radial layout helper for placing items              */
/* --------------------------------------------------------------- */
export function PetalRing({
  size,
  radius,
  count,
  rotateBy = 0,
  children,
}: {
  size: number;
  radius: number;
  count: number;
  rotateBy?: number;
  children: (i: number, x: number, y: number, angle: number) => ReactNode;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const items: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (TAU * i) / count + rotateBy;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    items.push(children(i, x, y, angle));
  }
  return <>{items}</>;
}

/* --------------------------------------------------------------- */
/* KolamDivider — horizontal rule with a kolam bead                */
/* --------------------------------------------------------------- */
export function KolamDivider({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`gold-rule font-mono text-[10px] uppercase tracking-[0.32em] ${className}`}>
      ✦
    </div>
  );
}

/* --------------------------------------------------------------- */
/* KolamHalo — icon ringed by a small mandala (dots + 4 petals)    */
/* --------------------------------------------------------------- */
export function KolamHalo({
  color,
  size = 96,
  className = '',
  iconSlot,
  intensity = 'rich',
}: {
  color: string;
  size?: number;
  className?: string;
  iconSlot: ReactNode;
  intensity?: 'rich' | 'soft';
}) {
  const cx = size / 2;
  const cy = size / 2;
  const dotR = size * 0.46;
  const petalInner = size * 0.27;
  const petalOuter = size * 0.4;
  const dashRing = size * 0.36;
  const dotCount = intensity === 'rich' ? 16 : 12;
  const halfP = (Math.PI / 4) * 0.42;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0 kolam-stroke" aria-hidden>
        {/* outermost dot ring */}
        {Array.from({ length: dotCount }).map((_, i) => {
          const a = (TAU * i) / dotCount;
          const big = i % 4 === 0;
          return (
            <circle
              key={i}
              cx={cx + dotR * Math.cos(a)}
              cy={cy + dotR * Math.sin(a)}
              r={big ? size * 0.022 : size * 0.014}
              fill={big ? color : 'var(--kolam-dot)'}
              opacity={big ? 0.85 : 0.55}
            />
          );
        })}

        {/* dashed ring */}
        <circle cx={cx} cy={cy} r={dashRing} fill="none" stroke={color} strokeWidth={size * 0.008} strokeDasharray={`${size * 0.025} ${size * 0.04}`} opacity={0.55} />

        {/* 4 cardinal petals */}
        {[0, 1, 2, 3].map((q) => {
          const a = (Math.PI / 2) * q - Math.PI / 2;
          const x1 = cx + petalInner * Math.cos(a - halfP);
          const y1 = cy + petalInner * Math.sin(a - halfP);
          const x2 = cx + petalOuter * Math.cos(a);
          const y2 = cy + petalOuter * Math.sin(a);
          const x3 = cx + petalInner * Math.cos(a + halfP);
          const y3 = cy + petalInner * Math.sin(a + halfP);
          const cpr = (petalInner + petalOuter) * 0.6;
          const c1x = cx + cpr * Math.cos(a - halfP * 0.55);
          const c1y = cy + cpr * Math.sin(a - halfP * 0.55);
          const c2x = cx + cpr * Math.cos(a + halfP * 0.55);
          const c2y = cy + cpr * Math.sin(a + halfP * 0.55);
          return (
            <path
              key={q}
              d={`M ${x1} ${y1} Q ${c1x} ${c1y} ${x2} ${y2} Q ${c2x} ${c2y} ${x3} ${y3} Z`}
              fill={`color-mix(in oklch, ${color} 22%, transparent)`}
              stroke={color}
              strokeWidth={size * 0.01}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
              pathLength={1}
              style={{ animationDelay: `${q * 90}ms` }}
            />
          );
        })}
      </svg>

      {/* icon disk */}
      <span
        className="relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: size * 0.5,
          height: size * 0.5,
          background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${color} 70%, var(--surface)) 0%, color-mix(in oklch, ${color} 28%, var(--surface)) 100%)`,
          color: 'var(--indigo-deep)',
          boxShadow: `0 0 0 1.5px color-mix(in oklch, ${color} 55%, transparent), 0 8px 22px color-mix(in oklch, ${color} 35%, transparent)`,
        }}
      >
        {iconSlot}
      </span>
    </div>
  );
}

/* --------------------------------------------------------------- */
/* KolamDotStrip — horizontal kolam dot row, decorative            */
/* --------------------------------------------------------------- */
export function KolamDotStrip({
  count = 16,
  accent = 'var(--gold)',
  className = '',
  every = 4,
}: {
  count?: number;
  accent?: string;
  every?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={`flex items-center gap-[6px] ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const big = i % every === 0;
        return (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: big ? 4 : 2,
              height: big ? 4 : 2,
              background: big ? accent : 'var(--kolam-dot)',
              opacity: big ? 0.85 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
}
