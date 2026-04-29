'use client';

import { AlertTriangle, CalendarCheck, CheckCircle2, Circle, Pill, TrendingDown, TrendingUp, Waves } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { checkinApi, healthApi, insightApi, medicineApi } from '@/lib/api';
import { cn, scoreBarColor, scoreColor, severityBg, trendColor, trendIcon } from '@/lib/utils';

type OrganKey = 'heart' | 'brain' | 'gut' | 'lungs';
const ORGANS: { key: OrganKey; label: string }[] = [
  { key: 'heart', label: 'Heart' },
  { key: 'brain', label: 'Brain' },
  { key: 'gut', label: 'Gut' },
  { key: 'lungs', label: 'Lungs' },
];

const STATUS_COLOR: Record<string, string> = {
  taken: 'text-green',
  skipped: 'text-tx-3',
  overdue: 'text-red font-semibold',
  pending: 'text-tx-3',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'taken') return <CheckCircle2 size={16} className="text-green" />;
  if (status === 'overdue') return <AlertTriangle size={16} className="text-red" />;
  return <Circle size={14} className={status === 'skipped' ? 'text-tx-3' : 'text-amber'} />;
}

function TrendGlyph({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={15} strokeWidth={1.9} />;
  if (trend === 'declining') return <TrendingDown size={15} strokeWidth={1.9} />;
  return <Waves size={15} strokeWidth={1.9} />;
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const { data: scores } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });
  const { data: today } = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });
  const { data: meds } = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: advice } = useQuery({ queryKey: ['advisories'], queryFn: insightApi.advisories, retry: false });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = appUser?.name?.split(' ')[0] ?? '';
  const pending = meds?.schedules?.filter((s: { status: string }) => ['pending', 'overdue'].includes(s.status)).length ?? 0;
  const critical = advice?.advisories?.filter((a: { severity: string }) => a.severity === 'critical').slice(0, 2) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">
            {greeting}{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tx-2">
            Your family health workspace is ready for today&apos;s check-in, medicines, scores, and advisories.
          </p>
        </div>
        <Link
          href="/checkin"
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
        >
          <CalendarCheck size={16} strokeWidth={1.9} />
          Check in
        </Link>
      </header>

      {critical.map((a: { title: string; body: string; severity: string }, i: number) => (
        <div key={i} className={cn('mb-3 rounded-2xl border px-4 py-3', severityBg(a.severity))}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} strokeWidth={1.9} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold">{a.title}</div>
              <div className="mt-1 text-sm leading-6 opacity-80">{a.body}</div>
            </div>
          </div>
        </div>
      ))}

      <section className="mb-8 grid gap-3 md:grid-cols-3">
        {[
          { icon: Waves, label: 'Overall score', value: scores ? Math.round(scores.overall) : '-', tone: scores ? scoreColor(scores.overall) : 'text-tx-1' },
          { icon: Pill, label: 'Doses pending', value: pending || '-', tone: pending > 0 ? 'text-amber' : 'text-tx-1' },
          { icon: CalendarCheck, label: "Today's check-in", value: today ? 'done' : 'pending', tone: today ? 'text-green' : 'text-amber' },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="surface-panel card-lift rounded-2xl p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">{label}</div>
              <Icon size={18} strokeWidth={1.8} className="text-tx-3" />
            </div>
            <div className={cn('font-[var(--font-mono)] text-3xl font-semibold tracking-tight', tone)}>{value}</div>
          </div>
        ))}
      </section>

      {scores ? (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Organ health</div>
            <Link href="/health" className="text-xs font-semibold text-accent hover:underline">Open analytics</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ORGANS.map(({ key, label }) => {
              const organ = scores[key];
              return (
                <div key={key} className="surface-panel card-lift rounded-2xl p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-tx-1">{label}</span>
                    <span className={cn('inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2 py-1 text-[11px] font-medium', trendColor(organ.trend))}>
                      <TrendGlyph trend={organ.trend} />
                      {trendIcon(organ.trend)}
                    </span>
                  </div>
                  <div className={cn('font-[var(--font-mono)] text-4xl font-semibold tracking-tight', scoreColor(organ.score))}>
                    {Math.round(organ.score)}
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className={cn('h-full rounded-full transition-all', scoreBarColor(organ.score))} style={{ width: `${organ.score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mb-8 rounded-2xl border border-dashed border-border bg-surface/70 p-10 text-center">
          <div className="text-sm font-semibold text-tx-1">No health data yet</div>
          <div className="mx-auto mt-2 max-w-sm text-sm leading-6 text-tx-2">Complete your first check-in to generate organ scores.</div>
          <Link href="/checkin" className="mt-5 inline-flex text-sm font-semibold text-accent hover:underline">Go to check-in</Link>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Today&apos;s medicines</div>
            <Link href="/medicines" className="text-xs font-semibold text-accent hover:underline">View all</Link>
          </div>
          <div className="surface-panel overflow-hidden rounded-2xl">
            {(meds?.schedules?.length ?? 0) > 0 ? (
              meds?.schedules?.slice(0, 6).map((s: { medicine_name: string; dosage: string; dose_time: string; status: string }, i: number) => (
                <div key={i} className={cn('flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0', s.status === 'overdue' && 'bg-red/[0.08]')}>
                  <StatusIcon status={s.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-tx-1">{s.medicine_name}</span>
                  <span className="hidden text-xs text-tx-3 sm:inline">{s.dosage}</span>
                  <span className="w-14 text-right font-[var(--font-mono)] text-xs text-tx-3">{s.dose_time}</span>
                  <span className={cn('hidden w-16 text-right text-[11px] uppercase tracking-[0.14em] sm:block', STATUS_COLOR[s.status] ?? '')}>{s.status}</span>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="text-sm font-semibold text-tx-1">No scheduled doses</div>
                <div className="mt-1 text-sm text-tx-2">Add medicines through Kutumb AI or the medicines workspace.</div>
              </div>
            )}
          </div>
          {meds?.adherence_pct !== undefined && (
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${meds.adherence_pct}%` }} />
              </div>
              <span className="shrink-0 font-[var(--font-mono)] text-xs text-tx-3">{Math.round(meds.adherence_pct)}%</span>
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Advisories</div>
          <div className="space-y-2">
            {(advice?.advisories?.length ?? 0) > 0 ? (
              advice.advisories.map((a: { severity: string; title: string; body: string }, i: number) => (
                <div key={i} className={cn('rounded-2xl border px-4 py-3', severityBg(a.severity))}>
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="mt-1 text-sm leading-6 opacity-80">{a.body}</div>
                </div>
              ))
            ) : (
              <div className="surface-panel rounded-2xl px-5 py-10 text-center">
                <div className="text-sm font-semibold text-tx-1">No urgent advisories</div>
                <div className="mt-1 text-sm text-tx-2">New guidance appears here as check-ins and reports change.</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
