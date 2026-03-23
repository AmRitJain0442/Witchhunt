'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { healthApi, checkinApi, medicineApi, insightApi } from '@/lib/api';
import { scoreColor, scoreBg, trendIcon, trendColor, severityBadge, relativeDate, cn } from '@/lib/utils';

function ScoreCard({ label, score, trend, icon }: { label: string; score: number; trend: string; icon: string }) {
  return (
    <div className={cn('rounded-xl border p-4', scoreBg(score))}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">{icon} {label}</span>
        <span className={cn('text-sm font-medium', trendColor(trend))}>
          {trendIcon(trend)}
        </span>
      </div>
      <div className={cn('text-3xl font-bold', scoreColor(score))}>{Math.round(score)}</div>
      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div className="h-full bg-current rounded-full transition-all" style={{ width: `${score}%`, opacity: 0.6 }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { appUser } = useAuth();

  const { data: scores } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });
  const { data: today }  = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });
  const { data: meds }   = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: advice } = useQuery({ queryKey: ['advisories'], queryFn: insightApi.advisories, retry: false });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = appUser?.name?.split(' ')[0] ?? 'there';

  const pendingDoses = meds?.schedules?.filter((s: { status: string }) => s.status === 'pending' || s.status === 'overdue').length ?? 0;
  const criticalAdvisories = advice?.advisories?.filter((a: { severity: string }) => a.severity === 'critical') ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {name} 🙏</h1>
        <p className="text-slate-500 text-sm mt-0.5">Here's your health overview for today</p>
      </div>

      {/* Alert banners */}
      {criticalAdvisories.length > 0 && (
        <div className="mb-4 space-y-2">
          {criticalAdvisories.slice(0, 2).map((a: { title: string; body: string }, i: number) => (
            <div key={i} className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span>🚨</span>
              <div>
                <div className="text-sm font-semibold text-red-700">{a.title}</div>
                <div className="text-xs text-red-600 mt-0.5">{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{scores ? Math.round(scores.overall) : '—'}</div>
          <div className="text-xs text-slate-500 mt-0.5">Overall score</div>
        </div>
        <div className={cn('bg-white rounded-xl border p-4 text-center', pendingDoses > 0 ? 'border-amber-200' : 'border-slate-100')}>
          <div className={cn('text-2xl font-bold', pendingDoses > 0 ? 'text-amber-600' : 'text-slate-400')}>
            {pendingDoses}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Doses pending</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
          <div className="text-2xl font-bold text-slate-700">{today ? '✓' : '—'}</div>
          <div className="text-xs text-slate-500 mt-0.5">Check-in today</div>
        </div>
      </div>

      {/* Organ scores */}
      {scores ? (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-700 mb-3">Organ Health</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ScoreCard label="Heart" score={scores.heart.score} trend={scores.heart.trend} icon="❤️" />
            <ScoreCard label="Brain" score={scores.brain.score} trend={scores.brain.trend} icon="🧠" />
            <ScoreCard label="Gut"   score={scores.gut.score}   trend={scores.gut.trend}   icon="🫃" />
            <ScoreCard label="Lungs" score={scores.lungs.score} trend={scores.lungs.trend} icon="🫁" />
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-white border border-slate-100 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">📊</div>
          <div className="font-medium text-slate-700">No health data yet</div>
          <div className="text-sm text-slate-400 mt-1">Complete your first check-in to see scores</div>
          <Link href="/checkin" className="mt-3 inline-block text-sm text-emerald-600 font-medium hover:underline">
            Go to check-in →
          </Link>
        </div>
      )}

      {/* Today's medicines */}
      {meds?.schedules?.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-700">Today's medicines</h2>
            <Link href="/medicines" className="text-xs text-emerald-600 hover:underline">View all →</Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
            {meds.schedules.slice(0, 5).map((s: { medicine_name: string; dosage: string; dose_time: string; status: string }, i: number) => {
              const statusStyles: Record<string, string> = {
                taken:   'text-emerald-600',
                skipped: 'text-slate-400',
                overdue: 'text-red-500 font-semibold',
                pending: 'text-amber-600',
              };
              return (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{s.medicine_name}</div>
                    <div className="text-xs text-slate-400">{s.dosage} · {s.dose_time}</div>
                  </div>
                  <span className={cn('text-xs capitalize', statusStyles[s.status] ?? 'text-slate-400')}>
                    {s.status === 'taken' ? '✅' : s.status === 'overdue' ? '🔴' : s.status === 'pending' ? '⏰' : '⏭️'} {s.status}
                  </span>
                </div>
              );
            })}
          </div>
          {meds.adherence_pct !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${meds.adherence_pct}%` }} />
              </div>
              <span className="text-xs text-slate-400">{Math.round(meds.adherence_pct)}% today</span>
            </div>
          )}
        </div>
      )}

      {/* Advisories */}
      {advice?.advisories?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-slate-700 mb-3">Health Advisories</h2>
          <div className="space-y-2">
            {advice.advisories.map((a: { severity: string; title: string; body: string }, i: number) => (
              <div key={i} className={cn('rounded-xl border px-4 py-3', severityBadge(a.severity))}>
                <div className="text-sm font-semibold">{a.title}</div>
                <div className="text-xs mt-0.5 opacity-80">{a.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
