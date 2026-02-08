import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format amount from cents to display string
 */
export function formatCurrency(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Format amount with sign (+ for income, - for expense)
 */
export function formatAmount(cents: number): string {
  const sign = cents >= 0 ? '+' : '-';
  return `${sign}${formatCurrency(cents)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date for month display
 */
export function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(Number(year), Number(monthNum) - 1);
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Format percentage change
 */
export function formatPercentage(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
