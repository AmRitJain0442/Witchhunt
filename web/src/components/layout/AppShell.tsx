'use client';

import { Menu, ShieldPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="surface-panel rounded-2xl px-8 py-7 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-muted text-accent">
            <ShieldPlus size={22} strokeWidth={1.8} />
          </div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-tx-3">Loading care space</div>
          <div className="mt-4 flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg text-tx-1 md:flex">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:hidden">
        <div>
          <div className="text-sm font-semibold tracking-tight">Kutumb</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-tx-3">Family health</div>
        </div>
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg text-tx-2"
          aria-label="Open navigation"
        >
          <Menu size={19} strokeWidth={1.8} />
        </button>
      </div>

      <Sidebar className="hidden md:flex" />

      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-tx-1/45"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          />
          <div className="relative h-full w-[min(20rem,88vw)]">
            <Sidebar mobile onNavigate={() => setNavOpen(false)} />
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="focus-ring absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg text-tx-2"
              aria-label="Close navigation"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
        {children}
      </main>
    </div>
  );
}
