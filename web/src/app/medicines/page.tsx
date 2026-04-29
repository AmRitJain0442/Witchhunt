'use client';

import { AlertTriangle, CheckCircle2, Circle, Pill, SkipForward, Tablets } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { medicineApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Schedule = { medicine_id: string; medicine_name: string; dosage: string; dose_time: string; status: string };
type Medicine = { id: string; name: string; category: string; dosage: string; frequency: string; is_emergency: boolean; current_stock?: number; days_supply_remaining?: number; refill_alert: boolean };

function DoseStatus({ status }: { status: string }) {
  if (status === 'taken') return <CheckCircle2 size={17} className="text-green" />;
  if (status === 'overdue') return <AlertTriangle size={17} className="text-red" />;
  return <Circle size={15} className={status === 'skipped' ? 'text-tx-3' : 'text-amber'} />;
}

export default function MedicinesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'today' | 'all'>('today');

  const { data: today, isLoading: l1 } = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: allMeds, isLoading: l2 } = useQuery({ queryKey: ['medicines-all'], queryFn: medicineApi.list, retry: false });

  const log = useMutation({
    mutationFn: ({ id, action, time }: { id: string; action: string; time: string }) => medicineApi.logDose(id, action, time),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines-today'] }),
  });

  const schedules: Schedule[] = today?.schedules ?? [];
  const meds: Medicine[] = allMeds?.medicines ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">Medicines</div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Medicine cabinet</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tx-2">
            Track daily dose status, adherence, emergency medicines, and refill signals.
          </p>
        </div>
        {today?.adherence_pct !== undefined && (
          <div className="surface-panel min-w-48 rounded-2xl px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-tx-3">Adherence today</div>
            <div className="mt-1 font-[var(--font-mono)] text-2xl font-semibold text-tx-1">{Math.round(today.adherence_pct)}%</div>
          </div>
        )}
      </header>

      <div className="mb-8 inline-flex rounded-2xl border border-border bg-bg-subtle p-1">
        {(['today', 'all'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'focus-ring rounded-xl px-4 py-2 text-sm font-semibold transition-all',
              tab === t ? 'bg-surface text-tx-1 shadow-[var(--shadow-sm)]' : 'text-tx-3 hover:text-tx-1',
            )}
          >
            {t === 'today' ? 'Today' : 'All medicines'}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <section>
          {today?.adherence_pct !== undefined && (
            <div className="mb-6 flex items-center gap-4">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${today.adherence_pct}%` }} />
              </div>
              <span className="shrink-0 font-[var(--font-mono)] text-xs text-tx-3">{Math.round(today.adherence_pct)}%</span>
            </div>
          )}
          {l1 && <div className="surface-panel rounded-2xl px-5 py-12 text-center text-sm text-tx-3">Loading medicines...</div>}
          {!l1 && !schedules.length && (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-16 text-center">
              <div className="text-sm font-semibold text-tx-1">All done for today</div>
              <div className="mt-1 text-sm text-tx-2">No pending doses are scheduled.</div>
            </div>
          )}
          <div className="surface-panel overflow-hidden rounded-2xl">
            {schedules.map((s, i) => (
              <div key={`${s.medicine_id}-${i}`} className={cn('grid gap-3 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center', s.status === 'overdue' && 'bg-red/[0.08]')}>
                <div className="flex items-center gap-3">
                  <DoseStatus status={s.status} />
                  <span className="font-[var(--font-mono)] text-xs text-tx-3">{s.dose_time}</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-tx-1">{s.medicine_name}</div>
                  <div className="mt-0.5 text-xs text-tx-3">{s.dosage}</div>
                </div>
                <span className={cn('w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                  s.status === 'taken' ? 'border-green/20 text-green' : s.status === 'overdue' ? 'border-red/20 text-red' : s.status === 'skipped' ? 'border-border text-tx-3' : 'border-amber/20 text-amber'
                )}>
                  {s.status}
                </span>
                {(s.status === 'pending' || s.status === 'overdue') && (
                  <div className="flex gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => log.mutate({ id: s.medicine_id, action: 'taken', time: s.dose_time })}
                      disabled={log.isPending}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-xs font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Taken
                    </button>
                    <button
                      type="button"
                      onClick={() => log.mutate({ id: s.medicine_id, action: 'skipped', time: s.dose_time })}
                      disabled={log.isPending}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3.5 py-2 text-xs font-semibold text-tx-2 transition-all hover:border-border-strong hover:text-tx-1 disabled:opacity-50"
                    >
                      <SkipForward size={14} />
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'all' && (
        <section>
          {l2 && <div className="surface-panel rounded-2xl px-5 py-12 text-center text-sm text-tx-3">Loading medicines...</div>}
          {!l2 && !meds.length && (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-16 text-center">
              <div className="text-sm font-semibold text-tx-1">No medicines yet</div>
              <div className="mt-1 text-sm text-tx-2">Add medicines through Kutumb AI or prescription import.</div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {meds.map((m) => (
              <article key={m.id} className={cn('surface-panel card-lift rounded-2xl p-5', m.refill_alert && 'border-amber/30')}>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted text-accent">
                      <Tablets size={20} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-tx-1">{m.name}</h3>
                      <div className="mt-0.5 text-xs text-tx-3">{m.dosage}, {m.frequency}</div>
                    </div>
                  </div>
                  {m.is_emergency && (
                    <span className="rounded-full border border-amber/20 bg-amber/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber">
                      Emergency
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-tx-3">
                  <Pill size={14} strokeWidth={1.8} />
                  {m.category?.replace(/_/g, ' ')}
                </div>
                {m.refill_alert && (
                  <div className="mt-4 rounded-xl border border-amber/20 bg-amber/[0.08] px-3 py-2 text-sm text-amber">
                    Refill in {m.days_supply_remaining ?? '?'} days
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
