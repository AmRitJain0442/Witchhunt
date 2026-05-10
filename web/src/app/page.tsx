import {
  Activity,
  ArrowRight,
  BellRing,
  Bot,
  Brain,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Languages,
  Leaf,
  LockKeyhole,
  Mic,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
  Wind,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { KolamDotGrid, KolamDotStrip, KolamHalo, RangoliMandala } from '@/components/ui/Rangoli';

const liveSignals = [
  { label: 'Dadi', event: 'Morning BP logged', value: '128/82', tone: 'var(--gold)' },
  { label: 'Papa', event: 'Metformin due', value: '08:30', tone: 'var(--vermilion)' },
  { label: 'Aanya', event: 'Inhaler packed', value: 'done', tone: 'var(--peacock)' },
];

const organs = [
  { label: 'Heart', score: 84, icon: HeartPulse, color: 'var(--vermilion)' },
  { label: 'Brain', score: 78, icon: Brain, color: 'var(--peacock)' },
  { label: 'Gut', score: 72, icon: Activity, color: 'var(--gold)' },
  { label: 'Lungs', score: 88, icon: Wind, color: 'var(--sky)' },
];

const modules = [
  { icon: Mic, title: 'Voice check-ins', body: 'Hindi, Tamil, English, or quick taps for symptoms, mood, sleep, pain, hydration, and appetite.' },
  { icon: Pill, title: 'Medicine cabinet', body: 'Dose schedules, refill windows, prescription evidence, missed-dose flags, and family escalation.' },
  { icon: FileText, title: 'Lab report memory', body: 'Upload reports once. Kutumb extracts biomarkers, marks abnormal values, and tracks trend changes.' },
  { icon: Bot, title: 'Care-aware AI', body: 'Answers with the family context already in hand: medicines, labs, check-ins, age, and risk notes.' },
  { icon: UsersRound, title: 'Shared family view', body: 'Children, parents, and grandparents can be tracked together without mixing private notes.' },
  { icon: ShieldAlert, title: 'SOS handoff', body: 'One tap prepares the latest vitals, medicines, allergies, and seven-day context for a doctor.' },
];

const workflow = [
  { step: '01', title: 'Capture the day', body: 'Voice, photos, wearables, and forms all become structured care events.', icon: ClipboardCheck },
  { step: '02', title: 'Read the pattern', body: 'Organ scores and alerts make slow changes visible before they become urgent.', icon: Sparkles },
  { step: '03', title: 'Act as a family', body: 'The right person gets the right nudge, with enough context to respond.', icon: BellRing },
];

const trust = [
  { icon: LockKeyhole, title: 'On-device private memory', body: 'Conversational memory stays in the local .kutumb file. Cloud sync is limited to records the family chooses to store.' },
  { icon: ShieldCheck, title: 'Rules before generation', body: 'Emergency wording, unsafe vitals, medicine conflicts, and missed-dose risk are checked before an AI answer appears.' },
  { icon: Languages, title: 'Built for real households', body: 'A family can speak in the language they use at home and still keep a single health timeline.' },
];

const ribbon = ['voice-first', 'family-shared', 'organ scores', 'medicine safety', 'lab OCR', 'doctor handoff'];

function SignalBoard() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute inset-6 -z-10 rounded-full border border-gold/25" />
      <RangoliMandala
        size={520}
        intensity="soft"
        className="absolute left-1/2 top-1/2 -z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-55"
        ariaLabel="Kutumb care pattern"
      />

      <div className="petal-card kolam-frame overflow-hidden p-5 sm:p-6">
        <KolamDotStrip className="absolute inset-x-6 top-4" count={22} every={6} accent="var(--gold)" />
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Live family board</div>
            <h2 className="mt-2 font-display text-[28px] font-medium leading-none tracking-tight">Today at home</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-text shadow-[var(--shadow-md)]">
            <Leaf size={22} strokeWidth={1.9} />
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {liveSignals.map((signal) => (
            <div
              key={signal.label}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border px-3.5 py-3"
              style={{
                borderColor: `color-mix(in oklch, ${signal.tone} 26%, transparent)`,
                background: `linear-gradient(90deg, color-mix(in oklch, ${signal.tone} 12%, transparent), transparent)`,
              }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: signal.tone, boxShadow: `0 0 14px ${signal.tone}` }} />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-tx-1">{signal.label}</span>
                <span className="block truncate text-[12px] text-tx-3">{signal.event}</span>
              </span>
              <span className="font-mono text-[12px] font-semibold text-tx-1">{signal.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-gold/20 bg-bg/55 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-tx-3">Organ signals</span>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-[12px] font-semibold text-gold hover:text-tx-1">
              Open dashboard <ArrowRight size={13} strokeWidth={2.2} />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {organs.map(({ label, score, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-border bg-surface/70 px-2 py-3 text-center">
                <Icon className="mx-auto mb-2" size={16} strokeWidth={2} style={{ color }} />
                <div className="font-display text-[24px] font-medium leading-none">{score}</div>
                <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.18em] text-tx-3">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-accent px-4 py-3 text-accent-text">
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
            <CheckCircle2 size={16} strokeWidth={2.2} />
            SOS packet ready
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-80">7 day context</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-bg text-tx-1">
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-white/10 bg-bg/78 px-3 shadow-[var(--shadow-md)] backdrop-blur-xl sm:px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-text">
              <Leaf size={18} strokeWidth={2} />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-semibold tracking-tight">Kutumb</span>
              <span className="block text-[9px] uppercase tracking-[0.24em] text-tx-3">Family care OS</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {[
              ['Board', '#board'],
              ['Workflow', '#workflow'],
              ['Modules', '#modules'],
              ['Safety', '#safety'],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="rounded-full px-3 py-1.5 text-[13px] font-medium text-tx-2 hover:bg-surface hover:text-tx-1">
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-2">
            <ThemeToggle />
            <Link href="/auth" className="hidden rounded-full px-3 py-1.5 text-[13px] font-semibold text-tx-2 hover:text-tx-1 sm:inline-flex">
              Sign in
            </Link>
            <Link href="/auth?tab=register" className="clay-btn focus-ring inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold">
              Start
              <ArrowRight size={14} strokeWidth={2.3} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[92vh] overflow-hidden px-5 pb-16 pt-28 sm:px-6 lg:px-8">
          <Image
            src="/images/kutumb-family-care.png"
            alt="Family using Kutumb to coordinate health care"
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--bg)_0%,color-mix(in_oklch,var(--bg)_90%,transparent)_38%,color-mix(in_oklch,var(--bg)_42%,transparent)_74%,var(--bg)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-52 bg-gradient-to-t from-bg to-transparent" />
          <KolamDotGrid className="!fixed !inset-0 -z-10 opacity-35" size="md" fade={false} />

          <div className="relative z-10 mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-2xl pt-16">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-bg/70 px-3.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-gold backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_12px_var(--gold)]" />
                Private care memory for Indian families
              </div>
              <h1 className="font-display text-[48px] font-medium leading-[0.98] tracking-tight text-tx-1 sm:text-[72px] lg:text-[86px]">
                One home.
                <br />
                One health pattern.
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-8 text-tx-2 sm:text-[18px]">
                Kutumb turns check-ins, medicines, lab reports, vitals, and AI conversations into a shared family care board. Calm enough for grandparents. Detailed enough for doctors.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth?tab=register" className="clay-btn focus-ring inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-semibold">
                  Create family profile
                  <ArrowRight size={16} strokeWidth={2.3} />
                </Link>
                <Link href="/dashboard" className="clay-btn-ghost focus-ring inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-semibold">
                  <CalendarCheck size={16} strokeWidth={2} />
                  Tour dashboard
                </Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ['4', 'organ scores'],
                  ['6+', 'languages'],
                  ['1', 'doctor packet'],
                ].map(([value, label]) => (
                  <div key={label} className="border-l border-gold/30 pl-3">
                    <div className="font-display text-[28px] font-medium leading-none text-gold">{value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-tx-3">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div id="board" className="pb-4 lg:pt-24">
              <SignalBoard />
            </div>
          </div>
        </section>

        <section aria-hidden className="border-y border-border bg-surface/50 py-4 backdrop-blur">
          <div className="overflow-hidden">
            <div className="marquee-track gap-12 whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-tx-3">
              {[...ribbon, ...ribbon].map((label, index) => (
                <span key={`${label}-${index}`} className="inline-flex items-center gap-12">
                  <span>{label}</span>
                  <span className="text-gold">*</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="px-5 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-3xl">
              <span className="eyebrow">Daily loop</span>
              <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[56px]">
                Designed for the care work that repeats every day.
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {workflow.map(({ step, title, body, icon: Icon }, index) => (
                <div key={step} className="petal-card kolam-frame lift p-6" style={{ animationDelay: `${index * 90}ms` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">{step}</div>
                    <KolamHalo color={index === 1 ? 'var(--peacock)' : index === 2 ? 'var(--vermilion)' : 'var(--gold)'} size={76} intensity="soft" iconSlot={<Icon size={18} strokeWidth={2} />} />
                  </div>
                  <h3 className="mt-5 font-display text-[25px] font-medium leading-tight tracking-tight">{title}</h3>
                  <p className="mt-3 text-[14px] leading-7 text-tx-2">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="border-y border-border bg-surface/35 px-5 py-24 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <span className="eyebrow">Modules</span>
                <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[56px]">
                  A compact workspace for the whole household.
                </h2>
              </div>
              <Link href="/auth?tab=register" className="clay-btn-ghost focus-ring inline-flex w-fit items-center gap-2 px-5 py-3 text-sm font-semibold">
                Start with check-ins
                <ArrowRight size={15} strokeWidth={2.2} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(({ icon: Icon, title, body }, index) => {
                const color = index % 3 === 0 ? 'var(--gold)' : index % 3 === 1 ? 'var(--vermilion)' : 'var(--peacock)';
                return (
                  <div key={title} className="rounded-[22px] border border-border bg-bg/50 p-5 shadow-[var(--shadow-sm)] transition-transform duration-300 hover:-translate-y-1">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}>
                      <Icon size={19} strokeWidth={2} />
                    </div>
                    <h3 className="font-display text-[21px] font-medium tracking-tight">{title}</h3>
                    <p className="mt-2 text-[13.5px] leading-6 text-tx-2">{body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="safety" className="px-5 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <span className="eyebrow">Safety layer</span>
              <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[56px]">
                Soft interface. Hard clinical guardrails.
              </h2>
              <p className="mt-5 text-[15px] leading-7 text-tx-2">
                Kutumb is built for household coordination, so it treats safety events as product behavior, not decoration. The system separates reminders, deterministic warnings, and AI guidance.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {trust.map(({ icon: Icon, title, body }, index) => {
                const color = index === 0 ? 'var(--gold)' : index === 1 ? 'var(--vermilion)' : 'var(--peacock)';
                return (
                  <div key={title} className="petal-card kolam-frame p-6">
                    <KolamHalo color={color} size={82} intensity="soft" iconSlot={<Icon size={19} strokeWidth={2} />} />
                    <h3 className="mt-5 font-display text-[21px] font-medium leading-tight tracking-tight">{title}</h3>
                    <p className="mt-3 text-[13.5px] leading-6 text-tx-2">{body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-gold/20 bg-accent p-8 text-accent-text shadow-[var(--shadow-lg)] sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent-text/15 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em]">
                  <Stethoscope size={13} strokeWidth={2.2} />
                  Ready for the first family member
                </div>
                <h2 className="font-display text-[38px] font-medium leading-[1.05] tracking-tight sm:text-[56px]">
                  Start with one profile. Let the care record grow.
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/auth?tab=register" className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-accent-text px-7 py-4 text-[15px] font-semibold text-accent">
                  Create family profile
                  <ArrowRight size={16} strokeWidth={2.3} />
                </Link>
                <Link href="/auth" className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-accent-text/15 px-7 py-4 text-[15px] font-semibold text-accent-text backdrop-blur">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface/50 px-5 py-9 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-text">
              <Leaf size={16} strokeWidth={2} />
            </span>
            <div>
              <div className="font-display text-[15px] font-medium">Kutumb</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-tx-3">Family care OS</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-tx-3">
            <span>2026 Kutumb</span>
            <Link href="/dashboard" className="hover:text-tx-1">Dashboard</Link>
            <Link href="/auth" className="hover:text-tx-1">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
