import {
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  HeartPulse,
  Pill,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

const primaryFeatures = [
  {
    icon: Bot,
    title: 'Health memory that stays useful',
    body: 'Kutumb AI keeps medicines, check-ins, lab reports, family context, and preferences in one conversation-aware health profile.',
  },
  {
    icon: Pill,
    title: 'Medicine follow-through',
    body: 'Daily dose status, adherence, refill alerts, prescription import, and interaction checks sit beside the rest of the care record.',
  },
  {
    icon: HeartPulse,
    title: 'Organ scores without guesswork',
    body: 'Heart, brain, gut, and lungs are scored from check-ins, vitals, symptoms, and lab context so families can spot change early.',
  },
];

const modules = [
  { icon: ClipboardCheck, label: 'Daily check-in', detail: 'mood, pain, sleep, hydration, symptoms' },
  { icon: UsersRound, label: 'Family workspace', detail: 'shared care for parents, children, and elders' },
  { icon: FileText, label: 'Lab report OCR', detail: 'biomarkers, abnormal flags, longitudinal trends' },
  { icon: Brain, label: 'AI advisories', detail: 'context-aware guidance with safety triggers' },
];

const flow = [
  ['01', 'Capture', 'Check-ins, medicines, wearables, reports, and family updates enter one structured health record.'],
  ['02', 'Interpret', 'Scores and advisories translate raw health events into the next signal that matters.'],
  ['03', 'Act', 'Families get reminders, conversations, SOS context, and follow-up prompts without hunting through apps.'],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-tx-1">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg/82 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-accent-text">
              <ShieldCheck size={19} strokeWidth={1.9} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Kutumb</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-tx-3">Family health</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-7 md:flex">
            <Link href="#platform" className="text-[13px] font-medium text-tx-2 transition-colors hover:text-tx-1">
              Platform
            </Link>
            <Link href="#workflow" className="text-[13px] font-medium text-tx-2 transition-colors hover:text-tx-1">
              Workflow
            </Link>
            <Link href="/auth" className="text-[13px] font-medium text-tx-2 transition-colors hover:text-tx-1">
              Sign in
            </Link>
          </nav>
          <div className="ml-3 flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth?tab=register"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-accent-text transition-colors hover:bg-accent-hover"
            >
              Get started
              <ArrowRight size={15} strokeWidth={1.9} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate min-h-[88svh] overflow-hidden pt-16">
          <Image
            src="/images/kutumb-family-care.png"
            alt="Indian family reviewing health information together at home"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[68%_center]"
          />
          <div className="image-vignette absolute inset-0" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,var(--bg)_100%)]" />

          <div className="relative z-10 mx-auto flex min-h-[calc(88svh-4rem)] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-2xl scroll-left">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-3 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Health intelligence for Indian families
              </div>
              <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-tight text-tx-1 sm:text-6xl lg:text-7xl">
                Kutumb family health
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-tx-2 sm:text-lg">
                One shared care space for medicines, daily symptoms, lab reports, organ scores, and AI guidance across every generation.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth?tab=register"
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-text shadow-[var(--shadow-md)] transition-colors hover:bg-accent-hover"
                >
                  Create family profile
                  <ArrowRight size={16} strokeWidth={1.9} />
                </Link>
                <Link
                  href="/dashboard"
                  className="focus-ring inline-flex items-center justify-center rounded-xl border border-border bg-surface/86 px-6 py-3 text-sm font-semibold text-tx-1 backdrop-blur transition-all hover:border-border-strong hover:bg-surface"
                >
                  Explore dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface/80">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-border px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[
              ['12+', 'care modules'],
              ['4', 'organ scores'],
              ['1', 'family record'],
            ].map(([value, label]) => (
              <div key={label} className="bg-surface px-6 py-6 text-center scroll-reveal">
                <div className="font-[var(--font-mono)] text-4xl font-semibold tracking-tight text-tx-1">{value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-tx-3">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-3xl scroll-reveal">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Platform</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-tx-1 sm:text-4xl">
                The operational layer for family care.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-tx-2">
                Kutumb is built for the practical work families do every day: remember doses, notice change, understand reports, and ask better questions.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {primaryFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const tone = index === 1 ? 'bg-saffron-muted text-amber' : index === 2 ? 'bg-rose-muted text-rose' : 'bg-accent-muted text-accent';
                return (
                  <article
                    key={feature.title}
                    className="surface-panel card-lift scroll-reveal rounded-2xl p-6"
                  >
                    <div className={`mb-8 flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                      <Icon size={23} strokeWidth={1.8} />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight text-tx-1">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-tx-2">{feature.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-border bg-surface/72 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.72fr_1fr] lg:items-start">
            <div className="scroll-left">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Workflow</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-tx-1 sm:text-4xl">
                From scattered updates to one care loop.
              </h2>
              <p className="mt-4 text-sm leading-6 text-tx-2">
                The product keeps the day-to-day interface calm, while the system underneath keeps enough context for richer AI guidance.
              </p>
            </div>

            <div className="space-y-3">
              {flow.map(([step, title, body]) => (
                <div key={step} className="surface-panel scroll-right rounded-2xl p-5">
                  <div className="flex gap-5">
                    <div className="font-[var(--font-mono)] text-sm font-semibold text-accent">{step}</div>
                    <div>
                      <h3 className="text-base font-semibold text-tx-1">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-tx-2">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="scroll-reveal">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Modules</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-tx-1 sm:text-4xl">
                  Built around the care tasks families repeat.
                </h2>
              </div>
              <Link
                href="/auth?tab=register"
                className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-tx-1 transition-all hover:border-border-strong"
              >
                Start now
                <ArrowRight size={15} strokeWidth={1.9} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="surface-panel card-lift scroll-reveal rounded-2xl p-5"
                  >
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-subtle text-tx-2">
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <div className="text-sm font-semibold text-tx-1">{item.label}</div>
                    <div className="mt-2 text-xs leading-5 text-tx-2">{item.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-accent text-accent-text shadow-[var(--shadow-lg)] scroll-reveal">
            <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-text/[0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  <CheckCircle2 size={14} strokeWidth={1.9} />
                  Free individual start
                </div>
                <h2 className="text-3xl font-semibold tracking-tight">Bring the family record together today.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-accent-text/82">
                  Start with check-ins and medicines, then add reports, family members, and AI health conversations as the record grows.
                </p>
              </div>
              <Link
                href="/auth?tab=register"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-accent-text px-5 py-3 text-sm font-semibold text-accent transition-colors hover:bg-surface"
              >
                Create account
                <ArrowRight size={16} strokeWidth={1.9} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[12px] text-tx-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Kutumb (c) 2026</span>
          <span>Built for Indian families managing care together</span>
        </div>
      </footer>
    </div>
  );
}
