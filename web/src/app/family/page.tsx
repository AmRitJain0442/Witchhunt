'use client';

import { Link2, Loader2, Phone, Plus, Shield, UserRoundPlus, UsersRound, X } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { familyApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Member = { id: string; name: string; relation: string; phone?: string; blood_group?: string; permission: string; is_linked: boolean };
type AddMemberForm = { name: string; relation: string; phone: string; permission: string };

const PERM = { view: 'View', manage: 'Manage', emergency_only: 'Emergency' };
const RELATIONS = ['father', 'mother', 'son', 'daughter', 'husband', 'wife', 'brother', 'sister', 'grandfather', 'grandmother', 'other'];

function AddModal({ onClose, onAdd, isPending }: { onClose: () => void; onAdd: (d: AddMemberForm) => void; isPending: boolean }) {
  const [form, setForm] = useState<AddMemberForm>({ name: '', relation: '', phone: '', permission: 'view' });
  const valid = form.name.trim() && form.relation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-tx-1/45" onClick={onClose} aria-label="Close add member dialog" />
      <div className="surface-panel relative w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-lg)]">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg text-tx-2"
          aria-label="Close"
        >
          <X size={17} strokeWidth={1.9} />
        </button>
        <div className="mb-5 pr-10">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">New member</div>
          <h2 className="text-xl font-semibold tracking-tight text-tx-1">Add family member</h2>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Full name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Suresh Kumar"
              className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none placeholder:text-tx-3"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Relation</span>
            <select
              value={form.relation}
              onChange={(e) => setForm({ ...form, relation: e.target.value })}
              className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none"
            >
              <option value="">Select relation</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Phone optional</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              type="tel"
              className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none placeholder:text-tx-3"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Permission</span>
            <select
              value={form.permission}
              onChange={(e) => setForm({ ...form, permission: e.target.value })}
              className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none"
            >
              {Object.entries(PERM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className="focus-ring rounded-xl border border-border bg-bg py-3 text-sm font-semibold text-tx-2 transition-all hover:border-border-strong hover:text-tx-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (valid) onAdd(form);
            }}
            disabled={!valid || isPending}
            className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-45"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />}
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
  const { data, isLoading } = useQuery({ queryKey: ['family'], queryFn: familyApi.list, retry: false });
  const members: Member[] = data?.members ?? [];

  const add = useMutation({
    mutationFn: familyApi.add,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family'] });
      setShowAdd(false);
    },
  });
  const invite = useMutation({ mutationFn: familyApi.invite, onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }) });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3">People</div>
          <h1 className="text-3xl font-semibold tracking-tight text-tx-1">Family</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-tx-2">
            {members.length} members, {members.filter((m) => m.is_linked).length} linked profiles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} strokeWidth={1.9} />
          Add member
        </button>
      </header>

      {isLoading && <div className="surface-panel rounded-2xl px-5 py-12 text-center text-sm text-tx-3">Loading family...</div>}

      {!isLoading && !members.length && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/70 px-5 py-20 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-muted text-accent">
            <UsersRound size={23} strokeWidth={1.8} />
          </div>
          <div className="text-sm font-semibold text-tx-1">No family members yet</div>
          <div className="mx-auto mt-1 max-w-sm text-sm leading-6 text-tx-2">Add members to track shared health context and invite them into Kutumb.</div>
          <button type="button" onClick={() => setShowAdd(true)} className="mt-5 text-sm font-semibold text-accent hover:underline">
            Add first member
          </button>
        </div>
      )}

      {!!members.length && (
        <div className="surface-panel overflow-hidden rounded-2xl">
          {members.map((m, i) => (
            <div key={m.id} className={cn('grid gap-4 px-4 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center', i < members.length - 1 && 'border-b border-border')}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-muted text-sm font-semibold text-accent">
                {m.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-tx-1">{m.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tx-3">
                  <span className="capitalize">{m.relation}</span>
                  {m.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone size={12} strokeWidth={1.8} />
                      {m.phone}
                    </span>
                  )}
                  {m.blood_group && <span className="font-[var(--font-mono)]">{m.blood_group}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
                  m.is_linked ? 'border-green/20 text-green' : 'border-border text-tx-3'
                )}>
                  <Link2 size={12} strokeWidth={1.8} />
                  {m.is_linked ? 'Linked' : 'Unlinked'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-tx-3">
                  <Shield size={12} strokeWidth={1.8} />
                  {PERM[m.permission as keyof typeof PERM] ?? m.permission}
                </span>
                {!m.is_linked && m.phone && (
                  <button
                    type="button"
                    onClick={() => invite.mutate(m.id)}
                    disabled={invite.isPending}
                    className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-muted disabled:opacity-50"
                  >
                    <UserRoundPlus size={14} strokeWidth={1.8} />
                    Invite
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={(d) => add.mutate(d)} isPending={add.isPending} />}
    </div>
  );
}
