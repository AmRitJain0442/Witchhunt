'use client';

import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { scoreColor, scoreBarColor, trendIcon, trendColor, cn } from '@/lib/utils';

type Organ = { score: number; trend: string; factors: string[] };
const ORGANS = [
  { key: 'heart', label: 'Heart',  desc: 'HR · BP · stress · cardiac symptoms' },
  { key: 'brain', label: 'Brain',  desc: 'Sleep hours · quality · stress' },
  { key: 'gut',   label: 'Gut',    desc: 'Bowel · hydration · meal regularity' },
  { key: 'lungs', label: 'Lungs',  desc: 'SpO₂ · respiratory symptoms · steps' },
] as const;

export default function HealthPage() {
  const { data: scores, isLoading } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">Analytics</div>
        <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Health scores</h1>
        <p className="text-[13px] text-tx-2 mt-1.5">Computed daily from check-ins, vitals, and wearable data</p>
      </div>

      {isLoading && (
        <div className="text-[13px] text-tx-3 py-16 text-center">Computing…</div>
      )}

      {!isLoading && !scores && (
        <div className="py-20 text-center border border-dashed border-border rounded-xl">
          <div className="text-[13px] font-medium text-tx-2">No data yet</div>
          <div className="text-[12px] text-tx-3 mt-1">Complete a check-in to generate scores</div>
        </div>
      )}

      {scores && (
        <>
          {/* Overall */}
          <div className="bg-surface border border-border rounded-2xl p-8 mb-6 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-3">Overall</div>
              <div className={cn('text-[6rem] font-semibold leading-none tracking-tight font-[var(--font-mono)]', scoreColor(scores.overall))}>
                {Math.round(scores.overall)}
              </div>
              <div className="text-[13px] text-tx-3 mt-2">out of 100</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-tx-3">30% Heart · 25% Brain</div>
              <div className="text-[11px] text-tx-3">25% Gut · 20% Lungs</div>
              <div className="text-[11px] text-tx-3 mt-2 font-mono">
                {new Date(scores.computed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Per-organ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ORGANS.map(({ key, label, desc }) => {
              const organ: Organ = scores[key];
              return (
                <div key={key} className="bg-surface border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] uppercase tracking-widest text-tx-3">{label}</span>
                    <span className={cn('text-[12px] font-mono', trendColor(organ.trend))}>
                      {trendIcon(organ.trend)} {organ.trend}
                    </span>
                  </div>
                  <div className={cn('text-5xl font-semibold tracking-tight font-[var(--font-mono)] my-3', scoreColor(organ.score))}>
                    {Math.round(organ.score)}
                  </div>
                  <div className="h-px bg-border overflow-hidden mb-4">
                    <div className={cn('h-full transition-all', scoreBarColor(organ.score))} style={{ width: `${organ.score}%` }} />
                  </div>
                  <div className="text-[11px] text-tx-3 mb-3">{desc}</div>
                  {organ.factors?.slice(0, 3).map((f, i) => (
                    <div key={i} className="text-[12px] text-tx-2 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-tx-3 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
