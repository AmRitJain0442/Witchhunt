'use client';

import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Circle,
  HeartPulse,
  Pill,
  Salad,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Waves,
  Wind,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { checkinApi, healthApi, insightApi, medicineApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  JasmineSprig,
  KolamDivider,
  KolamDotGrid,
  KolamDotStrip,
  KolamHalo,
} from '@/components/ui/Rangoli';
import { AdherenceRing, DayRhythm, SparkLine } from '@/components/ui/MiniGraphs';

type OrganKey = 'heart' | 'brain' | 'gut' | 'lungs';
type OrganMeta = { key: OrganKey; label: string; sanskrit: string; icon: typeof HeartPulse; color: string };

const ORGANS: OrganMeta[] = [
  { key: 'heart', label: 'Heart', sanskrit: 'हृदय', icon: HeartPulse, color: 'var(--vermilion)' },
  { key: 'brain', label: 'Brain', sanskrit: 'मस्तिष्क', icon: Brain, color: 'var(--peacock)' },
  { key: 'gut',   label: 'Gut',   sanskrit: 'जठर',    icon: Salad,    color: 'var(--gold)' },
  { key: 'lungs', label: 'Lungs', sanskrit: 'फुफ्फुस', icon: Wind,     color: 'var(--sky)' },
];

function StatusIcon({ status }: { status: string }) {
  if (status === 'taken') return <CheckCircle2 size={15} className="text-gold" strokeWidth={2.2} />;
  if (status === 'overdue') return <AlertTriangle size={15} className="text-vermilion" strokeWidth={2.2} />;
  if (status === 'skipped') return <Circle size={13} className="text-tx-3" strokeWidth={2} />;
  return <Circle size={13} className="text-peacock" strokeWidth={2} />;
}

