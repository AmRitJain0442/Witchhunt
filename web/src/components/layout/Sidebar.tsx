'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard',    icon: '🏠', label: 'Dashboard' },
  { href: '/checkin',      icon: '✏️',  label: 'Check-in' },
  { href: '/medicines',    icon: '💊', label: 'Medicines' },
  { href: '/health',       icon: '📊', label: 'Health' },
  { href: '/ai',           icon: '🤖', label: 'Kutumb AI' },
  { href: '/family',       icon: '👨‍👩‍👧', label: 'Family' },
  { href: '/lab-reports',  icon: '🔬', label: 'Lab Reports' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { appUser, signOut } = useAuth();

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100">
        <span className="text-lg font-bold text-emerald-700">🌿 Kutumb</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="text-sm font-medium text-slate-700 truncate">{appUser?.name ?? '…'}</div>
        <div className="text-xs text-slate-400 truncate mb-2">{appUser?.email ?? ''}</div>
        <button
          onClick={signOut}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
