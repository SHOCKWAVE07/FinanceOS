// ==============================================
// Utility Functions for FinanceOS
// ==============================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { DEFAULT_CURRENCY, DATE_FORMATS } from "./constants";

// ── Classname Utility ───────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency Formatting ─────────────────────────
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY.code,
  locale: string = DEFAULT_CURRENCY.locale
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY.code,
  locale: string = DEFAULT_CURRENCY.locale
): string {
  if (Math.abs(amount) >= 10_000_000) {
    return `${DEFAULT_CURRENCY.symbol}${(amount / 10_000_000).toFixed(2)}Cr`;
  }
  if (Math.abs(amount) >= 100_000) {
    return `${DEFAULT_CURRENCY.symbol}${(amount / 100_000).toFixed(2)}L`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${DEFAULT_CURRENCY.symbol}${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency, locale);
}

// ── Number Formatting ───────────────────────────
export function formatNumber(
  value: number,
  decimals: number = 2,
  locale: string = DEFAULT_CURRENCY.locale
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

// ── Date Formatting ─────────────────────────────
export function formatDate(
  date: Date | string,
  formatStr: string = DATE_FORMATS.display
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatStr);
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return formatDistanceToNow(d, { addSuffix: true });
}

// ── String Utilities ────────────────────────────
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "…";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Color Utilities ─────────────────────────────
export function getAmountColor(amount: number): string {
  if (amount > 0) return "text-emerald-500";
  if (amount < 0) return "text-red-500";
  return "text-muted-foreground";
}

export function getChangeIndicator(value: number): {
  color: string;
  icon: "up" | "down" | "neutral";
  label: string;
} {
  if (value > 0) {
    return { color: "text-emerald-500", icon: "up", label: "increase" };
  }
  if (value < 0) {
    return { color: "text-red-500", icon: "down", label: "decrease" };
  }
  return { color: "text-muted-foreground", icon: "neutral", label: "no change" };
}

// ── Validation Helpers ──────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

// ── Misc ────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}
