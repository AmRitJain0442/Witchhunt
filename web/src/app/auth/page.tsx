'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function AuthForm() {
  const params = useSearchParams();
  const [tab, setTab] = useState<'login' | 'register'>(
    params.get('tab') === 'register' ? 'register' : 'login',
  );
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
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
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 px-8 py-8 text-center">
          <div className="text-4xl mb-2">🌿</div>
          <h1 className="text-2xl font-bold text-white">Kutumb</h1>
          <p className="text-emerald-200 text-sm mt-1">Family health, together</p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="px-8 py-6 space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Full name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Rajesh Kumar" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'register' ? 'Min. 6 characters' : 'Your password'} required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
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
