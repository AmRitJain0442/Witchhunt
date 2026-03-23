'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicineApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Schedule = { medicine_id: string; medicine_name: string; dosage: string; dose_time: string; status: string };
type Medicine = { id: string; name: string; category: string; dosage: string; frequency: string; is_emergency: boolean; current_stock?: number; days_supply_remaining?: number; refill_alert: boolean; end_date?: string };

const STATUS_STYLE: Record<string, string> = {
  taken:   'text-emerald-600 bg-emerald-50',
  skipped: 'text-slate-400 bg-slate-50',
  overdue: 'text-red-600 bg-red-50',
  pending: 'text-amber-600 bg-amber-50',
};
const STATUS_ICON: Record<string, string> = { taken: '✅', skipped: '⏭️', overdue: '🔴', pending: '⏰' };

export default function MedicinesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'today' | 'all'>('today');

  const { data: today,    isLoading: loadingToday } = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: allMeds,  isLoading: loadingAll }   = useQuery({ queryKey: ['medicines-all'],   queryFn: medicineApi.list,  retry: false });

  const logMutation = useMutation({
    mutationFn: ({ id, action, time }: { id: string; action: string; time: string }) =>
      medicineApi.logDose(id, action, time),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medicines-today'] }),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Medicines</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track doses and manage your cabinet</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        {(['today', 'all'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('pb-3 px-4 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >{t === 'today' ? "Today's schedule" : 'All medicines'}</button>
        ))}
      </div>

      {tab === 'today' && (
        <>
          {today?.adherence_pct !== undefined && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${today.adherence_pct}%` }} />
              </div>
              <span className="text-sm text-slate-500 shrink-0">{Math.round(today.adherence_pct)}% adherence</span>
            </div>
          )}
          {loadingToday && <div className="text-center py-12 text-slate-400">Loading…</div>}
          {!loadingToday && !today?.schedules?.length && (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🎉</div>
              <div className="font-medium text-slate-700">No medicines today</div>
              <div className="text-sm text-slate-400 mt-1">You're all caught up!</div>
            </div>
          )}
          <div className="space-y-2">
            {today?.schedules?.map((s: Schedule, i: number) => (
              <div key={i} className={cn('bg-white rounded-xl border p-4 flex items-center gap-4', s.status === 'overdue' ? 'border-red-200' : 'border-slate-100')}>
                <span className="text-xl">{STATUS_ICON[s.status] ?? '💊'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{s.medicine_name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.dosage} · {s.dose_time}</div>
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium capitalize', STATUS_STYLE[s.status] ?? '')}>{s.status}</span>
                {(s.status === 'pending' || s.status === 'overdue') && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => logMutation.mutate({ id: s.medicine_id, action: 'taken', time: s.dose_time })}
                      disabled={logMutation.isPending}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >Taken</button>
                    <button
                      onClick={() => logMutation.mutate({ id: s.medicine_id, action: 'skipped', time: s.dose_time })}
                      disabled={logMutation.isPending}
                      className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >Skip</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'all' && (
        <>
          {loadingAll && <div className="text-center py-12 text-slate-400">Loading…</div>}
          {!loadingAll && !allMeds?.medicines?.length && (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">💊</div>
              <div className="font-medium text-slate-700">No medicines yet</div>
              <div className="text-sm text-slate-400 mt-1">Add medicines via the AI chat or prescription upload.</div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {allMeds?.medicines?.map((m: Medicine) => (
              <div key={m.id} className={cn('bg-white rounded-xl border p-4', m.refill_alert ? 'border-amber-200' : 'border-slate-100')}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span>{m.is_emergency ? '🚑' : '💊'}</span>
                      <span className="font-semibold text-slate-800 text-sm">{m.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{m.dosage} · {m.frequency}</div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">{m.category.replace(/_/g, ' ')}</div>
                  </div>
                  {m.is_emergency && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">Emergency</span>
                  )}
                </div>
                {m.refill_alert && (
                  <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    ⚠️ Refill soon — {m.days_supply_remaining ?? '?'} days left
                  </div>
                )}
                {m.current_stock !== undefined && (
                  <div className="mt-2 text-xs text-slate-400">Stock: {m.current_stock} units</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