function TrendGlyph({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={13} strokeWidth={2.2} />;
  if (trend === 'declining') return <TrendingDown size={13} strokeWidth={2.2} />;
  return <Waves size={13} strokeWidth={2.2} />;
}

function trendTone(trend: string) {
  if (trend === 'improving') return 'var(--gold)';
  if (trend === 'declining') return 'var(--vermilion)';
  return 'var(--tx-3)';
}

const TAU = Math.PI * 2;

/* ----------------- mini organ rangoli (compact /health style) -- */
function MiniOrganWheel({
  scores,
}: {
  scores: Record<OrganKey, { score: number; trend: string }> & { overall: number };
}) {
  const VIEW = 360;
  const CX = VIEW / 2;
  const CY = VIEW / 2;
  const INNER_R = 56;
  const OUTER_R = 152;
  const HALF = (TAU / 4) * 0.42;

  function petalPath(angle: number, frac: number) {
    const inR = INNER_R;
    const outR = INNER_R + (OUTER_R - INNER_R) * Math.max(0, Math.min(1, frac));
    const ix1 = CX + inR * Math.cos(angle - HALF);
    const iy1 = CY + inR * Math.sin(angle - HALF);
    const ix2 = CX + inR * Math.cos(angle + HALF);
    const iy2 = CY + inR * Math.sin(angle + HALF);
    const ox = CX + outR * Math.cos(angle);
    const oy = CY + outR * Math.sin(angle);
    const cpr = (inR + outR) * 0.62;
    const c1x = CX + cpr * Math.cos(angle - HALF * 0.55);
    const c1y = CY + cpr * Math.sin(angle - HALF * 0.55);
    const c2x = CX + cpr * Math.cos(angle + HALF * 0.55);
    const c2y = CY + cpr * Math.sin(angle + HALF * 0.55);
    return `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} Q ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)} Q ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${inR} ${inR} 0 0 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
  }

  const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];

  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="kolam-stroke h-full w-full">
      {/* outer dot crown — slow spin */}
      <g className="slow-spin" style={{ transformOrigin: `${CX}px ${CY}px` }}>
        {Array.from({ length: 48 }).map((_, i) => {
          const a = (TAU * i) / 48;
          const big = i % 6 === 0;
          const r = OUTER_R + 22;
          return (
            <circle
              key={i}
              cx={CX + r * Math.cos(a)}
              cy={CY + r * Math.sin(a)}
              r={big ? 1.8 : 1}
              fill={big ? 'var(--vermilion)' : 'var(--kolam-dot)'}
              opacity={big ? 0.85 : 0.5}
            />
          );
        })}
      </g>
      <circle cx={CX} cy={CY} r={OUTER_R + 8} fill="none" stroke="var(--kolam-line)" strokeWidth={1} strokeDasharray="2 5" opacity={0.5} />
      <circle cx={CX} cy={CY} r={INNER_R - 4} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 5" opacity={0.55} />

      {ORGANS.map((org, i) => {
        const organ = scores[org.key];
        const score = organ?.score ?? 0;
        const angle = angles[i];
        return (
          <g key={org.key}>
            <path d={petalPath(angle, 1)} fill={`color-mix(in oklch, ${org.color} 12%, transparent)`} stroke={`color-mix(in oklch, ${org.color} 35%, transparent)`} strokeWidth={1} pathLength={1} />
            {score > 0 && <path d={petalPath(angle, score / 100)} fill={`color-mix(in oklch, ${org.color} 65%, transparent)`} pathLength={1} />}
            <path d={petalPath(angle, 1)} fill="none" stroke={org.color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} pathLength={1} />
          </g>
        );
      })}

      {/* center disk */}
      <circle cx={CX} cy={CY} r={INNER_R - 8} fill="var(--surface)" opacity={0.9} />
      <circle cx={CX} cy={CY} r={INNER_R - 8} fill="none" stroke="var(--gold)" strokeWidth={1.2} strokeDasharray="3 4" opacity={0.7} />
      <text x={CX} y={CY - 4} textAnchor="middle" className="font-display fill-tx-1" style={{ fontSize: 36, fontWeight: 500 }}>
        {Math.round(scores.overall)}
      </text>
      <text x={CX} y={CY + 16} textAnchor="middle" className="fill-tx-3" style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.32em', textTransform: 'uppercase' }}>
        overall
      </text>

      {/* score badges at petal tips */}
      {ORGANS.map((org, i) => {
        const organ = scores[org.key];
        const score = organ?.score ?? 0;
        const angle = angles[i];
        const lx = CX + (OUTER_R + 4) * Math.cos(angle);
        const ly = CY + (OUTER_R + 4) * Math.sin(angle);
        return (
          <g key={`b-${org.key}`}>
            <circle cx={lx} cy={ly} r={14} fill="var(--surface-raised)" stroke={org.color} strokeWidth={1} />
            <text x={lx} y={ly + 4} textAnchor="middle" className="fill-tx-1" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>
              {Math.round(score)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------------- */

type HistoryPoint = { date: string; score: number };
type HistoryResponse = { data_points?: HistoryPoint[]; average_score?: number; min_score?: number; max_score?: number };

type Schedule = { medicine_name: string; dosage: string; dose_time: string; status: 'taken' | 'pending' | 'overdue' | 'skipped' };
type Advisory = { severity: 'critical' | 'warning' | 'info'; title: string; body: string };

function parseHourFromDoseTime(t: string): number {
  // "08:00", "08:00 AM", "8:30 pm" — be permissive
  if (!t) return 0;
  const m = t.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h + mins / 60;
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const { data: scores } = useQuery({ queryKey: ['health-scores'], queryFn: healthApi.scores, retry: false });
  const { data: history } = useQuery<HistoryResponse>({
    queryKey: ['health-history-7d'],
    queryFn: () => healthApi.history(7),
    retry: false,
  });
  const { data: today } = useQuery({ queryKey: ['checkin-today'], queryFn: checkinApi.today, retry: false });
  const { data: meds } = useQuery({ queryKey: ['medicines-today'], queryFn: medicineApi.today, retry: false });
  const { data: advice } = useQuery({ queryKey: ['advisories'], queryFn: insightApi.advisories, retry: false });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 20 ? 'Good evening' : 'Good night';
  const sanskritGreeting = hour < 12 ? 'सुप्रभात' : hour < 17 ? 'नमस्ते' : 'शुभ संध्या';
  const name = appUser?.name?.split(' ')[0] ?? '';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const schedules: Schedule[] = (meds?.schedules ?? []) as Schedule[];
  const pending = schedules.filter((s) => ['pending', 'overdue'].includes(s.status)).length;
  const taken = schedules.filter((s) => s.status === 'taken').length;
  const adherence = meds?.adherence_pct ?? (schedules.length ? (taken / schedules.length) * 100 : 0);

  const advisories: Advisory[] = advice?.advisories ?? [];
  const critical = advisories.filter((a) => a.severity === 'critical').slice(0, 2);
  const others = advisories.filter((a) => a.severity !== 'critical').slice(0, 4);

  const sparklineData = history?.data_points?.map((p) => p.score) ?? [];

  const dayMarks = schedules.map((s) => ({
    hour: parseHourFromDoseTime(s.dose_time),
    status: s.status,
    label: `${s.medicine_name} · ${s.dose_time}`,
  }));

  const overallScore = scores ? Math.round(scores.overall) : null;
  const overallTrend = sparklineData.length >= 2
    ? sparklineData[sparklineData.length - 1] - sparklineData[0]
    : 0;

  return (
    <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <KolamDotGrid className="!fixed !inset-0 -z-10 !opacity-30" size="md" fade={false} />

      {/* ============================================================= */}
      {/* WELCOME STRIP                                                  */}
      {/* ============================================================= */}
      <section className="petal-card kolam-frame relative mb-6 overflow-hidden p-7 sm:p-9">
        <KolamDotStrip className="absolute inset-x-9 top-3" count={26} every={5} accent="var(--gold)" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'var(--vermilion)' }}
        />
        <div
          className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--gold)' }}
        />

        <div className="relative grid items-end gap-6 lg:grid-cols-[1.4fr_auto]">
          <div>
            <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
              ✦ {dateStr}
            </div>
            <h1 className="font-display text-[36px] font-medium leading-[1.05] tracking-tight text-tx-1 sm:text-[48px]">
              {greeting}{name ? `, ${name}` : ''}
              <span className="ml-3 inline-block text-[28px] italic text-gold-grad sm:text-[36px]" style={{ fontVariationSettings: '"SOFT" 100' }}>
                {sanskritGreeting}.
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-7 text-tx-2">
              Your family&apos;s rangoli for today — check-ins, medicines, organ scores and gentle advisories, all in one quiet wheel.
            </p>
          </div>
          <Link
            href="/checkin"
            className="clay-btn focus-ring inline-flex w-fit items-center gap-2 px-6 py-3.5 text-[14px] font-semibold"
          >
            <CalendarCheck size={16} strokeWidth={2.1} />
            Daily check-in
            <ArrowRight size={14} strokeWidth={2.4} />
          </Link>
        </div>
        <JasmineSprig size={36} className="absolute -right-1 -bottom-1 opacity-60" color="var(--jasmine)" accent="var(--vermilion)" />
        <JasmineSprig size={28} className="absolute -left-1 -top-1 opacity-50" color="var(--jasmine)" accent="var(--gold)" />
      </section>

      {/* ============================================================= */}
      {/* CRITICAL ADVISORIES                                            */}
      {/* ============================================================= */}
      {critical.map((a, i) => (
        <div
          key={i}
          className="kolam-frame relative mb-3 overflow-hidden rounded-3xl p-5"
          style={{
            background: 'linear-gradient(135deg, color-mix(in oklch, var(--vermilion) 24%, var(--surface)) 0%, color-mix(in oklch, var(--vermilion) 12%, var(--surface)) 100%)',
            border: '1px solid color-mix(in oklch, var(--vermilion) 50%, transparent)',
            boxShadow: '0 0 0 1px color-mix(in oklch, var(--vermilion) 30%, transparent), 0 18px 40px color-mix(in oklch, var(--vermilion) 22%, transparent)',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'color-mix(in oklch, var(--vermilion) 35%, var(--surface))', color: 'var(--vermilion)' }}>
              <AlertTriangle size={17} strokeWidth={2.2} />
            </span>
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-vermilion">✦ critical · ध्यान दें</div>
              <div className="mt-1 font-display text-[18px] font-medium tracking-tight text-tx-1">{a.title}</div>
              <div className="mt-1 text-[13.5px] leading-6 text-tx-2">{a.body}</div>
            </div>
          </div>
        </div>
      ))}

      {/* ============================================================= */}
      {/* QUICK STATS TRIPTYCH                                            */}
      {/* ============================================================= */}
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          color="var(--gold)"
          numeral="१"
          label="overall · सर्व"
          icon={<Sparkles size={20} strokeWidth={2} />}
          value={overallScore ?? '—'}
          unit="/ 100"
          delta={
            overallTrend > 0
              ? <span className="inline-flex items-center gap-1 text-gold"><TrendingUp size={12} strokeWidth={2.2} /> +{overallTrend.toFixed(1)} this week</span>
              : overallTrend < 0
              ? <span className="inline-flex items-center gap-1 text-vermilion"><TrendingDown size={12} strokeWidth={2.2} /> {overallTrend.toFixed(1)} this week</span>
              : <span className="inline-flex items-center gap-1 text-tx-3"><Waves size={12} strokeWidth={2.2} /> steady</span>
          }
          spark={sparklineData.length >= 2 ? sparklineData : null}
        />
        <StatCard
          color="var(--vermilion)"
          numeral="२"
          label="doses · आज"
          icon={<Pill size={20} strokeWidth={2} />}
          value={pending || '0'}
          unit={pending === 1 ? 'pending' : 'pending'}
          delta={
            <span className={cn('inline-flex items-center gap-1', taken > 0 ? 'text-gold' : 'text-tx-3')}>
              <CheckCircle2 size={12} strokeWidth={2.2} />
              {taken} taken so far
            </span>
          }
        />
        <StatCard
          color="var(--peacock)"
          numeral="३"
          label="check-in · आज"
          icon={<CalendarCheck size={20} strokeWidth={2} />}
          value={today ? 'done' : 'pending'}
          unit={today ? '✓' : '—'}
          delta={
            today
              ? <span className="inline-flex items-center gap-1 text-gold"><CheckCircle2 size={12} strokeWidth={2.2} /> logged for today</span>
              : <Link href="/checkin" className="inline-flex items-center gap-1 text-peacock hover:underline"><ArrowRight size={12} strokeWidth={2.2} /> log a check-in</Link>
          }
        />
      </section>

      {/* ============================================================= */}
      {/* ORGAN WHEEL + ANALYTICS PANEL                                   */}
      {/* ============================================================= */}
      {scores ? (
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* mini organ wheel */}
          <div className="petal-card kolam-frame relative overflow-hidden p-6">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-25 blur-3xl"
              style={{ background: 'var(--gold)' }}
            />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">✦ organ rangoli</div>
                <div className="mt-1 font-display text-[20px] font-medium tracking-tight text-tx-1">Four petals, today</div>
              </div>
              <Link href="/health" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold hover:text-tx-1">
                analytics <ArrowRight size={12} strokeWidth={2.2} />
              </Link>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[360px]">
              <MiniOrganWheel scores={scores} />
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {ORGANS.map(({ key, label, sanskrit, color }) => {
                const o = scores[key];
                return (
                  <div key={key} className="rounded-xl px-2.5 py-2 text-center"
                       style={{
                         background: `color-mix(in oklch, ${color} 10%, transparent)`,
                         border: `1px solid color-mix(in oklch, ${color} 26%, transparent)`,
                       }}>
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color }}>{label}</div>
                    <div className="mt-0.5 font-mono text-[8px] tracking-[0.18em] text-tx-3">{sanskrit}</div>
                    <div className="mt-1 font-display text-[20px] font-medium leading-none text-tx-1">{Math.round(o?.score ?? 0)}</div>
                    <div className="mt-1 inline-flex items-center justify-center gap-0.5" style={{ color: trendTone(o?.trend ?? 'stable') }}>
                      <TrendGlyph trend={o?.trend ?? 'stable'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* analytics: trend + ring + rhythm */}
          <div className="petal-card kolam-frame relative overflow-hidden p-6">
            <div className="mb-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">✦ rhythm of the week</div>
              <div className="mt-1 font-display text-[20px] font-medium tracking-tight text-tx-1">A quiet, minimal read.</div>
            </div>

            {/* TRENDLINE */}
            <div className="mb-5 rounded-2xl p-4"
                 style={{
                   background: 'color-mix(in oklch, var(--bg-subtle) 70%, transparent)',
                   border: '1px solid color-mix(in oklch, var(--gold) 16%, transparent)',
                 }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-tx-3">overall · 7d</span>
                <span className="font-mono text-[11px] text-tx-2">
                  {history?.min_score !== undefined ? `${Math.round(history.min_score)}–${Math.round(history.max_score ?? 0)}` : ''}
                </span>
              </div>
              {sparklineData.length >= 2 ? (
                <SparkLine data={sparklineData} width={420} height={84} color="var(--gold)" className="w-full" />
              ) : (
                <div className="flex h-[84px] items-center justify-center font-mono text-[11px] text-tx-3">
                  not enough history yet — log a few check-ins
                </div>
              )}
              {history?.average_score !== undefined && sparklineData.length >= 2 && (
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-tx-3">
                  <span>avg <span className="text-tx-1">{Math.round(history.average_score)}</span></span>
                  <span>{sparklineData.length} points</span>
                </div>
              )}
            </div>

            {/* ADHERENCE RING */}
            <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
              <AdherenceRing
                pct={adherence}
                size={156}
                color="var(--gold)"
                label="adherence"
                sublabel="this week"
              />
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
                  ✦ medicine wheel
                </div>
                <div className="mt-2 font-display text-[18px] font-medium leading-tight tracking-tight text-tx-1">
                  {taken} taken · {pending} pending
                </div>
                <div className="mt-2 text-[13px] leading-6 text-tx-2">
                  Each petal is a dose held in time. Doses run from sunrise on the left to dusk on the right.
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="petal-card kolam-frame mb-6 px-5 py-12 text-center">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
            ✦ no rangoli yet
          </div>
          <div className="mt-3 font-display text-[22px] font-medium text-tx-1">A blank doorstep</div>
          <div className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-tx-2">
            Complete your first check-in and the family rangoli will be drawn at dawn — organ scores, advisories and trends will follow.
          </div>
          <Link href="/checkin" className="clay-btn focus-ring mt-6 inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold">
            <ArrowRight size={14} strokeWidth={2.2} />
            Begin a check-in
          </Link>
        </section>
      )}

      {/* ============================================================= */}
      {/* DAY RHYTHM (full-width strip)                                   */}
      {/* ============================================================= */}
      {schedules.length > 0 && (
        <section className="petal-card kolam-frame relative mb-6 overflow-hidden p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">✦ day rhythm · दिनचर्या</div>
              <div className="mt-1 font-display text-[20px] font-medium tracking-tight text-tx-1">
                {schedules.length} doses across the day
              </div>
            </div>
            <Link href="/medicines" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold hover:text-tx-1">
              all medicines <ArrowRight size={12} strokeWidth={2.2} />
            </Link>
          </div>
          <DayRhythm marks={dayMarks} nowHour={hour + now.getMinutes() / 60} />
        </section>
      )}

      {/* ============================================================= */}
      {/* MEDICINES + ADVISORIES                                          */}
      {/* ============================================================= */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* MEDICINES */}
        <div className="petal-card kolam-frame relative overflow-hidden p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">✦ today&apos;s medicines</div>
              <div className="mt-1 font-display text-[20px] font-medium tracking-tight text-tx-1">Dose by dose</div>
            </div>
            <Link href="/medicines" className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold hover:text-tx-1">
              view all <ArrowRight size={12} strokeWidth={2.2} />
            </Link>
          </div>
          {schedules.length > 0 ? (
            <div className="space-y-1">
              {schedules.slice(0, 6).map((s, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-xl px-3 py-3 transition-colors"
                  style={{
                    background:
                      s.status === 'overdue'
                        ? 'color-mix(in oklch, var(--vermilion) 14%, transparent)'
                        : s.status === 'taken'
                        ? 'color-mix(in oklch, var(--gold) 8%, transparent)'
                        : 'transparent',
                    border:
                      s.status === 'overdue'
                        ? '1px solid color-mix(in oklch, var(--vermilion) 32%, transparent)'
                        : '1px solid color-mix(in oklch, var(--gold) 10%, transparent)',
                  }}
                >
                  <StatusIcon status={s.status} />
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-tx-1">{s.medicine_name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-tx-3">{s.dosage}</div>
                  </div>
                  <span className="font-mono text-[12px] tracking-wide text-tx-2">{s.dose_time}</span>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.22em]"
                    style={{
                      background:
                        s.status === 'taken'
                          ? 'color-mix(in oklch, var(--gold) 22%, transparent)'
                          : s.status === 'overdue'
                          ? 'color-mix(in oklch, var(--vermilion) 30%, transparent)'
                          : s.status === 'skipped'
                          ? 'color-mix(in oklch, var(--surface-raised) 90%, transparent)'
                          : 'color-mix(in oklch, var(--peacock) 22%, transparent)',
                      color:
                        s.status === 'taken'
                          ? 'var(--gold)'
                          : s.status === 'overdue'
                          ? 'var(--vermilion)'
                          : s.status === 'skipped'
                          ? 'var(--tx-3)'
                          : 'var(--peacock)',
                    }}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
              {schedules.length > 6 && (
                <Link href="/medicines" className="mt-2 block text-center font-mono text-[10px] uppercase tracking-[0.22em] text-gold hover:text-tx-1">
                  + {schedules.length - 6} more · open the cabinet
                </Link>
              )}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <KolamHalo color="var(--gold)" size={72} intensity="soft" iconSlot={<Pill size={20} strokeWidth={2} />} />
              <div className="mt-4 font-display text-[16px] font-medium text-tx-1">No scheduled doses</div>
              <div className="mt-1 text-[13px] text-tx-2">Add medicines through Kutumb AI or the medicines workspace.</div>
            </div>
          )}
        </div>

        {/* ADVISORIES */}
        <div className="petal-card kolam-frame relative overflow-hidden p-6">
          <div className="mb-4">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">✦ advisories · सूचना</div>
            <div className="mt-1 font-display text-[20px] font-medium tracking-tight text-tx-1">
              {others.length > 0 ? `${others.length} note${others.length === 1 ? '' : 's'} for you` : 'Nothing urgent'}
            </div>
          </div>
          {others.length > 0 ? (
            <div className="space-y-2.5">
              {others.map((a, i) => {
                const tone = a.severity === 'warning' ? 'var(--vermilion)' : 'var(--peacock)';
                return (
                  <div
                    key={i}
                    className="rounded-2xl p-4"
                    style={{
                      background: `color-mix(in oklch, ${tone} 10%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${tone} 28%, transparent)`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: tone }}>
                        {a.severity}
                      </span>
                    </div>
                    <div className="mt-1.5 font-display text-[15px] font-medium leading-tight tracking-tight text-tx-1">{a.title}</div>
                    <div className="mt-1 text-[13px] leading-6 text-tx-2">{a.body}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <KolamHalo color="var(--gold)" size={72} intensity="soft" iconSlot={<Sparkles size={20} strokeWidth={2} />} />
              <div className="mt-4 font-display text-[16px] font-medium text-tx-1">All quiet</div>
              <div className="mt-1 text-[13px] text-tx-2">New guidance appears here as check-ins and reports change.</div>
            </div>
          )}
        </div>
      </section>

      <KolamDivider className="mt-12" />
    </div>
  );
}

/* --------------------------------------------------------------- */
/* StatCard — petal stat with KolamHalo + optional sparkline       */
/* --------------------------------------------------------------- */
function StatCard({
  color,
  numeral,
  label,
  icon,
  value,
  unit,
  delta,
  spark,
}: {
  color: string;
  numeral: string;
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  unit?: string;
  delta?: React.ReactNode;
  spark?: number[] | null;
}) {
  return (
    <div className="petal-card kolam-frame relative overflow-hidden p-5 pt-7">
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full opacity-30 blur-2xl"
        style={{ background: color }}
      />
      <KolamDotStrip className="absolute inset-x-5 top-3" count={18} every={5} accent={color} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span
            className="font-display text-[28px] font-medium italic leading-none text-gold-grad"
            style={{ fontVariationSettings: '"SOFT" 100' }}
          >
            {numeral}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            ✦ {label}
          </span>
        </div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${color} 60%, var(--surface)), color-mix(in oklch, ${color} 22%, var(--surface)))`,
            color: 'var(--indigo-deep)',
            boxShadow: `0 0 0 1px color-mix(in oklch, ${color} 50%, transparent)`,
          }}
        >
          {icon}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <div
          className="font-display text-[44px] font-medium leading-none italic text-gold-grad"
          style={{ fontVariationSettings: '"SOFT" 100' }}
        >
          {value}
        </div>
        {unit && <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-tx-3">{unit}</div>}
      </div>

      {spark && spark.length >= 2 && (
        <div className="-mx-1 mt-2">
          <SparkLine data={spark} width={300} height={36} color={color} thickness={1.2} showDots={false} className="w-full" pad={3} />
        </div>
      )}

      {delta && (
        <div className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.22em]">{delta}</div>
      )}
    </div>
  );
}
