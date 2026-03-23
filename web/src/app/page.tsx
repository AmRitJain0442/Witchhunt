import Link from 'next/link';

const features = [
  { icon: '🧠', title: 'AI Health Memory', body: 'Kutumb AI remembers your full medical history, medicines, allergies and lifestyle — locally encrypted, never uploaded.' },
  { icon: '💊', title: 'Smart Medicine Cabinet', body: 'Prescription-enforced medicine tracking with dose scheduling, refill alerts, and drug interaction warnings.' },
  { icon: '📊', title: 'Organ Health Scores', body: 'Daily scores for Heart, Brain, Gut and Lungs based on your check-ins, vitals and wearable data.' },
  { icon: '👨‍👩‍👧', title: 'Whole Family', body: 'Manage health for every family member — grandparents, children, everyone — from one account.' },
  { icon: '🔬', title: 'Lab Report OCR', body: 'Upload lab reports and let AI extract biomarkers, flag abnormals, and track trends over time.' },
  { icon: '🚨', title: 'Emergency SOS', body: 'One-tap SOS sends location, blood group and emergency contacts to family via SMS and push.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-emerald-700">🌿 Kutumb</span>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Sign in</Link>
            <Link href="/auth?tab=register" className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-full font-medium transition-colors">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-4 py-1.5 rounded-full mb-6 border border-emerald-100">
          🏆 Hackathon 2025
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-6">
          Health tracking for<br />
          <span className="text-emerald-600">the whole family</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Kutumb is a voice-first, AI-powered health companion designed for Indian families.
          One app — grandparents to grandchildren.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/auth?tab=register" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-full font-semibold text-base transition-colors shadow-sm">
            Start for free
          </Link>
          <Link href="/dashboard" className="text-emerald-700 hover:text-emerald-800 px-8 py-3 rounded-full font-semibold text-base border border-emerald-200 hover:border-emerald-300 transition-colors">
            View demo →
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">Everything your family needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-emerald-700 py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          {[['12+', 'Health modules'], ['4', 'Organ scores'], ['100%', 'Local memory']].map(([n, l]) => (
            <div key={l}>
              <div className="text-4xl font-bold text-white">{n}</div>
              <div className="text-emerald-200 text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-sm">
        Built with ❤️ for Indian families · Kutumb 2025
      </footer>
    </div>
  );
}
