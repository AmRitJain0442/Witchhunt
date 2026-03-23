'use client';

import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api';
import { scoreColor, scoreBg, trendIcon, trendColor, cn } from '@/lib/utils';

type OrganScore = { score: number; trend: string; label: string; factors: string[] };

function OrganCard({ name, icon, data }: { name: string; icon: string; data: OrganScore }) {
  return (
    <div className={cn('rounded-2xl border p-5', scoreBg(data.score))}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <span className="font-semibold text-slate-700">{name}</span>
        </div>
        <span className={cn('text-sm font-medium', trendColor(data.trend))}>
          {trendIcon(data.trend)} {data.trend}
        </span>
      </div>
      <div className={cn('text-5xl font-bold mb-3', scoreColor(data.score))}>
        {Math.round(data.score)}
        <span className="text-xl font-normal text-slate-400">/100</span>
      </div>
      {/* Bar */}
      <div className="h-2 bg-white/60 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${data.score}%`,
            backgroundColor: data.score >= 75 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
      {/* Factors */}
      {data.factors?.length > 0 && (
        <div className="space-y-1">
          {data.factors.slice(0, 3).map((f, i) => (
            <div key={i} className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ORGANS = [
  { key: 'heart', name: 'Heart', icon: '❤️' },
  { key: 'brain', name: 'Brain', icon: '🧠' },
  { key: 'gut',   name: 'Gut',   icon: '🫃' },
  { key: 'lungs', name: 'Lungs', icon: '🫁' },
] as const;

export default function HealthPage() {
  const { data: scores, isLoading } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Health Scores</h1>
        <p className="text-slate-500 text-sm mt-0.5">Computed daily from your check-ins, vitals and wearable data</p>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-slate-400">Computing your scores…</div>
      )}

      {!isLoading && !scores && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📊</div>
          <div className="font-semibold text-slate-700">No data yet</div>
          <div className="text-sm text-slate-400 mt-2">Complete a check-in and log some data to see your organ health scores.</div>
        </div>
      )}

      {scores && (
        <>
          {/* Overall */}
          <div className="bg-emerald-700 text-white rounded-2xl p-6 mb-6 flex items-center justify-between">
            <div>
              <div className="text-emerald-200 text-sm">Overall Health Score</div>
              <div className="text-6xl font-bold mt-1">{Math.round(scores.overall)}</div>
              <div className="text-emerald-300 text-sm mt-1">out of 100</div>
            </div>
            <div className="text-right text-emerald-200 text-xs">
              <div>Computed at</div>
              <div className="font-mono text-white text-sm mt-0.5">
                {new Date(scores.computed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Organ breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ORGANS.map(({ key, name, icon }) => (
              <OrganCard key={key} name={name} icon={icon} data={scores[key]} />
            ))}
          </div>

          {/* Scoring note */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
            <strong className="text-slate-700">How scores are computed:</strong>
            {' '}Heart uses heart rate, BP and stress · Brain uses sleep hours, quality and stress · Gut uses bowel, hydration and meal regularity · Lungs uses SpO₂ and respiratory symptoms.
            Overall = 30% Heart + 25% Brain + 25% Gut + 20% Lungs.
          </div>
        </>
      )}
    </div>
  );
}
