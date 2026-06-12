import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency ─────────────────────────────────────────────────────────────────
// Global default set at app boot from tenant settings (see AuthGuard).
// Every call to formatCurrency() picks this up automatically — no prop drilling.
let _appCurrency = 'XAF';

export function setAppCurrency(currency: string) {
  _appCurrency = currency;
}

export function getAppCurrency(): string {
  return _appCurrency;
}

export function formatCurrency(value: number | string, currency?: string): string {
  const c = currency ?? _appCurrency;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  // French locale for XAF/XOF gives correct FCFA grouping (1 234 FCFA)
  const locale = ['XAF', 'XOF', 'EUR'].includes(c) ? 'fr-FR' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(num);
}

// ── Dates ────────────────────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}
