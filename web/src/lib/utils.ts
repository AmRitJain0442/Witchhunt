import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fmt(n: number, decimals = 0) {
  return n.toFixed(decimals);
}

export function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-500';
  return 'text-red-500';
}

export function scoreBg(score: number) {
  if (score >= 75) return 'bg-emerald-50 border-emerald-200';
  if (score >= 50) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function trendIcon(trend: string) {
  if (trend === 'improving')         return '↑';
  if (trend === 'declining')         return '↓';
  if (trend === 'stable')            return '→';
  return '—';
}

export function trendColor(trend: string) {
  if (trend === 'improving') return 'text-emerald-600';
  if (trend === 'declining') return 'text-red-500';
  return 'text-slate-400';
}

export function severityBadge(s: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    warning:  'bg-amber-100 text-amber-700 border-amber-200',
    info:     'bg-blue-100 text-blue-700 border-blue-200',
  };
  return map[s] ?? map.info;
}

export function relativeDate(iso: string) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff} days ago`;
}
