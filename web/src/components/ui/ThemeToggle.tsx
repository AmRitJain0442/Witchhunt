'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-tx-2 hover:text-tx-1 hover:bg-bg-subtle transition-all ${className}`}
      title="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M7.5 1.5a6 6 0 100 12 6 6 0 000-12zM7.5 0a7.5 7.5 0 110 15A7.5 7.5 0 017.5 0z" fill="currentColor" fillOpacity=".3"/>
          <path d="M7.5 3a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" fill="currentColor"/>
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <path d="M2.9 0.5C3.3 0.2 3.8 0.5 3.8 1C3.6 3.5 5.2 5.9 7.7 6.7C10.2 7.5 12.8 6.4 14 4.3C14.3 3.8 14.9 3.9 15 4.5C15.5 8.5 12.8 12.3 8.8 13.4C4.8 14.5 0.7 12.1 0 8.1C-0.4 5.1 1.1 2.1 3.5 0.7L2.9 0.5Z" fill="currentColor"/>
        </svg>
      )}
    </button>
  );
}
