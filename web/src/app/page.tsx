import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CloudMoon,
  Droplets,
  FileText,
  Flame,
  HeartPulse,
  Languages,
  Leaf,
  Lock,
  Mic,
  Pill,
  ShieldCheck,
  Sparkles,
  Sun,
  Stethoscope,
  UsersRound,
  Wind,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';
import CloudField from '@/components/ui/CloudField';
import { KolamDotGrid, RangoliMandala, JasmineSprig, KolamHalo, KolamDotStrip } from '@/components/ui/Rangoli';

const primaryFeatures = [
  {
    icon: Bot,
    accent: 'sage',
    title: 'A health memory that listens',
    body: 'Speak to Kutumb in Hindi, Tamil, or English. Medicines, check-ins, lab values, and family context settle into one warm, conversation-aware record.',
  },
  {
    icon: Pill,
    accent: 'peach',
    title: 'Medicines, gently followed',
    body: 'Every dose, every refill, every interaction. Prescription scans roll in, alerts roll out — quietly, on time, in the right hands.',
  },
  {
    icon: HeartPulse,
    accent: 'rose',
    title: 'Organ scores that explain themselves',
    body: 'Heart, brain, gut and lungs each get a soft daily score — pulled from check-ins, vitals and reports — so change is felt early, not late.',
  },
];

const personas = [
  {
    name: 'Dadi-ji',
    age: '68',
    tone: 'butter',
    role: 'Three medicines, one pacemaker, a careful gut',
    line: 'Kutumb whispers refills three days early and keeps Papa in the loop without a single phone call.',
    icon: Leaf,
  },
  {
    name: 'Papa',
    age: '42',
    tone: 'sage',
    role: 'Diabetes program, BP, weekend cricket',
    line: 'Voice check-in on the morning commute. Glucose trend, food warnings, exercise plan — already waiting at lunch.',
    icon: Activity,
  },
  {
    name: 'Aanya',
    age: '7',
    tone: 'sky',
    role: 'Asthma, vaccinations, growth chart',
    line: 'Inhaler reminders ride along to school. Pollen days come pre-flagged so Mummy never gets caught off guard.',
    icon: Wind,
  },
];

const flow = [
  {
    step: '01',
    title: 'Capture',
    body: 'Voice check-ins, prescription photos, wearable vitals, and lab PDFs all enter one structured family record — no forms, no fuss.',
    icon: Mic,
    tone: 'sage',
  },
  {
    step: '02',
    title: 'Interpret',
    body: 'Scores, trends and advisories translate raw events into the next signal that matters — drug clashes, missed doses, dehydration, mood shifts.',
    icon: Sparkles,
    tone: 'peach',
  },
  {
    step: '03',
    title: 'Act',
    body: 'Reminders nudge. Conversations explain. SOS escalates with full context to the on-call doctor. The family stays one step ahead.',
    icon: ShieldCheck,
    tone: 'rose',
  },
];

const modules = [
  { icon: ClipboardCheck, label: 'Daily check-in', detail: 'mood, pain, sleep, hydration, symptoms', tone: 'sage' },
  { icon: Pill, label: 'Medicine cabinet', detail: 'doses, refills, scans, interactions', tone: 'peach' },
  { icon: FileText, label: 'Lab report OCR', detail: 'biomarkers, abnormal flags, trends', tone: 'sky' },
  { icon: HeartPulse, label: 'Vitals + wearables', detail: 'BP, glucose, SpO₂, HR, sleep', tone: 'rose' },
  { icon: UsersRound, label: 'Family workspace', detail: 'shared care across generations', tone: 'butter' },
  { icon: Brain, label: 'AI advisories', detail: 'food clashes, exercise, side effects', tone: 'lilac' },
  { icon: Stethoscope, label: 'Care plans', detail: 'diabetes, hypertension, recovery', tone: 'sage' },
  { icon: ShieldCheck, label: 'SOS + handoff', detail: 'one-tap context for the doctor', tone: 'terracotta' },
];

const organScores = [
  { label: 'Heart', score: 84, icon: HeartPulse, color: 'var(--rose)' },
  { label: 'Brain', score: 78, icon: Brain, color: 'var(--lilac)' },
  { label: 'Gut', score: 72, icon: Flame, color: 'var(--peach)' },
  { label: 'Lungs', score: 88, icon: Wind, color: 'var(--sky)' },
];

