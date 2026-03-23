'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Member = { id: string; name: string; relation: string; phone?: string; blood_group?: string; permission: string; is_linked: boolean };

const PERM = { view: 'View', manage: 'Manage', emergency_only: 'Emergency' };

function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: unknown) => void }) {
  const [form, setForm] = useState({ name: '', relation: '', phone: '', permission: 'view' });
  const relations = ['father','mother','son','daughter','husband','wife','brother','sister','grandfather','grandmother','other'];
  const valid = form.name.trim() && form.relation;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm p-6 shadow-[var(--shadow-lg)]">
        <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">New member</div>
        <div className="text-lg font-semibold text-tx-1 mb-5">Add family member</div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Full name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Suresh Kumar"
              className="w-full bg-bg border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 placeholder:text-tx-3 outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Relation</label>
            <select value={form.relation} onChange={e => setForm({...form, relation: e.target.value})}
              className="w-full bg-bg border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 outline-none transition-colors capitalize">
              <option value="">Select relation</option>
              {relations.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Phone <span className="normal-case tracking-normal">optional</span></label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98765 43210" type="tel"
              className="w-full bg-bg border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 placeholder:text-tx-3 outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Permission</label>
            <select value={form.permission} onChange={e => setForm({...form, permission: e.target.value})}
              className="w-full bg-bg border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 outline-none transition-colors">
              {Object.entries(PERM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose} className="flex-1 border border-border text-tx-2 hover:border-border-strong rounded-xl py-2.5 text-[13px] transition-colors">Cancel</button>
          <button onClick={() => { if (valid) { onAdd(form); onClose(); } }} disabled={!valid}
            className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-text rounded-xl py-2.5 text-[13px] font-medium transition-colors">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FamilyPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading }   = useQuery({ queryKey: ['family'], queryFn: familyApi.list, retry: false });
  const members: Member[]     = data?.members ?? [];

  const add    = useMutation({ mutationFn: familyApi.add,    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }) });
  const invite = useMutation({ mutationFn: familyApi.invite, onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }) });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-tx-3 mb-1">People</div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Family</h1>
          <p className="text-[13px] text-tx-2 mt-1">{members.length} members · {members.filter(m => m.is_linked).length} linked</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-accent hover:bg-accent-hover text-accent-text text-[13px] font-medium px-4 py-2 rounded-lg transition-colors">
          + Add
        </button>
      </div>

      {isLoading && <div className="text-[13px] text-tx-3 py-8 text-center">Loading…</div>}

      {!isLoading && !members.length && (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl">
          <div className="text-[13px] font-medium text-tx-2">No family members yet</div>
          <div className="text-[12px] text-tx-3 mt-1 max-w-xs mx-auto">
            Add members to track their health and share updates
          </div>
          <button onClick={() => setShowAdd(true)} className="mt-4 text-[13px] text-accent hover:underline">
            Add first member →
          </button>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {members.map((m, i) => (
          <div key={m.id} className={cn('flex items-center px-5 py-4 gap-4', i < members.length - 1 && 'border-b border-border')}>
            <div className="w-8 h-8 rounded-full bg-accent-muted text-accent text-[12px] font-semibold flex items-center justify-center shrink-0">
              {m.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-tx-1">{m.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-tx-3 capitalize">{m.relation}</span>
                {m.blood_group && (
                  <><span className="text-tx-3">·</span><span className="text-[12px] text-tx-3 font-mono">{m.blood_group}</span></>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border',
                m.is_linked ? 'border-green/20 text-green' : 'border-border text-tx-3'
              )}>
                {m.is_linked ? 'Linked' : 'Unlinked'}
              </span>
              <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-tx-3">
                {PERM[m.permission as keyof typeof PERM] ?? m.permission}
              </span>
              {!m.is_linked && m.phone && (
                <button onClick={() => invite.mutate(m.id)} disabled={invite.isPending}
                  className="text-[12px] text-accent hover:underline transition-colors">
                  Invite
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={d => add.mutate(d)} />}
    </div>
  );
}
