'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: DashIcon },
  { href: '/checkin',     label: 'Check-in',     icon: CheckIcon },
  { href: '/medicines',   label: 'Medicines',    icon: PillIcon },
  { href: '/health',      label: 'Health',       icon: HeartIcon },
  { href: '/ai',          label: 'Kutumb AI',    icon: AIIcon },
  { href: '/family',      label: 'Family',       icon: FamilyIcon },
  { href: '/lab-reports', label: 'Lab Reports',  icon: LabIcon },
];

function DashIcon()   { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>; }
function CheckIcon()  { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function PillIcon()   { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2L12 4.5L4.5 12L2 9.5L9.5 2Z" stroke="currentColor" strokeWidth="1.3"/><path d="M5.5 8.5L8.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>; }
function HeartIcon()  { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11.5C7 11.5 1.5 8 1.5 4.5C1.5 3 2.7 2 4 2C5.1 2 6 2.6 7 3.5C8 2.6 8.9 2 10 2C11.3 2 12.5 3 12.5 4.5C12.5 8 7 11.5 7 11.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>; }
function AIIcon()     { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 7C4.5 7 5.5 5 7 5C8.5 5 9.5 7 9.5 7C9.5 7 8.5 9 7 9C5.5 9 4.5 7 4.5 7Z" stroke="currentColor" strokeWidth="1.3"/><circle cx="7" cy="7" r="1" fill="currentColor"/></svg>; }
function FamilyIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="10" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12C1 9.8 2.8 8 5 8C7.2 8 9 9.8 9 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 8.5C11 8.5 13 9.5 13 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>; }
function LabIcon()    { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 1V6L2 11.5C2 12.3 2.7 13 3.5 13H10.5C11.3 13 12 12.3 12 11.5L8.5 6V1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4.5 1H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="5.5" cy="9.5" r="1" fill="currentColor" opacity=".5"/></svg>; }

export default function Sidebar() {
  const pathname  = usePathname();
  const { appUser, signOut } = useAuth();

  const initials = appUser?.name
    ? appUser.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside className="w-52 shrink-0 flex flex-col h-screen sticky top-0 bg-surface border-r border-border">
      {/* Logo */}
      <div className="px-5 h-14 flex items-center border-b border-border">
        <span className="text-sm font-semibold tracking-tight text-tx-1">Kutumb</span>
        <span className="ml-1.5 text-accent text-sm">·</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all',
                active
                  ? 'bg-accent-muted text-accent font-medium'
                  : 'text-tx-2 hover:text-tx-1 hover:bg-bg-subtle',
              )}
            >
              <span className={cn('transition-colors', active ? 'text-accent' : 'text-tx-3')}>
                <Icon />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-accent-muted text-accent text-[10px] font-semibold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-tx-1 truncate leading-none">{appUser?.name ?? '…'}</div>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={signOut}
          className="w-full text-left text-[11px] text-tx-3 hover:text-red transition-colors px-2"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
