'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/utils';

function AuthForm() {
  const params = useSearchParams();
  const [tab, setTab]         = useState<'login' | 'register'>(params.get('tab') === 'register' ? 'register' : 'login');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();

  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
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
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border">
        <Link href="/" className="text-sm font-semibold text-tx-1">Kutumb</Link>
        <ThemeToggle />
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {/* Tab switcher */}
          <div className="flex border border-border rounded-lg p-0.5 mb-8 bg-bg-subtle">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={cn(
                  'flex-1 py-2 text-[13px] font-medium rounded-md transition-all',
                  tab === t
                    ? 'bg-surface text-tx-1 shadow-[var(--shadow-sm)]'
                    : 'text-tx-3 hover:text-tx-2',
                )}
              >
                {t === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-tx-1">
              {tab === 'login' ? 'Welcome back' : 'Get started'}
            </h1>
            <p className="text-[13px] text-tx-2 mt-1">
              {tab === 'login' ? 'Sign in to your Kutumb account' : 'Create your family health account'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {tab === 'register' && (
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Full name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Kumar" required autoComplete="name"
                  className="w-full bg-surface border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 placeholder:text-tx-3 outline-none transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required autoComplete="email"
                className="w-full bg-surface border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 placeholder:text-tx-3 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-tx-3 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'register' ? 'Min. 6 characters' : '••••••••'} required
                className="w-full bg-surface border border-border focus:border-border-strong rounded-lg px-3.5 py-2.5 text-[14px] text-tx-1 placeholder:text-tx-3 outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red/20 bg-red/5 text-red text-[13px] px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-text font-medium py-2.5 rounded-lg text-[14px] transition-colors mt-1"
            >
              {loading ? '…' : tab === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
