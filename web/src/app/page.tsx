import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

const features = [
  { icon: '◈', title: 'AI Health Memory',    body: 'Your complete medical profile lives locally, encrypted on-device. Kutumb AI reads it — nothing leaves your hands.' },
  { icon: '◇', title: 'Medicine Intelligence', body: 'Prescription-enforced cabinet with drug interaction checks, dose reminders, and refill forecasting.' },
  { icon: '◉', title: 'Organ Scores',         body: 'Daily 0–100 scores for Heart, Brain, Gut and Lungs — computed from your vitals and check-ins.' },
  { icon: '◈', title: 'Whole Family',         body: 'One account for every generation. Manage grandparents, children, and everyone in between.' },
  { icon: '◇', title: 'Lab Report OCR',       body: 'Upload any lab report. AI extracts biomarkers, flags abnormals, and plots trends over time.' },
  { icon: '◉', title: 'Emergency SOS',        body: 'One-tap alert dispatches location, blood group, and emergency contacts via SMS and push.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-tx-1">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center px-8 border-b border-border bg-bg/80 backdrop-blur-md">
        <span className="text-sm font-semibold tracking-tight mr-auto">Kutumb</span>
        <nav className="flex items-center gap-6 mr-6">
          <Link href="#features" className="text-[13px] text-tx-2 hover:text-tx-1 transition-colors">Features</Link>
          <Link href="/auth" className="text-[13px] text-tx-2 hover:text-tx-1 transition-colors">Sign in</Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/auth?tab=register"
            className="text-[13px] bg-accent text-accent-text hover:bg-accent-hover px-4 py-1.5 rounded-lg font-medium transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-28 px-8 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 border border-border rounded-full px-3.5 py-1 text-[11px] text-tx-3 uppercase tracking-widest mb-10">
          Health Intelligence · Family First
        </div>
        <h1 className="text-[clamp(2.8rem,6vw,5.5rem)] font-semibold tracking-tight leading-[1.05] text-tx-1 mb-6">
          Health tracking<br />
          <span className="text-accent">for every generation</span>
        </h1>
        <p className="text-[17px] text-tx-2 max-w-xl mx-auto leading-relaxed mb-12">
          Kutumb is an AI-powered health companion built for Indian families —
          from grandparents to grandchildren, in one place.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/auth?tab=register"
            className="bg-accent text-accent-text hover:bg-accent-hover px-7 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Start for free
          </Link>
          <Link
            href="/dashboard"
            className="border border-border hover:border-border-strong text-tx-2 hover:text-tx-1 px-7 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            View demo
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-border mx-8 max-w-5xl mx-auto" />

      {/* Features */}
      <section id="features" className="py-24 px-8 max-w-5xl mx-auto">
        <div className="text-[11px] text-tx-3 uppercase tracking-widest text-center mb-14">
          Everything your family needs
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {features.map((f, i) => (
            <div key={i} className="bg-bg p-8 hover:bg-bg-subtle transition-colors">
              <div className="text-tx-3 text-lg mb-5 font-mono">{f.icon}</div>
              <div className="text-[14px] font-medium text-tx-1 mb-2">{f.title}</div>
              <div className="text-[13px] text-tx-2 leading-relaxed">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-8">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[['12+', 'modules'], ['4', 'organ scores'], ['100%', 'local memory']].map(([n, l]) => (
            <div key={l}>
              <div className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-tight text-tx-1 font-[var(--font-mono)]">{n}</div>
              <div className="text-[12px] text-tx-3 uppercase tracking-widest mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 text-center border-t border-border">
        <h2 className="text-[clamp(1.8rem,3vw,2.8rem)] font-semibold tracking-tight text-tx-1 mb-4">
          Start tracking today
        </h2>
        <p className="text-[15px] text-tx-2 mb-8">Free forever for individuals. No credit card required.</p>
        <Link
          href="/auth?tab=register"
          className="inline-block bg-accent text-accent-text hover:bg-accent-hover px-8 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Create your account →
        </Link>
      </section>

      <footer className="border-t border-border py-8 px-8 flex items-center justify-between">
        <span className="text-[12px] text-tx-3">Kutumb © 2025</span>
        <span className="text-[12px] text-tx-3">Built for Indian families</span>
      </footer>
    </div>
  );
}
