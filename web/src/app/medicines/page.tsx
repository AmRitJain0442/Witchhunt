'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicineApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Schedule = { medicine_id: string; medicine_name: string; dosage: string; dose_time: string; status: string };
type Medicine  = { id: string; name: string; category: string; dosage: string; frequency: string; is_emergency: boolean; current_stock?: number; days_supply_remaining?: number; refill_alert: boolean };

const DOT: Record<string, string> = {
  taken:   'bg-green',
  skipped: 'bg-tx-3',
  overdue: 'bg-red',
  pending: 'bg-border-strong',
};

export default function MedicinesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'today' | 'all'>('today');

  const { data: today,   isLoading: l1 } = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: allMeds, isLoading: l2 } = useQuery({ queryKey: ['medicines-all'],   queryFn: medicineApi.list,  retry: false });

  const log = useMutation({
    mutationFn: ({ id, action, time }: { id: string; action: string; time: string }) =>
      medicineApi.logDose(id, action, time),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines-today'] }),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">Medicines</div>
        <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Medicine cabinet</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-8">
        {(['today', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('pb-3 mr-8 text-[13px] border-b-2 -mb-px transition-all',
              tab === t ? 'border-accent text-tx-1 font-medium' : 'border-transparent text-tx-3 hover:text-tx-2'
            )}>
            {t === 'today' ? 'Today' : 'All medicines'}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <>
          {today?.adherence_pct !== undefined && (
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-border overflow-hidden">
                <div className="h-full bg-accent transition-all" style={{ width: `${today.adherence_pct}%` }} />
              </div>
              <span className="text-[12px] text-tx-3 font-mono shrink-0">{Math.round(today.adherence_pct)}% adherence</span>
            </div>
          )}
          {l1 && <div className="text-[13px] text-tx-3 py-8 text-center">Loading…</div>}
          {!l1 && !today?.schedules?.length && (
            <div className="py-16 text-center border border-dashed border-border rounded-xl">
              <div className="text-[13px] text-tx-2 font-medium">All done for today</div>
              <div className="text-[12px] text-tx-3 mt-1">No pending doses</div>
            </div>
          )}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {today?.schedules?.map((s: Schedule, i: number) => (
              <div key={i} className={cn('flex items-center px-5 py-4 border-b border-border last:border-0 gap-4', s.status === 'overdue' && 'bg-red/[0.03]')}>
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT[s.status] ?? 'bg-border-strong')} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-tx-1">{s.medicine_name}</div>
                  <div className="text-[12px] text-tx-3 font-mono mt-0.5">{s.dosage} · {s.dose_time}</div>
                </div>
                <span className={cn('text-[11px] uppercase tracking-wider shrink-0',
                  s.status === 'taken' ? 'text-green' : s.status === 'overdue' ? 'text-red' : s.status === 'skipped' ? 'text-tx-3' : 'text-tx-3'
                )}>{s.status}</span>
                {(s.status === 'pending' || s.status === 'overdue') && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => log.mutate({ id: s.medicine_id, action: 'taken', time: s.dose_time })} disabled={log.isPending}
                      className="text-[12px] bg-accent text-accent-text hover:bg-accent-hover px-3.5 py-1.5 rounded-lg transition-colors font-medium">
                      Taken
                    </button>
                    <button onClick={() => log.mutate({ id: s.medicine_id, action: 'skipped', time: s.dose_time })} disabled={log.isPending}
                      className="text-[12px] border border-border text-tx-2 hover:border-border-strong px-3.5 py-1.5 rounded-lg transition-colors">
                      Skip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'all' && (
        <>
          {l2 && <div className="text-[13px] text-tx-3 py-8 text-center">Loading…</div>}
          {!l2 && !allMeds?.medicines?.length && (
            <div className="py-16 text-center border border-dashed border-border rounded-xl">
              <div className="text-[13px] text-tx-2 font-medium">No medicines yet</div>
              <div className="text-[12px] text-tx-3 mt-1">Add medicines via Kutumb AI</div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {allMeds?.medicines?.map((m: Medicine) => (
              <div key={m.id} className={cn('bg-surface border rounded-xl p-5', m.refill_alert ? 'border-amber/30' : 'border-border')}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[14px] font-medium text-tx-1">{m.name}</div>
                    <div className="text-[12px] text-tx-3 font-mono mt-0.5">{m.dosage} · {m.frequency}</div>
                  </div>
                  {m.is_emergency && (
                    <span className="text-[10px] uppercase tracking-wider border border-amber/30 text-amber px-2 py-0.5 rounded-full">
                      Emergency
                    </span>
                  )}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-tx-3 capitalize">{m.category?.replace(/_/g,' ')}</div>
                {m.refill_alert && (
                  <div className="mt-3 text-[12px] text-amber border border-amber/20 bg-amber/5 rounded-lg px-3 py-1.5">
                    Refill in {m.days_supply_remaining ?? '?'} days
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
