'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { healthApi, checkinApi, medicineApi, insightApi } from '@/lib/api';
import { scoreColor, scoreBarColor, trendIcon, trendColor, severityBg, cn } from '@/lib/utils';

type OrganKey = 'heart' | 'brain' | 'gut' | 'lungs';
const ORGANS: { key: OrganKey; label: string }[] = [
  { key: 'heart', label: 'Heart' },
  { key: 'brain', label: 'Brain' },
  { key: 'gut',   label: 'Gut'   },
  { key: 'lungs', label: 'Lungs' },
];

const STATUS_ICON: Record<string, string> = { taken: '✓', skipped: '—', overdue: '!', pending: '·' };
const STATUS_COLOR: Record<string, string> = {
  taken:   'text-green',
  skipped: 'text-tx-3',
  overdue: 'text-red font-semibold',
  pending: 'text-tx-3',
};

export default function DashboardPage() {
  const { appUser } = useAuth();
  const { data: scores } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });
  const { data: today  } = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });
  const { data: meds   } = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: advice } = useQuery({ queryKey: ['advisories'], queryFn: insightApi.advisories, retry: false });

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name     = appUser?.name?.split(' ')[0] ?? '';
  const pending  = meds?.schedules?.filter((s: { status: string }) => ['pending', 'overdue'].includes(s.status)).length ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-tx-1">
          {greeting}{name ? `, ${name}` : ''}
        </h1>
      </div>

      {/* Alerts */}
      {advice?.advisories?.filter((a: { severity: string }) => a.severity === 'critical').slice(0, 2).map((a: { title: string; body: string; severity: string }, i: number) => (
        <div key={i} className={cn('mb-3 rounded-lg border px-4 py-3', severityBg(a.severity))}>
          <div className="text-[13px] font-medium">{a.title}</div>
          <div className="text-[12px] mt-0.5 opacity-75">{a.body}</div>
        </div>
      ))}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Overall score', value: scores ? Math.round(scores.overall) : '—', mono: true },
          { label: 'Doses pending', value: pending || '—', alert: pending > 0 },
          { label: "Today's check-in", value: today ? 'done' : 'pending' },
        ].map(({ label, value, mono, alert }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-5">
            <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-2">{label}</div>
            <div className={cn(
              'text-2xl font-semibold',
              mono ? 'font-[var(--font-mono)]' : '',
              alert ? 'text-amber' : 'text-tx-1',
            )}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Organ scores */}
      {scores ? (
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-4">Organ health</div>
          <div className="grid grid-cols-4 gap-3">
            {ORGANS.map(({ key, label }) => {
              const organ = scores[key];
              return (
                <div key={key} className="bg-surface border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] text-tx-2">{label}</span>
                    <span className={cn('text-[11px] font-mono', trendColor(organ.trend))}>
                      {trendIcon(organ.trend)}
                    </span>
                  </div>
                  <div className={cn('text-3xl font-semibold tracking-tight font-[var(--font-mono)]', scoreColor(organ.score))}>
                    {Math.round(organ.score)}
                  </div>
                  <div className="mt-3 h-0.5 bg-border rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', scoreBarColor(organ.score))} style={{ width: `${organ.score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mb-8 border border-dashed border-border rounded-xl p-10 text-center">
          <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-2">No health data</div>
          <div className="text-[13px] text-tx-2 mb-4">Complete your first check-in to see scores.</div>
          <Link href="/checkin" className="text-[13px] text-accent hover:underline">Go to check-in →</Link>
        </div>
      )}

      {/* Medicines today */}
      {meds?.schedules?.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] uppercase tracking-widest text-tx-3">Today's medicines</div>
            <Link href="/medicines" className="text-[11px] text-accent hover:underline">View all</Link>
          </div>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {meds.schedules.slice(0, 6).map((s: { medicine_name: string; dosage: string; dose_time: string; status: string }, i: number) => (
              <div key={i} className={cn('flex items-center px-5 py-3.5 border-b border-border last:border-0', s.status === 'overdue' && 'bg-red/[0.03]')}>
                <span className={cn('w-4 text-[13px] font-mono shrink-0', STATUS_COLOR[s.status] ?? '')}>{STATUS_ICON[s.status]}</span>
                <span className="flex-1 text-[13px] text-tx-1 ml-3">{s.medicine_name}</span>
                <span className="text-[12px] text-tx-3 font-mono">{s.dosage}</span>
                <span className="text-[12px] text-tx-3 ml-4 w-12 text-right font-mono">{s.dose_time}</span>
              </div>
            ))}
          </div>
          {meds.adherence_pct !== undefined && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-px bg-border overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${meds.adherence_pct}%` }} />
              </div>
              <span className="text-[11px] text-tx-3 font-mono shrink-0">{Math.round(meds.adherence_pct)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Advisories */}
      {advice?.advisories?.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-4">Advisories</div>
          <div className="space-y-2">
            {advice.advisories.map((a: { severity: string; title: string; body: string }, i: number) => (
              <div key={i} className={cn('rounded-lg border px-4 py-3', severityBg(a.severity))}>
                <div className="text-[13px] font-medium">{a.title}</div>
                <div className="text-[12px] mt-0.5 opacity-75 leading-relaxed">{a.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
