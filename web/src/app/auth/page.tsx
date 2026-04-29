'use client';

import { ArrowRight, CheckCircle2, Loader2, ShieldPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

function AuthForm() {
  const params = useSearchParams();
  const [tab, setTab] = useState<'login' | 'register'>(params.get('tab') === 'register' ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
      } else {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        await signUp(email, password, name);
      }
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-tx-1 lg:grid lg:grid-cols-[1.02fr_0.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image
          src="/images/kutumb-family-care.png"
          alt="Indian family using Kutumb together"
          fill
          priority
          sizes="50vw"
          className="object-cover object-[62%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_40%,var(--bg)_100%)]" />
        <div className="absolute bottom-10 left-10 right-16 scroll-left">
          <div className="max-w-lg rounded-[1.5rem] border border-border bg-surface/88 p-6 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-muted text-accent">
              <ShieldPlus size={22} strokeWidth={1.8} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">A family health record people can actually keep up with.</h1>
            <p className="mt-3 text-sm leading-6 text-tx-2">
              Start with one profile, then add check-ins, medicines, reports, and family access as care becomes more coordinated.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-accent-text">
              <ShieldPlus size={19} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-tight">Kutumb</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-tx-3">Family health</span>
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md scroll-reveal">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">
                <CheckCircle2 size={13} strokeWidth={1.9} className="text-accent" />
                Secure care workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-tx-1">
                {tab === 'login' ? 'Welcome back' : 'Create your family profile'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-tx-2">
                {tab === 'login'
                  ? 'Sign in to continue tracking family health context.'
                  : 'Set up the account that anchors medicines, check-ins, reports, and AI guidance.'}
              </p>
            </div>

            <div className="surface-panel rounded-2xl p-2">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-bg-subtle p-1">
                {(['login', 'register'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTab(t);
                      setError('');
                    }}
                    className={cn(
                      'focus-ring rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all',
                      tab === t ? 'bg-surface text-tx-1 shadow-[var(--shadow-sm)]' : 'text-tx-3 hover:text-tx-1',
                    )}
                  >
                    {t === 'login' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
                {tab === 'register' && (
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Full name</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rajesh Kumar"
                      required
                      autoComplete="name"
                      className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none transition-colors placeholder:text-tx-3"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none transition-colors placeholder:text-tx-3"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-tx-3">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'register' ? 'Min. 6 characters' : 'Your password'}
                    required
                    minLength={tab === 'register' ? 6 : undefined}
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    className="focus-ring w-full rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-tx-1 outline-none transition-colors placeholder:text-tx-3"
                  />
                </label>

                {error && (
                  <div className="rounded-xl border border-red/20 bg-red/[0.08] px-3.5 py-3 text-sm text-red">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-hover disabled:opacity-55"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={1.9} />}
                  {loading ? 'Working' : tab === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <AuthForm />
    </Suspense>
  );
}
