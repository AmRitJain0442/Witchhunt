'use client';

import { Brain, HeartPulse, Salad, TrendingDown, TrendingUp, Waves, Wind } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { cn, scoreBarColor, scoreColor, trendColor, trendIcon } from '@/lib/utils';

type Organ = { score: number; trend: string; factors: string[] };
const ORGANS = [
  { key: 'heart', label: 'Heart', desc: 'HR, BP, stress, cardiac symptoms', icon: HeartPulse },
  { key: 'brain', label: 'Brain', desc: 'Sleep hours, quality, stress', icon: Brain },
  { key: 'gut', label: 'Gut', desc: 'Bowel, hydration, meal regularity', icon: Salad },
  { key: 'lungs', label: 'Lungs', desc: 'SpO2, respiratory symptoms, steps', icon: Wind },
] as const;

function TrendGlyph({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={15} strokeWidth={1.9} />;
  if (trend === 'declining') return <TrendingDown size={15} strokeWidth={1.9} />;
  return <Waves size={15} strokeWidth={1.9} />;
}

export default function HealthPage() {
  const { data: scores, isLoading } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Analytics</div>
        <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Health scores</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-tx-2">
          Daily organ scoring computed from check-ins, vitals, symptoms, wearable data, and lab context.
        </p>
      </header>

      {isLoading && (
        <div className="surface-panel rounded-2xl px-5 py-16 text-center text-sm text-tx-3">Computing scores...</div>
      )}

      {!isLoading && !scores && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-20 text-center">
          <div className="text-sm font-semibold text-tx-1">No score data yet</div>
          <div className="mt-1 text-sm text-tx-2">Complete a check-in to generate your first health score set.</div>
        </div>
      )}

      {scores && (
        <>
          <section className="surface-panel mb-6 overflow-hidden rounded-[1.5rem]">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Overall</div>
                <div className={cn('font-[var(--font-mono)] text-7xl font-semibold leading-none tracking-tight sm:text-8xl', scoreColor(scores.overall))}>
                  {Math.round(scores.overall)}
                </div>
                <div className="mt-3 text-sm text-tx-3">out of 100</div>
              </div>
              <div className="grid content-between gap-8 p-6 sm:p-8">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-tx-1">Weighted family health signal</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-tx-2">
                    The score blends heart, brain, gut, and lung signals so daily care changes are easier to scan.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Heart', '30%'],
                    ['Brain', '25%'],
                    ['Gut', '25%'],
                    ['Lungs', '20%'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border bg-bg px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-tx-3">{label}</div>
                      <div className="mt-1 font-[var(--font-mono)] text-lg font-semibold text-tx-1">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="font-[var(--font-mono)] text-xs text-tx-3">
                  Last computed at {new Date(scores.computed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {ORGANS.map(({ key, label, desc, icon: Icon }) => {
              const organ: Organ = scores[key];
              return (
                <article key={key} className="surface-panel card-lift rounded-2xl p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-muted text-accent">
                        <Icon size={22} strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-tx-1">{label}</h3>
                        <div className="text-xs leading-5 text-tx-3">{desc}</div>
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2 py-1 text-[11px] font-medium', trendColor(organ.trend))}>
                      <TrendGlyph trend={organ.trend} />
                      {trendIcon(organ.trend)}
                    </span>
                  </div>
                  <div className={cn('font-[var(--font-mono)] text-5xl font-semibold tracking-tight', scoreColor(organ.score))}>
                    {Math.round(organ.score)}
                  </div>
                  <div className="my-5 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className={cn('h-full rounded-full transition-all', scoreBarColor(organ.score))} style={{ width: `${organ.score}%` }} />
                  </div>
                  <div className="space-y-2">
                    {organ.factors?.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm leading-5 text-tx-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tx-3" />
                        {f}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
