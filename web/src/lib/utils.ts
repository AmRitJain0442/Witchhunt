import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function scoreColor(score: number) {
  if (score >= 75) return 'text-green';
  if (score >= 50) return 'text-amber';
  return 'text-red';
}

export function scoreBorder(score: number) {
  if (score >= 75) return 'border-green/20';
  if (score >= 50) return 'border-amber/20';
  return 'border-red/20';
}

export function scoreBarColor(score: number) {
  if (score >= 75) return 'bg-green';
  if (score >= 50) return 'bg-amber';
  return 'bg-red';
}

export function trendIcon(trend: string) {
  if (trend === 'improving') return '↑';
  if (trend === 'declining') return '↓';
  if (trend === 'stable')    return '→';
  return '—';
}

export function trendColor(trend: string) {
  if (trend === 'improving') return 'text-green';
  if (trend === 'declining') return 'text-red';
  return 'text-tx-3';
}

export function severityBg(s: string) {
  const m: Record<string, string> = {
    critical: 'bg-red/8 border-red/20 text-red',
    warning:  'bg-amber/8 border-amber/20 text-amber',
    info:     'bg-accent-muted border-accent/20 text-accent',
  };
  return m[s] ?? m.info;
}

export function relativeDate(iso: string) {
  const d    = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}
