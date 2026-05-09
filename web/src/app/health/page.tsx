'use client';

import { Brain, HeartPulse, Salad, Sparkles, TrendingDown, TrendingUp, Waves, Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { JasmineSprig, KolamDivider, KolamDotGrid } from '@/components/ui/Rangoli';

type Organ = { score: number; trend: string; factors: string[] };

const ORGANS = [
  {
    key: 'heart',
    label: 'Heart',
    sanskrit: 'हृदय · hṛdaya',
    desc: 'HR, BP, stress, cardiac symptoms',
    icon: HeartPulse,
    color: 'var(--vermilion)',
    angle: -Math.PI / 2,
  },
  {
    key: 'brain',
    label: 'Brain',
    sanskrit: 'मस्तिष्क · mastiṣka',
    desc: 'Sleep hours, quality, stress',
    icon: Brain,
    color: 'var(--peacock)',
    angle: 0,
  },
  {
    key: 'gut',
    label: 'Gut',
    sanskrit: 'जठर · jaṭhara',
    desc: 'Bowel, hydration, meal regularity',
    icon: Salad,
    color: 'var(--gold)',
    angle: Math.PI / 2,
  },
  {
    key: 'lungs',
    label: 'Lungs',
    sanskrit: 'फुफ्फुस · phuphphusa',
    desc: 'SpO2, respiratory symptoms, steps',
    icon: Wind,
    color: 'var(--sky)',
    angle: Math.PI,
  },
] as const;

const TAU = Math.PI * 2;
const VIEW = 600;
const CX = VIEW / 2;
const CY = VIEW / 2;
const INNER_R = 86;
const OUTER_R = 240;
const PETAL_HALF_ANGLE = (TAU / 4) * 0.42; // 42% of quadrant width — leaves gaps

function arcPoint(r: number, a: number) {
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
}

function organPetalPath(angle: number, fillFrac: number) {
  // a "tear-drop petal" pointing outward at `angle`, filled `fillFrac` along the radial axis
  const half = PETAL_HALF_ANGLE;
  const inR = INNER_R;
  const outR = INNER_R + (OUTER_R - INNER_R) * Math.max(0, Math.min(1, fillFrac));
  const [ix1, iy1] = arcPoint(inR, angle - half);
  const [ix2, iy2] = arcPoint(inR, angle + half);
  const [ox, oy] = arcPoint(outR, angle);
  const cpr = (inR + outR) * 0.62;
  const [c1x, c1y] = arcPoint(cpr, angle - half * 0.55);
  const [c2x, c2y] = arcPoint(cpr, angle + half * 0.55);
  return `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} Q ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)} Q ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${inR} ${inR} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
}

function TrendGlyph({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={14} strokeWidth={2} />;
  if (trend === 'declining') return <TrendingDown size={14} strokeWidth={2} />;
  return <Waves size={14} strokeWidth={2} />;
}

function trendTone(trend: string) {
  if (trend === 'improving') return 'text-gold';
  if (trend === 'declining') return 'text-vermilion';
  return 'text-tx-3';
}

export default function HealthPage() {
  const { data: scores, isLoading } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <KolamDotGrid className="!fixed !inset-0 -z-10 !opacity-40" size="md" fade={false} />

      <header className="mb-10 text-center">
        <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
          ✦ vital signs · चार अंग ✦
        </div>
        <h1 className="font-display text-[44px] font-medium leading-[1.05] tracking-tight text-tx-1 sm:text-[58px]">
          Four organs, <span className="italic text-gold-grad">one rangoli.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-tx-2">
          Each petal grows with the score the family is keeping today — drawn fresh every dawn from check-ins, vitals,
          symptoms, wearable data and lab context.
        </p>
        <KolamDivider className="mx-auto mt-7 max-w-xs" />
      </header>

      {isLoading && (
        <div className="petal-card mx-auto max-w-md px-6 py-16 text-center text-sm text-tx-3">
          <div className="mx-auto mb-4 h-2 w-2 animate-pulse rounded-full bg-gold" />
          Drawing today&apos;s rangoli…
        </div>
      )}

      {!isLoading && !scores && (
        <div className="petal-card mx-auto max-w-md px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'color-mix(in oklch, var(--gold) 22%, var(--surface))' }}>
            <Sparkles size={20} className="text-gold" />
          </div>
          <div className="font-display text-[20px] font-medium text-tx-1">No score data yet</div>
          <div className="mx-auto mt-2 max-w-xs text-sm leading-6 text-tx-2">
            Complete a check-in and we&apos;ll draw your first rangoli of organ scores.
          </div>
        </div>
      )}

      {scores && (
        <>
          {/* ============================================================ */}
          {/* RANGOLI WHEEL                                                  */}
          {/* ============================================================ */}
          <section className="grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
            {/* the wheel */}
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              {/* glow halo */}
              <div className="absolute inset-6 rounded-full opacity-50 blur-2xl"
                   style={{ background: 'radial-gradient(circle at center, color-mix(in oklch, var(--gold) 38%, transparent), transparent 65%)' }} />

              <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="kolam-stroke relative h-full w-full">
                {/* outermost decorative dot ring (slow spin) */}
                <g className="slow-spin" style={{ transformOrigin: `${CX}px ${CY}px` }}>
                  {Array.from({ length: 72 }).map((_, i) => {
                    const a = (TAU * i) / 72;
                    const big = i % 9 === 0;
                    const r = OUTER_R + 36;
                    return (
                      <circle
                        key={i}
                        cx={CX + r * Math.cos(a)}
                        cy={CY + r * Math.sin(a)}
                        r={big ? 2.4 : 1.2}
                        fill={big ? 'var(--vermilion)' : 'var(--kolam-dot)'}
                        opacity={big ? 0.85 : 0.55}
                      />
                    );
                  })}
                </g>

                {/* dotted radius circle */}
                <circle cx={CX} cy={CY} r={OUTER_R + 12} fill="none" stroke="var(--kolam-line)" strokeWidth={1} strokeDasharray="2 6" opacity={0.6} />
                <circle cx={CX} cy={CY} r={INNER_R - 6} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />

                {/* organ petals */}
                {ORGANS.map((org) => {
                  const organ = scores[org.key as keyof typeof scores] as Organ | undefined;
                  const score = organ?.score ?? 0;
                  // background track (full petal at low opacity)
                  const trackD = organPetalPath(org.angle, 1);
                  const fillD = organPetalPath(org.angle, score / 100);
                  return (
                    <g key={org.key}>
                      <path d={trackD} fill={`color-mix(in oklch, ${org.color} 12%, transparent)`} stroke={`color-mix(in oklch, ${org.color} 40%, transparent)`} strokeWidth={1.2} pathLength={1} />
                      {score > 0 && (
                        <path d={fillD} fill={`color-mix(in oklch, ${org.color} 70%, transparent)`} pathLength={1} />
                      )}
                      {/* petal outline (drawn) */}
                      <path d={trackD} fill="none" stroke={org.color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} pathLength={1} />
                    </g>
                  );
                })}

                {/* inner mandala bloom */}
                <circle cx={CX} cy={CY} r={INNER_R - 10} fill="var(--surface)" opacity={0.85} />
                <circle cx={CX} cy={CY} r={INNER_R - 10} fill="none" stroke="var(--gold)" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.7} />
                <circle cx={CX} cy={CY} r={INNER_R - 28} fill="none" stroke="var(--gold)" strokeWidth={0.9} opacity={0.45} />

                {/* center text */}
                <g>
                  <text x={CX} y={CY - 8} textAnchor="middle" className="font-display fill-tx-1" style={{ fontSize: 56, fontWeight: 500 }}>
                    {Math.round(scores.overall)}
                  </text>
                  <text x={CX} y={CY + 22} textAnchor="middle" className="fill-tx-3" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.32em', textTransform: 'uppercase' }}>
                    overall
                  </text>
                </g>

                {/* tiny score labels at petal tips */}
                {ORGANS.map((org) => {
                  const organ = scores[org.key as keyof typeof scores] as Organ | undefined;
                  const score = organ?.score ?? 0;
                  const [lx, ly] = arcPoint(OUTER_R + 8, org.angle);
                  return (
                    <g key={`l-${org.key}`}>
                      <circle cx={lx} cy={ly} r={20} fill="var(--surface-raised)" stroke={org.color} strokeWidth={1.2} />
                      <text x={lx} y={ly + 4} textAnchor="middle" className="fill-tx-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                        {Math.round(score)}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* corner jasmine flourishes */}
              <JasmineSprig size={36} className="absolute left-0 top-0 opacity-90" color="var(--jasmine)" accent="var(--vermilion)" />
              <JasmineSprig size={32} className="absolute right-0 top-0 opacity-90" color="var(--jasmine)" accent="var(--gold)" />
              <JasmineSprig size={32} className="absolute bottom-0 left-0 opacity-90" color="var(--jasmine)" accent="var(--peacock)" />
              <JasmineSprig size={36} className="absolute bottom-0 right-0 opacity-90" color="var(--jasmine)" accent="var(--gold)" />
            </div>

            {/* side panel */}
            <div>
              <div className="petal-card kolam-frame relative px-7 py-7">
                <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                  weighted family signal
                </div>
                <h2 className="font-display text-[26px] font-medium leading-tight tracking-tight text-tx-1">
                  How the wheel is woven.
                </h2>
                <p className="mt-3 text-[14px] leading-7 text-tx-2">
                  Heart, brain, gut and lungs each contribute their own petal — weighted, blended, and refreshed every
                  dawn from the family&apos;s notes.
                </p>
                <div className="my-5 h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, color-mix(in oklch, var(--gold) 60%, transparent), transparent)' }} />
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Heart', '30%', 'var(--vermilion)'],
                    ['Brain', '25%', 'var(--peacock)'],
                    ['Gut', '25%', 'var(--gold)'],
                    ['Lungs', '20%', 'var(--sky)'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                         style={{ background: `color-mix(in oklch, ${color} 14%, transparent)`, border: `1px solid color-mix(in oklch, ${color} 28%, transparent)` }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      <span className="text-[12px] font-medium text-tx-2">{label}</span>
                      <span className="ml-auto font-mono text-[13px] font-semibold text-tx-1">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 font-mono text-[11px] tracking-wide text-tx-3">
                  drawn at{' '}
                  {new Date(scores.computed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}{' '}
                  · today
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* PETAL DETAIL CARDS                                             */}
          {/* ============================================================ */}
          <KolamDivider className="my-14" />

          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {ORGANS.map(({ key, label, sanskrit, desc, icon: Icon, color }) => {
              const organ: Organ | undefined = scores[key as keyof typeof scores] as Organ | undefined;
              return (
                <article key={key} className="petal-card kolam-frame lift relative overflow-hidden p-7">
                  <div
                    className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-2xl"
                    style={{ background: color }}
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-full"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${color} 55%, var(--surface)) 0%, color-mix(in oklch, ${color} 28%, var(--surface)) 100%)`,
                          boxShadow: `0 0 0 1px color-mix(in oklch, ${color} 45%, transparent), 0 0 28px color-mix(in oklch, ${color} 30%, transparent)`,
                          color,
                        }}
                      >
                        <Icon size={22} strokeWidth={1.8} />
                      </span>
                      <div>
                        <h3 className="font-display text-[22px] font-medium leading-tight tracking-tight text-tx-1">
                          {label}
                        </h3>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-tx-3">
                          {sanskrit}
                        </div>
                      </div>
                    </div>
                    {organ && (
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', trendTone(organ.trend))}
                            style={{ background: 'color-mix(in oklch, var(--surface-raised) 90%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 18%, transparent)' }}>
                        <TrendGlyph trend={organ.trend} />
                        {organ.trend}
                      </span>
                    )}
                  </div>

                  {organ ? (
                    <>
                      <div className="relative mt-7 flex items-end gap-3">
                        <div
                          className="font-mono text-[64px] font-semibold leading-none tracking-tight glow-gold"
                          style={{ color: 'var(--tx-1)' }}
                        >
                          {Math.round(organ.score)}
                        </div>
                        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-tx-3">
                          / 100
                        </div>
                      </div>

                      {/* petal-arc bar */}
                      <div className="mt-5 h-2 overflow-hidden rounded-full"
                           style={{ background: 'color-mix(in oklch, var(--gold) 8%, var(--surface-raised))' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${organ.score}%`,
                            background: `linear-gradient(90deg, color-mix(in oklch, ${color} 60%, transparent), ${color})`,
                            boxShadow: `0 0 14px color-mix(in oklch, ${color} 55%, transparent)`,
                          }}
                        />
                      </div>

                      <div className="mt-5 text-[12px] leading-5 text-tx-3">{desc}</div>

                      <div className="mt-5 space-y-2.5">
                        {organ.factors?.slice(0, 3).map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-[13.5px] leading-5 text-tx-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 rounded-sm"
                                  style={{ background: color, opacity: 0.85 }} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 rounded-2xl px-4 py-8 text-center text-sm text-tx-3"
                         style={{ background: 'color-mix(in oklch, var(--gold) 6%, var(--surface-raised))', border: '1px dashed color-mix(in oklch, var(--gold) 28%, transparent)' }}>
                      Not enough signal yet — log a check-in to score {label.toLowerCase()}.
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
