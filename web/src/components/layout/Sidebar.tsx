'use client';

import {
  Bot,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  NotebookText,
  Pill,
  ShieldPlus,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ui/ThemeToggle';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/checkin', label: 'Check-in', icon: ClipboardCheck },
  { href: '/medicines', label: 'Medicines', icon: Pill },
  { href: '/health', label: 'Health', icon: HeartPulse },
  { href: '/ai', label: 'Kutumb AI', icon: Bot },
  { href: '/family', label: 'Family', icon: UsersRound },
  { href: '/lab-reports', label: 'Lab reports', icon: FileText },
  { href: '/report', label: 'Doctor report', icon: NotebookText },
];

type SidebarProps = {
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
};

export default function Sidebar({ className, mobile = false, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { appUser, signOut } = useAuth();

  const initials = appUser?.name
    ? appUser.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'K';

  return (
    <aside
      className={cn(
        'h-screen w-60 shrink-0 flex-col border-r border-border bg-surface text-tx-1 shadow-sm',
        mobile ? 'flex' : 'sticky top-0',
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-muted text-accent">
          <ShieldPlus size={21} strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight">Kutumb</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-tx-3">Family health</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'focus-ring group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-medium transition-all',
                active
                  ? 'border-accent/20 bg-accent-muted text-accent'
                  : 'text-tx-2 hover:border-border hover:bg-bg-subtle hover:text-tx-1',
              )}
            >
              <Icon
                size={17}
                strokeWidth={1.8}
                className={cn(active ? 'text-accent' : 'text-tx-3 group-hover:text-tx-2')}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-bg px-2.5 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-[11px] font-semibold text-accent">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight text-tx-1">{appUser?.name ?? 'Kutumb user'}</div>
            <div className="truncate text-[10px] text-tx-3">{appUser?.email ?? 'Care profile'}</div>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={signOut}
          className="focus-ring flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-tx-3 transition-colors hover:bg-bg-subtle hover:text-red"
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