const trustPoints = [
  {
    icon: Lock,
    title: 'Encrypted on the device',
    body: 'Your `.kutumb` memory file lives in the Android Keystore / iOS Secure Enclave, sealed by AES-256-GCM and a biometric key. Never on our servers. Never on cloud.',
  },
  {
    icon: Languages,
    title: 'Speaks the family languages',
    body: 'Voice check-ins in Hindi, Tamil, Kannada, Marathi, Bengali and English. The same memory, in whichever tongue the household uses.',
  },
  {
    icon: ShieldCheck,
    title: 'Hard safety triggers',
    body: 'Vitals, food clashes, missed doses and crisis language fire deterministic warnings before the AI ever responds. Safety is not a hope.',
  },
];

const faqs = [
  {
    q: 'Where does the family memory actually live?',
    a: 'On your device, in an encrypted .kutumb file. Firestore stores nothing of the conversational memory — only the structured records you explicitly sync (medicines, lab reports, check-ins).',
  },
  {
    q: 'Can grandparents use it without the AI part?',
    a: 'Yes. The whole thing works as a calm reminder + journal. AI insights are opt-in per family member, switchable at any time.',
  },
  {
    q: 'How are prescriptions verified?',
    a: 'Photos run through Google Vision OCR plus a Gemini extraction pass. Every prescription medicine requires a scan; first-aid (paracetamol, ORS, antiseptic) is allowed without one.',
  },
  {
    q: 'What happens in an emergency?',
    a: 'SOS surfaces a single screen: latest vitals, last 7 days of context, current meds, allergies, and the on-call doctor. Tap and the whole packet leaves with the call.',
  },
];

