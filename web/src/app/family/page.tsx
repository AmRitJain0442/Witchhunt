'use client';

import { Link2, Loader2, Phone, Plus, Shield, UserRoundPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { familyApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { JasmineSprig, KolamDivider, KolamDotGrid } from '@/components/ui/Rangoli';

type Member = { id: string; name: string; relation: string; phone?: string; blood_group?: string; permission: string; is_linked: boolean };
type AddMemberForm = { name: string; relation: string; phone: string; permission: string };

const PERM = { view: 'View', manage: 'Manage', emergency_only: 'Emergency' };
const RELATIONS = ['father', 'mother', 'son', 'daughter', 'husband', 'wife', 'brother', 'sister', 'grandfather', 'grandmother', 'other'];

const TAU = Math.PI * 2;

// relation → folk color
function relationTone(rel: string) {
  if (['father', 'mother', 'grandfather', 'grandmother'].includes(rel)) return 'var(--vermilion)';
  if (['son', 'daughter'].includes(rel)) return 'var(--peacock)';
  if (['brother', 'sister'].includes(rel)) return 'var(--gold)';
  if (['husband', 'wife'].includes(rel)) return 'var(--vermilion-soft)';
  return 'var(--gold-soft)';
}

function generationLabel(rel: string) {
  if (['grandfather', 'grandmother'].includes(rel)) return 'elder';
  if (['father', 'mother'].includes(rel)) return 'parent';
  if (['husband', 'wife'].includes(rel)) return 'partner';
  if (['brother', 'sister'].includes(rel)) return 'sibling';
  if (['son', 'daughter'].includes(rel)) return 'child';
  return 'kin';
}

function AddModal({ onClose, onAdd, isPending }: { onClose: () => void; onAdd: (d: AddMemberForm) => void; isPending: boolean }) {
  const [form, setForm] = useState<AddMemberForm>({ name: '', relation: '', phone: '', permission: 'view' });
  const valid = form.name.trim() && form.relation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 backdrop-blur-sm" onClick={onClose} aria-label="Close add member dialog" style={{ background: 'color-mix(in oklch, var(--indigo-deep) 70%, transparent)' }} />
      <div className="petal-card kolam-frame relative w-full max-w-md p-7">
        <button
          type="button"
          onClick={onClose}
          className="focus-ring absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-tx-2"
          style={{ background: 'color-mix(in oklch, var(--surface-raised) 95%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 24%, transparent)' }}
          aria-label="Close"
        >
          <X size={17} strokeWidth={1.9} />
        </button>
        <div className="mb-5 pr-10">
          <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">✦ new petal</div>
          <h2 className="font-display text-[24px] font-medium tracking-tight text-tx-1">Weave a new member into the kolam</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Full name', key: 'name', placeholder: 'Suresh Kumar', type: 'text' as const },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-tx-3">{f.label}</span>
              <input
                value={form[f.key as 'name']}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                type={f.type}
                className="focus-ring w-full rounded-xl px-3.5 py-3 text-sm text-tx-1 outline-none placeholder:text-tx-3"
                style={{ background: 'color-mix(in oklch, var(--bg-subtle) 80%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 18%, var(--clay-rim))' }}
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-tx-3">Relation</span>
            <select
              value={form.relation}
              onChange={(e) => setForm({ ...form, relation: e.target.value })}
              className="focus-ring w-full rounded-xl px-3.5 py-3 text-sm text-tx-1 outline-none"
              style={{ background: 'color-mix(in oklch, var(--bg-subtle) 80%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 18%, var(--clay-rim))' }}
            >
              <option value="">Select relation</option>
              {RELATIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-tx-3">Phone (optional)</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
              type="tel"
              className="focus-ring w-full rounded-xl px-3.5 py-3 text-sm text-tx-1 outline-none placeholder:text-tx-3"
              style={{ background: 'color-mix(in oklch, var(--bg-subtle) 80%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 18%, var(--clay-rim))' }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-tx-3">Permission</span>
            <select
              value={form.permission}
              onChange={(e) => setForm({ ...form, permission: e.target.value })}
              className="focus-ring w-full rounded-xl px-3.5 py-3 text-sm text-tx-1 outline-none"
              style={{ background: 'color-mix(in oklch, var(--bg-subtle) 80%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 18%, var(--clay-rim))' }}
            >
              {Object.entries(PERM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onClose} className="focus-ring rounded-full py-3 text-sm font-semibold text-tx-2 transition-all hover:text-tx-1"
                  style={{ background: 'color-mix(in oklch, var(--surface-raised) 80%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 18%, var(--clay-rim))' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { if (valid) onAdd(form); }}
            disabled={!valid || isPending}
            className="clay-btn focus-ring inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />}
            Weave in
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- */

export default function FamilyPage() {
  const qc = useQueryClient();
  const { user, appUser } = useAuth();
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

  const displayName = appUser?.name ?? user?.displayName ?? user?.email ?? 'Me';
  const userInitial = displayName[0]?.toUpperCase() ?? 'M';
  const userName = displayName;

  // ring layout: up to 8 in inner, rest in outer
  const innerCount = Math.min(members.length, 8);
  const outerCount = Math.max(0, members.length - 8);
  const innerR = 0.36; // fraction of container
  const outerR = 0.46;

  const positioned = members.map((m, i) => {
    const ring = i < 8 ? 'inner' : 'outer';
    const idxInRing = ring === 'inner' ? i : i - 8;
    const countInRing = ring === 'inner' ? innerCount : outerCount;
    const r = ring === 'inner' ? innerR : outerR;
    const angle = (TAU * idxInRing) / countInRing - Math.PI / 2 + (ring === 'outer' ? Math.PI / countInRing : 0);
    return { member: m, angle, r, ring };
  });

  const visualSize = 720; // svg viewBox

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <KolamDotGrid className="!fixed !inset-0 -z-10 !opacity-40" size="md" fade={false} />

      <header className="mb-10 grid items-end gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
            ✦ कुटुम्ब · the family wheel ✦
          </div>
          <h1 className="font-display text-[40px] font-medium leading-[1.05] tracking-tight text-tx-1 sm:text-[52px]">
            One household, <span className="italic text-gold-grad">many petals.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-7 text-tx-2">
            {members.length === 0 ? 'No members yet — add the first petal.' : `${members.length} ${members.length === 1 ? 'petal' : 'petals'} woven into your family kolam, ${members.filter((m) => m.is_linked).length} linked.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="clay-btn focus-ring inline-flex w-fit items-center gap-2 px-5 py-3 text-sm font-semibold"
        >
          <Plus size={16} strokeWidth={2.2} />
          Add member
        </button>
      </header>

      {isLoading && (
        <div className="petal-card mx-auto max-w-md px-6 py-16 text-center text-sm text-tx-3">
          <div className="mx-auto mb-4 h-2 w-2 animate-pulse rounded-full bg-gold" />
          Drawing the family kolam…
        </div>
      )}

      {!isLoading && (
        <>
          {/* THE WHEEL */}
          <section className="relative mx-auto aspect-square w-full max-w-[760px]">
            {/* glow halo */}
            <div className="absolute inset-12 rounded-full opacity-50 blur-3xl"
                 style={{ background: 'radial-gradient(circle at center, color-mix(in oklch, var(--gold) 35%, transparent), transparent 65%)' }} />

            {/* SVG: kolam connecting strokes + dot crowns */}
            <svg viewBox={`0 0 ${visualSize} ${visualSize}`} className="kolam-stroke absolute inset-0 h-full w-full">
              {(() => {
                const cx = visualSize / 2;
                const cy = visualSize / 2;
                const innerRpx = innerR * visualSize;
                const outerRpx = outerR * visualSize;
                return (
                  <>
                    {/* outer dot crown */}
                    <g className="slow-spin" style={{ transformOrigin: `${cx}px ${cy}px` }}>
                      {Array.from({ length: 84 }).map((_, i) => {
                        const a = (TAU * i) / 84;
                        const big = i % 7 === 0;
                        const r = outerRpx + 56;
                        return (
                          <circle
                            key={i}
                            cx={cx + r * Math.cos(a)}
                            cy={cy + r * Math.sin(a)}
                            r={big ? 2.4 : 1.2}
                            fill={big ? 'var(--vermilion)' : 'var(--kolam-dot)'}
                            opacity={big ? 0.85 : 0.55}
                          />
                        );
                      })}
                    </g>

                    {/* dotted ring guides */}
                    <circle cx={cx} cy={cy} r={innerRpx} fill="none" stroke="var(--kolam-line)" strokeWidth={1} strokeDasharray="2 6" opacity={0.55} />
                    {outerCount > 0 && (
                      <circle cx={cx} cy={cy} r={outerRpx} fill="none" stroke="var(--kolam-line)" strokeWidth={1} strokeDasharray="2 6" opacity={0.55} />
                    )}

                    {/* slow-spinning floral mid-ring */}
                    <g className="slow-spin-rev" style={{ transformOrigin: `${cx}px ${cy}px` }}>
                      {Array.from({ length: 24 }).map((_, i) => {
                        const a = (TAU * i) / 24;
                        const half = TAU / 24 / 2;
                        const r1 = innerRpx - 30;
                        const r2 = innerRpx - 6;
                        const cpr = (r1 + r2) * 0.62;
                        const [x1, y1] = [cx + r1 * Math.cos(a - half), cy + r1 * Math.sin(a - half)];
                        const [x2, y2] = [cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)];
                        const [x3, y3] = [cx + r1 * Math.cos(a + half), cy + r1 * Math.sin(a + half)];
                        const [c1x, c1y] = [cx + cpr * Math.cos(a - half * 0.55), cy + cpr * Math.sin(a - half * 0.55)];
                        const [c2x, c2y] = [cx + cpr * Math.cos(a + half * 0.55), cy + cpr * Math.sin(a + half * 0.55)];
                        return (
                          <path
                            key={i}
                            d={`M ${x1} ${y1} Q ${c1x} ${c1y} ${x2} ${y2} Q ${c2x} ${c2y} ${x3} ${y3}`}
                            fill="none"
                            stroke="var(--gold)"
                            strokeWidth={1}
                            strokeLinecap="round"
                            opacity={0.5}
                          />
                        );
                      })}
                    </g>

                    {/* connecting kolam strokes from center to each member */}
                    {positioned.map((p, i) => {
                      const radPx = p.r * visualSize;
                      const x = cx + radPx * Math.cos(p.angle);
                      const y = cy + radPx * Math.sin(p.angle);
                      const innerEdgeR = 70;
                      const x0 = cx + innerEdgeR * Math.cos(p.angle);
                      const y0 = cy + innerEdgeR * Math.sin(p.angle);
                      // s-curve control points
                      const cpr1 = innerEdgeR + (radPx - innerEdgeR) * 0.35;
                      const cpr2 = innerEdgeR + (radPx - innerEdgeR) * 0.7;
                      const offset = 0.06;
                      const [cp1x, cp1y] = [cx + cpr1 * Math.cos(p.angle - offset), cy + cpr1 * Math.sin(p.angle - offset)];
                      const [cp2x, cp2y] = [cx + cpr2 * Math.cos(p.angle + offset), cy + cpr2 * Math.sin(p.angle + offset)];
                      const tone = relationTone(p.member.relation);
                      return (
                        <g key={i}>
                          <path
                            d={`M ${x0} ${y0} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`}
                            fill="none"
                            stroke={`color-mix(in oklch, ${tone} 65%, transparent)`}
                            strokeWidth={1.4}
                            strokeLinecap="round"
                            pathLength={1}
                          />
                          {/* tiny dots along the stroke */}
                          {[0.3, 0.55, 0.8].map((t, j) => {
                            const r = innerEdgeR + (radPx - innerEdgeR) * t;
                            const dx = cx + r * Math.cos(p.angle + (t - 0.5) * 0.06);
                            const dy = cy + r * Math.sin(p.angle + (t - 0.5) * 0.06);
                            return <circle key={j} cx={dx} cy={dy} r={1.5} fill={tone} opacity={0.7} />;
                          })}
                        </g>
                      );
                    })}

                    {/* center kolam petal cluster */}
                    <g>
                      {Array.from({ length: 8 }).map((_, i) => {
                        const a = (TAU * i) / 8;
                        const half = TAU / 8 / 2;
                        const r1 = 50;
                        const r2 = 78;
                        const [x1, y1] = [cx + r1 * Math.cos(a - half), cy + r1 * Math.sin(a - half)];
                        const [x2, y2] = [cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)];
                        const [x3, y3] = [cx + r1 * Math.cos(a + half), cy + r1 * Math.sin(a + half)];
                        const cpr = (r1 + r2) * 0.62;
                        const [c1x, c1y] = [cx + cpr * Math.cos(a - half * 0.55), cy + cpr * Math.sin(a - half * 0.55)];
                        const [c2x, c2y] = [cx + cpr * Math.cos(a + half * 0.55), cy + cpr * Math.sin(a + half * 0.55)];
                        return (
                          <path
                            key={i}
                            d={`M ${x1} ${y1} Q ${c1x} ${c1y} ${x2} ${y2} Q ${c2x} ${c2y} ${x3} ${y3}`}
                            fill="color-mix(in oklch, var(--gold) 22%, transparent)"
                            stroke="var(--gold)"
                            strokeWidth={1.2}
                            strokeLinecap="round"
                            opacity={0.85}
                          />
                        );
                      })}
                    </g>
                  </>
                );
              })()}
            </svg>

            {/* center: USER node (HTML for accessibility) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div
                  className="flex h-[120px] w-[120px] items-center justify-center rounded-full font-display text-[44px] font-medium tracking-tight"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, color-mix(in oklch, var(--gold) 70%, var(--surface)) 0%, color-mix(in oklch, var(--vermilion) 28%, var(--surface)) 95%)',
                    color: 'var(--indigo-deep)',
                    boxShadow: '0 0 0 4px var(--bg), 0 0 0 5px color-mix(in oklch, var(--gold) 50%, transparent), 0 22px 46px color-mix(in oklch, var(--vermilion) 30%, transparent), inset 0 -3px 10px color-mix(in oklch, var(--vermilion) 28%, transparent)',
                  }}
                >
                  {userInitial}
                </div>
                <div className="mt-3 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">you · आप</div>
                  <div className="mt-0.5 font-display text-[14px] font-medium text-tx-1">{userName}</div>
                </div>
              </div>
            </div>

            {/* member petal-nodes */}
            {positioned.map((p, i) => {
              const tone = relationTone(p.member.relation);
              const xPct = 50 + p.r * 100 * Math.cos(p.angle);
              const yPct = 50 + p.r * 100 * Math.sin(p.angle);
              return (
                <button
                  key={p.member.id}
                  type="button"
                  className="focus-ring group absolute -translate-x-1/2 -translate-y-1/2 text-left"
                  style={{ left: `${xPct}%`, top: `${yPct}%`, animationDelay: `${i * 80}ms` }}
                  onClick={() => {
                    if (!p.member.is_linked && p.member.phone) invite.mutate(p.member.id);
                  }}
                  aria-label={`${p.member.name}, ${p.member.relation}`}
                >
                  <div className="relative">
                    {/* avatar petal */}
                    <div
                      className="flex h-[68px] w-[68px] items-center justify-center rounded-full font-display text-[26px] font-medium transition-transform duration-300 group-hover:-translate-y-1"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${tone} 70%, var(--surface)) 0%, color-mix(in oklch, ${tone} 30%, var(--surface)) 100%)`,
                        color: 'var(--indigo-deep)',
                        boxShadow: `0 0 0 3px var(--bg), 0 0 0 4px color-mix(in oklch, ${tone} 50%, transparent), 0 14px 28px color-mix(in oklch, ${tone} 35%, transparent)`,
                      }}
                    >
                      {p.member.name[0]?.toUpperCase()}
                    </div>
                    {/* linked dot */}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{
                        background: p.member.is_linked ? 'var(--gold)' : 'var(--surface-raised)',
                        border: '2px solid var(--bg)',
                        color: p.member.is_linked ? 'var(--indigo-deep)' : 'var(--tx-3)',
                      }}
                    >
                      {p.member.is_linked ? <Link2 size={9} strokeWidth={2.6} /> : <Plus size={9} strokeWidth={2.6} />}
                    </span>
                  </div>
                  {/* name strip */}
                  <div className="absolute left-1/2 top-[80px] w-[120px] -translate-x-1/2 text-center">
                    <div className="font-display text-[13.5px] font-medium leading-tight text-tx-1">{p.member.name}</div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-tx-3">
                      {generationLabel(p.member.relation)} · {p.member.relation}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* "add member" petal in outer ring */}
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="focus-ring group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + 50 * 0.46 * Math.cos(-Math.PI / 2 - 0.4)}%`, top: `${50 + 50 * 0.46 * Math.sin(-Math.PI / 2 - 0.4)}%` }}
              aria-label="Add family member"
            >
              <div
                className="flex h-[64px] w-[64px] items-center justify-center rounded-full text-gold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90"
                style={{
                  background: 'color-mix(in oklch, var(--surface-raised) 90%, transparent)',
                  border: '1.5px dashed color-mix(in oklch, var(--gold) 65%, transparent)',
                  boxShadow: '0 14px 28px color-mix(in oklch, var(--gold) 22%, transparent)',
                }}
              >
                <Plus size={26} strokeWidth={2} />
              </div>
              <div className="absolute left-1/2 top-[74px] w-[120px] -translate-x-1/2 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                add petal
              </div>
            </button>

            {/* corner jasmine */}
            <JasmineSprig size={42} className="absolute left-1 top-1 opacity-90" color="var(--jasmine)" accent="var(--vermilion)" />
            <JasmineSprig size={36} className="absolute right-1 top-1 opacity-85" color="var(--jasmine)" accent="var(--gold)" />
            <JasmineSprig size={36} className="absolute bottom-1 left-1 opacity-85" color="var(--jasmine)" accent="var(--peacock)" />
            <JasmineSprig size={42} className="absolute bottom-1 right-1 opacity-90" color="var(--jasmine)" accent="var(--gold)" />
          </section>

          <KolamDivider className="my-14" />

          {/* MEMBER LIST (textual fallback) */}
          {!members.length ? (
            <div className="petal-card mx-auto max-w-lg px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
                   style={{ background: 'color-mix(in oklch, var(--gold) 22%, var(--surface))' }}>
                <UserRoundPlus size={20} className="text-gold" strokeWidth={1.9} />
              </div>
              <div className="font-display text-[20px] font-medium text-tx-1">An empty courtyard</div>
              <div className="mx-auto mt-2 max-w-sm text-sm leading-6 text-tx-2">
                Add a family member to draw the first petal of your kolam — they&apos;ll receive an invitation to join.
              </div>
              <button type="button" onClick={() => setShowAdd(true)} className="clay-btn focus-ring mt-6 inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
                <Plus size={15} strokeWidth={2.2} />
                Add first petal
              </button>
            </div>
          ) : (
            <section>
              <div className="mb-6 text-center">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">✦ the petals ✦</div>
                <h2 className="mt-2 font-display text-[28px] font-medium tracking-tight text-tx-1">Each one, one care</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => {
                  const tone = relationTone(m.relation);
                  return (
                    <article key={m.id} className="petal-card lift relative overflow-hidden p-5">
                      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-30 blur-2xl" style={{ background: tone }} />
                      <div className="relative flex items-start gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-[20px] font-medium"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${tone} 65%, var(--surface)) 0%, color-mix(in oklch, ${tone} 30%, var(--surface)) 100%)`,
                            color: 'var(--indigo-deep)',
                            boxShadow: `0 0 0 1px color-mix(in oklch, ${tone} 50%, transparent)`,
                          }}
                        >
                          {m.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-[16px] font-medium text-tx-1">{m.name}</div>
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-tx-3">
                            {generationLabel(m.relation)} · {m.relation}
                          </div>
                          {m.phone && (
                            <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-tx-2">
                              <Phone size={11} strokeWidth={1.9} className="text-gold" />
                              {m.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span
                          className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em]')}
                          style={{
                            background: m.is_linked ? 'color-mix(in oklch, var(--gold) 18%, transparent)' : 'color-mix(in oklch, var(--surface-raised) 80%, transparent)',
                            color: m.is_linked ? 'var(--gold)' : 'var(--tx-3)',
                            border: `1px solid color-mix(in oklch, ${m.is_linked ? 'var(--gold)' : 'var(--tx-3)'} 28%, transparent)`,
                          }}
                        >
                          <Link2 size={11} strokeWidth={2} />
                          {m.is_linked ? 'Linked' : 'Unlinked'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-tx-3"
                              style={{ background: 'color-mix(in oklch, var(--surface-raised) 80%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 14%, transparent)' }}>
                          <Shield size={11} strokeWidth={2} />
                          {PERM[m.permission as keyof typeof PERM] ?? m.permission}
                        </span>
                        {m.blood_group && (
                          <span className="font-mono text-[11px] font-semibold text-vermilion">{m.blood_group}</span>
                        )}
                      </div>

                      {!m.is_linked && m.phone && (
                        <button
                          type="button"
                          onClick={() => invite.mutate(m.id)}
                          disabled={invite.isPending}
                          className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-semibold text-gold transition-colors hover:text-tx-1 disabled:opacity-50"
                          style={{ background: 'color-mix(in oklch, var(--gold) 14%, transparent)', border: '1px solid color-mix(in oklch, var(--gold) 35%, transparent)' }}
                        >
                          <UserRoundPlus size={13} strokeWidth={2} />
                          Send invitation
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={(d) => add.mutate(d)} isPending={add.isPending} />}
    </div>
  );
}
