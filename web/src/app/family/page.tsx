'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { familyApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type Member = { id: string; name: string; relation: string; date_of_birth?: string; gender?: string; blood_group?: string; phone?: string; permission: string; is_linked: boolean };

const RELATION_EMOJI: Record<string, string> = {
  father: '👨', mother: '👩', son: '👦', daughter: '👧',
  husband: '👨', wife: '👩', brother: '👦', sister: '👧',
  grandfather: '👴', grandmother: '👵',
};

const PERMISSION_LABEL: Record<string, string> = {
  view: 'Can view',
  manage: 'Can manage',
  emergency_only: 'Emergency only',
};

function AddMemberModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: Partial<Member>) => void }) {
  const [form, setForm] = useState<Partial<Member>>({ permission: 'view' });
  const relations = ['father', 'mother', 'son', 'daughter', 'husband', 'wife', 'brother', 'sister', 'grandfather', 'grandmother', 'other'];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Add family member</h2>
        <div className="space-y-3">
          <input placeholder="Full name *" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <select value={form.relation ?? ''} onChange={(e) => setForm({ ...form, relation: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-white">
            <option value="">Relation *</option>
            {relations.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
          <input placeholder="Phone number" type="tel" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <select value={form.permission} onChange={(e) => setForm({ ...form, permission: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 bg-white">
            {Object.entries(PERMISSION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => { if (form.name && form.relation) { onAdd(form); onClose(); } }}
            disabled={!form.name || !form.relation}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
            Add member
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

  const addMutation = useMutation({
    mutationFn: familyApi.add,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  });

  const inviteMutation = useMutation({
    mutationFn: familyApi.invite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['family'] }),
  });

  const members: Member[] = data?.members ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Family</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} · {members.filter((m) => m.is_linked).length} linked
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + Add member
        </button>
      </div>

      {isLoading && <div className="text-center py-12 text-slate-400">Loading…</div>}

      {!isLoading && !members.length && (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <div className="text-5xl mb-3">👨‍👩‍👧</div>
          <div className="font-semibold text-slate-700">No family members yet</div>
          <div className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
            Add family members to track their health and share updates.
          </div>
          <button onClick={() => setShowAdd(true)} className="mt-4 text-emerald-600 text-sm font-medium hover:underline">
            Add your first family member →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shrink-0">
              {RELATION_EMOJI[m.relation?.toLowerCase()] ?? '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800">{m.name}</div>
              <div className="text-sm text-slate-500 capitalize mt-0.5">{m.relation}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', m.is_linked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200')}>
                  {m.is_linked ? '✓ Linked' : 'Not linked'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                  {PERMISSION_LABEL[m.permission] ?? m.permission}
                </span>
                {m.blood_group && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                    🩸 {m.blood_group}
                  </span>
                )}
              </div>
            </div>
            {!m.is_linked && m.phone && (
              <button
                onClick={() => inviteMutation.mutate(m.id)}
                disabled={inviteMutation.isPending}
                className="shrink-0 text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Invite
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <AddMemberModal
          onClose={() => setShowAdd(false)}
          onAdd={(d) => addMutation.mutate(d)}
        />
      )}
    </div>
  );
}