const ribbon = [
  'voice-first',
  'family-shared',
  'encrypted memory',
  'hindi · tamil · english',
  'organ-aware',
  'pcpndt-safe',
  'wearable-ready',
  'pediatric · geriatric',
  'monsoon-ready',
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden text-tx-1">
      {/* fixed kolam atmosphere — dot field + soft folk-color glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <KolamDotGrid className="!fixed !inset-0" size="md" fade={false} />
        <div className="absolute -top-40 -left-40 h-[55vh] w-[55vh] cloud drift-1 opacity-50" style={{ background: 'radial-gradient(circle at 30% 30%, var(--vermilion) 0%, transparent 60%)' }} />
        <div className="absolute top-[40vh] -right-40 h-[55vh] w-[55vh] cloud drift-2 opacity-40" style={{ background: 'radial-gradient(circle at 60% 40%, var(--gold) 0%, transparent 60%)' }} />
        <div className="absolute top-[120vh] -left-20 h-[50vh] w-[50vh] cloud drift-3 opacity-45" style={{ background: 'radial-gradient(circle at 50% 50%, var(--peacock) 0%, transparent 60%)' }} />
        <div className="absolute top-[210vh] right-0 h-[48vh] w-[48vh] cloud drift-1 opacity-35" style={{ background: 'radial-gradient(circle at 40% 50%, var(--gold) 0%, transparent 65%)' }} />
        <div className="absolute top-[300vh] left-1/4 h-[55vh] w-[55vh] cloud drift-2 opacity-35" style={{ background: 'radial-gradient(circle at 50% 50%, var(--vermilion-soft) 0%, transparent 60%)' }} />
      </div>

      {/* header */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-3 flex h-14 max-w-6xl items-center gap-2 rounded-full px-3 sm:px-4">
          <div className="clay-pill flex h-14 w-full items-center gap-2 px-3 sm:px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="clay-icon h-9 w-9 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] text-[var(--accent-text)] tilt">
                <Leaf size={18} strokeWidth={2} />
              </span>
              <span className="leading-tight">
                <span className="block font-display text-[17px] font-semibold tracking-tight">Kutumb</span>
                <span className="block text-[9px] uppercase tracking-[0.24em] text-tx-3">Family · Health</span>
              </span>
            </Link>
            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {[
                ['Platform', '#platform'],
                ['Family', '#family'],
                ['Memory', '#memory'],
                ['Modules', '#modules'],
                ['FAQ', '#faq'],
              ].map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-full px-3 py-1.5 text-[13px] font-medium text-tx-2 transition-colors hover:bg-bg-subtle hover:text-tx-1"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 md:ml-2">
              <ThemeToggle />
              <Link
                href="/auth"
                className="hidden rounded-full px-3 py-1.5 text-[13px] font-medium text-tx-2 transition-colors hover:text-tx-1 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/auth?tab=register"
                className="clay-btn focus-ring inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold"
              >
                Get started
                <ArrowRight size={14} strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ============================ HERO ============================ */}
        <section className="relative isolate overflow-hidden pt-28 pb-32 sm:pt-32 sm:pb-40">
          <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              {/* copy */}
              <div className="scroll-pop relative">
                <span className="clay-pill mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-tx-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_14px_var(--gold)]" />
                  कुटुम्ब · family health, lit by lamp · 2026
                </span>
                <h1 className="font-display text-[44px] font-medium leading-[1.02] tracking-tight text-tx-1 sm:text-[64px] lg:text-[78px]">
                  A family record
                  <br />
                  drawn at <span className="italic text-gold-grad" style={{ fontVariationSettings: '"SOFT" 100' }}>dawn.</span>
                </h1>
                <p className="mt-7 max-w-xl text-base leading-7 text-tx-2 sm:text-[17px] sm:leading-8">
                  Like a kolam at the doorstep — one quiet pattern of dots and curves that holds medicines, check-ins,
                  lab reports, organ scores and AI guidance for every generation under your roof. Voice-first.
                  Encrypted on the device.
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/auth?tab=register"
                    className="clay-btn focus-ring inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-semibold"
                  >
                    Light the lamp · start
                    <ArrowRight size={16} strokeWidth={2.2} />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="clay-btn-ghost focus-ring inline-flex items-center justify-center gap-2 px-7 py-4 text-[15px] font-semibold text-tx-1"
                  >
                    <Sun size={16} strokeWidth={2} className="text-gold" />
                    Tour the dashboard
                  </Link>
                </div>

                {/* trust mini */}
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12px] text-tx-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Lock size={13} strokeWidth={2} className="text-gold" />
                    On-device encryption
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mic size={13} strokeWidth={2} className="text-gold" />
                    Voice in 6 Indian tongues
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck size={13} strokeWidth={2} className="text-gold" />
                    Hard safety triggers
                  </span>
                </div>
              </div>

              {/* mandala roundel composition */}
              <div className="relative mx-auto h-[560px] w-full max-w-[560px] scroll-right sm:h-[600px]">
                {/* mandala — fills container, drawn behind */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <RangoliMandala size={560} className="absolute inset-0 m-auto" intensity="full" ariaLabel="Welcome rangoli" />
                </div>

                {/* center roundel — circular family photo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-[210px] w-[210px] rounded-full p-[3px]"
                       style={{
                         background: 'conic-gradient(from -90deg, var(--gold) 0%, var(--vermilion) 35%, var(--peacock) 60%, var(--gold) 100%)',
                         boxShadow: '0 0 0 6px var(--bg), 0 0 0 7px color-mix(in oklch, var(--gold) 38%, transparent), 0 22px 50px color-mix(in oklch, var(--vermilion) 25%, transparent)',
                       }}>
                    <div className="relative h-full w-full overflow-hidden rounded-full">
                      <Image
                        src="/images/kutumb-family-care.png"
                        alt="A family reviewing health together"
                        fill
                        priority
                        sizes="220px"
                        className="object-cover object-[60%_center]"
                      />
                      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at 50% 110%, color-mix(in oklch, var(--vermilion) 45%, transparent) 0%, transparent 55%)' }} />
                    </div>
                  </div>
                </div>

                {/* jasmine flourishes — corners */}
                <JasmineSprig size={44} className="absolute left-[6%] top-[8%] float-y opacity-90" color="var(--jasmine)" accent="var(--vermilion)" />
                <JasmineSprig size={36} className="absolute right-[8%] top-[14%] float-y-slow opacity-80" color="var(--jasmine)" accent="var(--gold)" />
                <JasmineSprig size={32} className="absolute left-[10%] bottom-[12%] float-y opacity-75" color="var(--jasmine)" accent="var(--peacock)" />

                {/* floating pill: Dadi morning */}
                <div className="clay-tile absolute -left-2 top-12 z-10 flex w-[228px] items-center gap-3 p-3 float-y">
                  <span className="clay-icon h-10 w-10 bg-[color-mix(in_oklch,var(--gold)_18%,var(--surface))] text-gold">
                    <Pill size={18} strokeWidth={2} />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[12px] font-semibold text-tx-1">Dadi · 8:00 am</div>
                    <div className="text-[11px] text-tx-2">Metformin 500 mg taken</div>
                  </div>
                  <CheckCircle2 size={16} className="ml-auto text-gold" strokeWidth={2.2} />
                </div>

                {/* floating pill: organ score */}
                <div className="clay-tile absolute -right-2 top-40 z-10 w-[212px] p-4 float-y-slow">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tx-3">Heart · ह्रदय</div>
                    <Sparkles size={13} className="text-gold" />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="font-mono text-[34px] font-semibold leading-none text-tx-1 glow-gold">84</div>
                    <div className="mb-1 text-[12px] font-medium text-gold">+3 this week</div>
                  </div>
                  <div className="mt-3 grid h-10 grid-cols-7 items-end gap-1.5">
                    {[40, 55, 48, 62, 70, 78, 84].map((h, i) => (
                      <div
                        key={i}
                        className="rounded-t-md"
                        style={{ height: `${h}%`, background: 'linear-gradient(to top, var(--gold-deep), var(--gold))' }}
                      />
                    ))}
                  </div>
                </div>

                {/* voice bubble */}
                <div className="clay-tile absolute bottom-4 left-2 z-10 flex w-[262px] items-start gap-3 p-3.5 float-y" style={{ animationDelay: '-2s' }}>
                  <span className="clay-icon h-10 w-10 breathe bg-[color-mix(in_oklch,var(--vermilion)_22%,var(--surface))] text-vermilion">
                    <Mic size={18} strokeWidth={2} />
                  </span>
                  <div className="leading-snug">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-tx-3">Papa says</div>
                    <div className="mt-0.5 text-[13px] text-tx-1">
                      &ldquo;Sugar 142 fasting, knees a little stiff today.&rdquo;
                    </div>
                  </div>
                </div>

                {/* tiny SOS chip */}
                <div className="clay-pill absolute -right-2 bottom-16 z-10 flex items-center gap-2 px-3 py-2 float-y-slow" style={{ animationDelay: '-4s' }}>
                  <ShieldCheck size={14} className="text-vermilion" strokeWidth={2.2} />
                  <span className="text-[11px] font-semibold tracking-wide text-tx-1">SOS ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ MARQUEE RIBBON ============================ */}
        <section aria-hidden className="border-y border-border/60 bg-surface/40 py-5 backdrop-blur-sm">
          <div className="overflow-hidden">
            <div className="marquee-track gap-12 whitespace-nowrap text-[13px] font-medium uppercase tracking-[0.28em] text-tx-3">
              {[...ribbon, ...ribbon].map((label, i) => (
                <span key={i} className="inline-flex items-center gap-12">
                  <span>{label}</span>
                  <span className="text-accent">✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ STATS ============================ */}
        <section className="relative px-5 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 sm:grid-cols-3">
              {[
                { value: '12+', label: 'care modules', hint: 'check-ins to lab OCR', sym: '꙳' },
                { value: '4', label: 'organ scores', hint: 'heart · brain · gut · lungs', sym: '✦' },
                { value: '1', label: 'family record', hint: 'every generation, one kolam', sym: '◈' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="petal-card kolam-frame scroll-pop relative overflow-hidden p-7 text-left"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <KolamDotStrip className="absolute inset-x-7 top-3 opacity-70" count={20} every={5} />
                  <div className="mt-5 flex items-baseline justify-between gap-3">
                    <div className="font-display text-[68px] font-medium leading-none tracking-tight text-gold-grad italic" style={{ fontVariationSettings: '"SOFT" 100' }}>
                      {s.value}
                    </div>
                    <span className="font-display text-[32px] leading-none text-gold opacity-60">{s.sym}</span>
                  </div>
                  <div className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                    ✦ {s.label}
                  </div>
                  <div className="mt-2 text-[13.5px] leading-6 text-tx-2">{s.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ PLATFORM TRIPTYCH ============================ */}
        <section id="platform" className="relative px-5 py-24 sm:px-6 lg:px-8">
          <CloudField variant="soft" className="!inset-x-0 !top-0 !bottom-auto !h-[80%]" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-14 max-w-3xl scroll-reveal">
              <span className="eyebrow">Platform</span>
              <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight text-tx-1 sm:text-[52px]">
                The operational layer for <span className="italic text-accent">family</span> care.
              </h2>
              <p className="mt-5 max-w-2xl text-[16px] leading-7 text-tx-2">
                Built for the practical work families do every day: remember doses, notice change, understand reports
                and ask better questions — without hunting through eight apps.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {primaryFeatures.map((feature, index) => {
                const Icon = feature.icon;
                const meta: Record<string, { color: string; numeral: string; label: string }> = {
                  sage:  { color: 'var(--gold)',      numeral: '१', label: 'pratham · the listener' },
                  peach: { color: 'var(--vermilion)', numeral: '२', label: 'dvitīya · the keeper' },
                  rose:  { color: 'var(--peacock)',   numeral: '३', label: 'tritīya · the seer' },
                };
                const m = meta[feature.accent];
                return (
                  <article
                    key={feature.title}
                    className="petal-card kolam-frame lift scroll-pop relative overflow-hidden p-7 pt-9 pb-8"
                    style={{ animationDelay: `${index * 110}ms` }}
                  >
                    {/* glow blob */}
                    <div
                      className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
                      style={{ background: m.color }}
                    />

                    {/* top kolam dot strip */}
                    <KolamDotStrip className="absolute inset-x-7 top-3" count={22} every={4} accent={m.color} />

                    {/* numeral + label */}
                    <div className="relative mb-7 flex items-baseline gap-3">
                      <span
                        className="font-display text-[44px] font-medium italic leading-none text-gold-grad"
                        style={{ fontVariationSettings: '"SOFT" 100' }}
                      >
                        {m.numeral}
                      </span>
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                        ✦ {m.label}
                      </span>
                    </div>

                    {/* kolam-haloed icon */}
                    <KolamHalo
                      color={m.color}
                      size={108}
                      iconSlot={<Icon size={26} strokeWidth={1.9} />}
                    />

                    <h3 className="mt-7 font-display text-[26px] font-medium leading-tight tracking-tight text-tx-1">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-[1.65] text-tx-2">{feature.body}</p>

                    {/* gold-rule */}
                    <div
                      className="my-6 h-px w-full"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, color-mix(in oklch, var(--gold) 50%, transparent), transparent)',
                      }}
                    />

                    <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.24em] text-gold">
                      <span>✦</span>
                      Learn more
                      <ArrowRight size={13} strokeWidth={2.4} className="ml-0.5" />
                    </div>

                    {/* corner jasmine */}
                    <JasmineSprig
                      size={32}
                      className="absolute -right-1 -bottom-1 opacity-55"
                      color="var(--jasmine)"
                      accent={m.color}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ FAMILY PERSONAS ============================ */}
        <section id="family" className="relative px-5 py-28 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-14 grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="scroll-left">
                <span className="eyebrow">A family at a glance</span>
                <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                  One sky. <span className="italic text-accent">Three</span> very different mornings.
                </h2>
              </div>
              <p className="scroll-right max-w-md text-[15.5px] leading-7 text-tx-2 lg:justify-self-end">
                Kutumb watches each member with their own schedule, their own thresholds, their own language — and
                still keeps the whole household in one quiet conversation.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {personas.map((p, i) => {
                const Icon = p.icon;
                const tones: Record<string, { bg: string; text: string; ring: string }> = {
                  butter: { bg: 'var(--butter)', text: 'var(--terracotta)', ring: 'var(--saffron)' },
                  sage: { bg: 'var(--accent-soft)', text: 'var(--accent)', ring: 'var(--accent)' },
                  sky: { bg: 'var(--sky-soft)', text: 'var(--blue)', ring: 'var(--sky)' },
                };
                const t = tones[p.tone];
                return (
                  <article
                    key={p.name}
                    className="clay lift scroll-pop relative overflow-hidden p-6"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div
                      className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-70 blur-2xl"
                      style={{ background: t.bg }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span
                        className="clay-icon h-12 w-12 tilt"
                        style={{ background: `color-mix(in oklch, ${t.bg} 60%, var(--surface))`, color: t.text }}
                      >
                        <Icon size={20} strokeWidth={2} />
                      </span>
                      <span className="font-mono text-[12px] tracking-[0.18em] text-tx-3">{p.age} yrs</span>
                    </div>
                    <h3 className="mt-7 font-display text-[28px] font-medium leading-tight tracking-tight">
                      {p.name}
                    </h3>
                    <p className="mt-1 text-[12.5px] uppercase tracking-[0.18em] text-tx-3">{p.role}</p>
                    <p className="mt-5 text-[14.5px] leading-[1.65] text-tx-2">&ldquo;{p.line}&rdquo;</p>

                    <div className="mt-7 flex items-center gap-2">
                      <span
                        className="clay-pressed inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-tx-2"
                        style={{ color: t.text }}
                      >
                        <Clock size={11} strokeWidth={2.2} />
                        Today
                      </span>
                      <span className="clay-pressed inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-tx-2">
                        <CheckCircle2 size={11} strokeWidth={2.2} className="text-accent" />
                        On track
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ ORGAN SCORES VISUAL ============================ */}
        <section className="relative px-5 py-28 sm:px-6 lg:px-8">
          <CloudField variant="meadow" className="!inset-x-0 !top-0 !bottom-auto !h-[80%]" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="scroll-left">
                <span className="eyebrow">Organ scores</span>
                <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                  Four soft signals. <br />
                  <span className="italic text-accent">Read at a glance.</span>
                </h2>
                <p className="mt-5 max-w-md text-[15.5px] leading-7 text-tx-2">
                  Every score is the gentle weighted sum of recent vitals, lab values, symptoms, sleep and adherence.
                  Tap any organ to see exactly which signals nudged the score, with the source for each one.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {['vitals', 'labs', 'symptoms', 'sleep', 'adherence'].map((t) => (
                    <span key={t} className="clay-pill px-3.5 py-1.5 text-[12px] font-medium text-tx-2">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {organScores.map((o, i) => {
                  const Icon = o.icon;
                  return (
                    <div
                      key={o.label}
                      className="clay scroll-pop relative flex flex-col items-center p-7 text-center"
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      <div
                        className="ring-bg flex h-32 w-32 items-center justify-center"
                        style={{ ['--score' as string]: o.score, ['--accent' as string]: o.color }}
                      >
                        <div className="clay-soft flex h-[104px] w-[104px] flex-col items-center justify-center">
                          <Icon size={22} strokeWidth={1.9} style={{ color: o.color }} />
                          <div className="mt-1 font-mono text-[28px] font-semibold leading-none">{o.score}</div>
                        </div>
                      </div>
                      <div className="mt-5 text-[13px] font-semibold uppercase tracking-[0.22em] text-tx-2">
                        {o.label}
                      </div>
                      <div className="mt-1.5 text-[11px] text-tx-3">7-day trend · stable</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ============================ WORKFLOW ============================ */}
        <section id="workflow" className="relative px-5 py-28 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-14 max-w-3xl scroll-reveal">
              <span className="eyebrow">Workflow</span>
              <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                From scattered updates to <span className="italic text-accent">one care loop.</span>
              </h2>
            </div>

            <div className="relative grid gap-6 md:grid-cols-3">
              {/* connecting kolam dot path between cards (desktop only) */}
              <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-[88px] hidden md:block">
                <div
                  className="mx-[14%] h-px"
                  style={{
                    background:
                      'repeating-linear-gradient(90deg, color-mix(in oklch, var(--gold) 70%, transparent) 0 4px, transparent 4px 14px)',
                    opacity: 0.55,
                  }}
                />
              </div>

              {flow.map((f, i) => {
                const Icon = f.icon;
                const flowMeta: Record<string, { color: string; numeral: string; label: string }> = {
                  sage:  { color: 'var(--vermilion)', numeral: '१', label: 'capture · the gift' },
                  peach: { color: 'var(--gold)',      numeral: '२', label: 'interpret · the read' },
                  rose:  { color: 'var(--peacock)',   numeral: '३', label: 'act · the response' },
                };
                const m = flowMeta[f.tone];
                return (
                  <div
                    key={f.step}
                    className="petal-card kolam-frame lift scroll-pop relative overflow-hidden p-7 pt-8"
                    style={{ animationDelay: `${i * 110}ms` }}
                  >
                    {/* glow */}
                    <div
                      className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full opacity-30 blur-3xl"
                      style={{ background: m.color }}
                    />

                    {/* numeral + step label */}
                    <div className="relative mb-6 flex items-center justify-between gap-3">
                      <div className="flex items-baseline gap-3">
                        <span
                          className="font-display text-[44px] font-medium italic leading-none text-gold-grad"
                          style={{ fontVariationSettings: '"SOFT" 100' }}
                        >
                          {m.numeral}
                        </span>
                        <div className="leading-tight">
                          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                            ✦ step {f.step}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-tx-3">
                            {m.label}
                          </div>
                        </div>
                      </div>
                      {/* the connector "bead" — sits over the dotted line */}
                      <span
                        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, color-mix(in oklch, ${m.color} 70%, var(--surface)), color-mix(in oklch, ${m.color} 28%, var(--surface)))`,
                          color: 'var(--indigo-deep)',
                          boxShadow: `0 0 0 1.5px color-mix(in oklch, ${m.color} 55%, transparent), 0 8px 22px color-mix(in oklch, ${m.color} 35%, transparent)`,
                        }}
                      >
                        <Icon size={18} strokeWidth={2.1} />
                      </span>
                    </div>

                    <KolamHalo
                      color={m.color}
                      size={92}
                      intensity="soft"
                      iconSlot={<Icon size={22} strokeWidth={2} />}
                    />

                    <h3 className="mt-7 font-display text-[26px] font-medium leading-tight tracking-tight text-tx-1">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-[1.65] text-tx-2">{f.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ MEMORY BOX (private encrypted .kutumb) ============================ */}
        <section id="memory" className="relative px-5 py-28 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="grid items-stretch gap-10 lg:grid-cols-[1fr_1fr]">
              <div className="scroll-left">
                <span className="eyebrow">The memory box</span>
                <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                  Your family&apos;s memory <span className="italic text-accent">never leaves the device.</span>
                </h2>
                <p className="mt-6 max-w-lg text-[15.5px] leading-7 text-tx-2">
                  We keep a single sealed file — <code className="font-mono text-[14px] text-accent">.kutumb</code> —
                  encrypted with AES-256-GCM and unlocked only by biometrics. The cloud sees the structured records
                  you choose to sync. It never sees the soft, conversational memory.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    ['AES-256-GCM at rest', Lock],
                    ['Android Keystore · iOS Secure Enclave key', ShieldCheck],
                    ['Per-family member memory partitions', UsersRound],
                    ['One-tap export, one-tap revoke', CloudMoon],
                  ].map(([label, Icn]) => {
                    const I = Icn as typeof Lock;
                    return (
                      <li key={label as string} className="flex items-center gap-3 text-[14.5px] text-tx-2">
                        <span className="clay-icon h-9 w-9 bg-[color-mix(in_oklch,var(--accent-soft)_60%,var(--surface))] text-accent">
                          <I size={16} strokeWidth={2} />
                        </span>
                        {label as string}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* clay terminal */}
              <div className="clay scroll-right relative overflow-hidden p-1">
                <div className="clay-pressed h-full p-6">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose" />
                    <span className="h-3 w-3 rounded-full bg-saffron" />
                    <span className="h-3 w-3 rounded-full bg-accent" />
                    <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.18em] text-tx-3">
                      .kutumb · sealed
                    </span>
                  </div>
                  <pre className="mt-5 overflow-x-auto font-mono text-[12.5px] leading-[1.7] text-tx-2">
{`{
  "family_id": "f_42xq9",
  "members": [
    { "name": "Dadi-ji",  "age": 68, "scores": { "heart": 78, "gut": 72 } },
    { "name": "Papa",     "age": 42, "scores": { "heart": 84, "brain": 79 } },
    { "name": "Aanya",    "age": 7,  "scores": { "lungs": 88 } }
  ],
  "memory_patches": 312,
  "encrypted": true,
  "last_unlock": "2026-05-01T07:14:08+05:30"
}`}
                  </pre>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="clay-pill px-3 py-1.5 text-[11px] font-medium text-tx-2">
                      <Droplets size={11} className="mr-1.5 inline text-blue" /> hydration patch
                    </span>
                    <span className="clay-pill px-3 py-1.5 text-[11px] font-medium text-tx-2">
                      <Pill size={11} className="mr-1.5 inline text-peach" /> dose taken
                    </span>
                    <span className="clay-pill px-3 py-1.5 text-[11px] font-medium text-tx-2">
                      <FileText size={11} className="mr-1.5 inline text-accent" /> lab synced
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================ MODULES ============================ */}
        <section id="modules" className="relative px-5 py-28 sm:px-6 lg:px-8">
          <CloudField variant="dawn" className="!inset-x-0 !top-0 !bottom-auto !h-[70%]" />
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="scroll-reveal max-w-xl">
                <span className="eyebrow">Modules</span>
                <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                  Built around the care tasks <span className="italic text-accent">families repeat.</span>
                </h2>
              </div>
              <Link
                href="/auth?tab=register"
                className="clay-btn-ghost focus-ring inline-flex w-fit items-center gap-2 px-5 py-3 text-sm font-semibold text-tx-1"
              >
                Start now
                <ArrowRight size={15} strokeWidth={2.2} />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((item, i) => {
                const Icon = item.icon;
                const palette: Record<string, { bg: string; text: string }> = {
                  sage: { bg: 'var(--accent-soft)', text: 'var(--accent)' },
                  peach: { bg: 'var(--peach-soft)', text: 'var(--terracotta)' },
                  sky: { bg: 'var(--sky-soft)', text: 'var(--blue)' },
                  rose: { bg: 'var(--rose-muted)', text: 'var(--rose)' },
                  butter: { bg: 'var(--butter)', text: 'var(--terracotta)' },
                  lilac: { bg: 'var(--lilac)', text: 'var(--accent)' },
                  terracotta: { bg: 'var(--peach-soft)', text: 'var(--terracotta)' },
                };
                const p = palette[item.tone] ?? palette.sage;
                return (
                  <div
                    key={item.label}
                    className="clay lift scroll-pop p-6"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <div
                      className="clay-icon mb-6 h-12 w-12 tilt"
                      style={{ background: `color-mix(in oklch, ${p.bg} 60%, var(--surface))`, color: p.text }}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <div className="font-display text-[18px] font-medium tracking-tight text-tx-1">{item.label}</div>
                    <div className="mt-2 text-[13px] leading-[1.55] text-tx-2">{item.detail}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ TRUST + SAFETY ============================ */}
        <section className="relative px-5 py-28 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mb-14 max-w-3xl scroll-reveal">
              <span className="eyebrow">Trust &amp; safety</span>
              <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                Calm on the surface. <span className="italic text-accent">Hard guards underneath.</span>
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {trustPoints.map((t, i) => {
                const Icon = t.icon;
                const trustColors = ['var(--gold)', 'var(--vermilion)', 'var(--peacock)'];
                const c = trustColors[i % trustColors.length];
                return (
                  <div
                    key={t.title}
                    className="petal-card kolam-frame scroll-pop relative overflow-hidden p-7 pt-9"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div
                      className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-25 blur-3xl"
                      style={{ background: c }}
                    />

                    <KolamDotStrip className="absolute inset-x-7 top-3" count={20} every={5} accent={c} />

                    <KolamHalo
                      color={c}
                      size={88}
                      intensity="soft"
                      iconSlot={<Icon size={20} strokeWidth={2} />}
                    />

                    <h3 className="mt-7 font-display text-[22px] font-medium leading-tight tracking-tight text-tx-1">
                      {t.title}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-[1.65] text-tx-2">{t.body}</p>

                    <JasmineSprig
                      size={28}
                      className="absolute -left-1 -bottom-1 opacity-50"
                      color="var(--jasmine)"
                      accent={c}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============================ FAQ ============================ */}
        <section id="faq" className="relative px-5 py-28 sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mb-12 scroll-reveal">
              <span className="eyebrow">FAQ</span>
              <h2 className="mt-5 font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[52px]">
                Questions <span className="italic text-accent">often asked.</span>
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details
                  key={f.q}
                  className="faq clay scroll-reveal group p-5 sm:p-6"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <summary className="flex items-center gap-4 font-display text-[18px] font-medium leading-tight tracking-tight text-tx-1 sm:text-[20px]">
                    {f.q}
                  </summary>
                  <div className="faq-body mt-4 text-[14.5px] leading-[1.7] text-tx-2">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ FINAL CTA ============================ */}
        <section className="relative px-5 pb-28 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-6xl">
            <div className="clay scroll-pop relative overflow-hidden p-1">
              <div
                className="relative overflow-hidden rounded-[28px] p-10 sm:p-14 lg:p-16"
                style={{
                  background: `linear-gradient(160deg, color-mix(in oklch, var(--accent) 90%, white 10%) 0%, var(--accent) 50%, color-mix(in oklch, var(--accent) 80%, black 20%) 100%)`,
                  color: 'var(--accent-text)',
                }}
              >
                {/* decorative cloud blobs */}
                <span className="absolute -right-16 -top-20 h-72 w-72 rounded-full opacity-50 blur-3xl" style={{ background: 'var(--butter)' }} />
                <span className="absolute -left-10 -bottom-24 h-80 w-80 rounded-full opacity-40 blur-3xl" style={{ background: 'var(--peach)' }} />

                <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div
                      className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur"
                      style={{ background: 'color-mix(in oklch, var(--accent-text) 18%, transparent)' }}
                    >
                      <CheckCircle2 size={13} strokeWidth={2.4} />
                      Free for the first family member
                    </div>
                    <h2 className="font-display text-[40px] font-medium leading-[1.05] tracking-tight sm:text-[56px]">
                      Bring the family <br />
                      record together <span className="italic">today.</span>
                    </h2>
                    <p className="mt-5 max-w-2xl text-[15.5px] leading-7" style={{ color: 'color-mix(in oklch, var(--accent-text) 82%, transparent)' }}>
                      Start with check-ins and medicines. Add lab reports, family members and AI conversations as the
                      record grows — gently, on your terms.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      href="/auth?tab=register"
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-[15px] font-semibold transition-all"
                      style={{
                        background: 'var(--accent-text)',
                        color: 'var(--accent)',
                        boxShadow: '0 12px 28px color-mix(in oklch, black 30%, transparent)',
                      }}
                    >
                      Create family profile
                      <ArrowRight size={16} strokeWidth={2.2} />
                    </Link>
                    <Link
                      href="/dashboard"
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-[15px] font-semibold transition-all"
                      style={{
                        background: 'color-mix(in oklch, var(--accent-text) 16%, transparent)',
                        color: 'var(--accent-text)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      Tour the dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="relative border-t border-border/50 bg-surface/40 px-5 py-10 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="clay-icon h-9 w-9 bg-gradient-to-br from-[var(--accent-soft)] to-[var(--accent)] text-[var(--accent-text)]">
              <Leaf size={16} strokeWidth={2} />
            </span>
            <div className="leading-tight">
              <div className="font-display text-[15px] font-medium tracking-tight">Kutumb</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-tx-3">Family · Health</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-tx-3">
            <span>© 2026 Kutumb</span>
            <span>Made for Indian families</span>
            <Link href="/dashboard" className="hover:text-tx-1">Dashboard</Link>
            <Link href="/auth" className="hover:text-tx-1">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
