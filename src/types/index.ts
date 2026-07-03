// ==============================================
// Navigation & UI Types for FinanceOS
// ==============================================

import { type LucideIcon } from "lucide-react";

// ── Navigation ──────────────────────────────────
export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
  description?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// ── Breadcrumb ──────────────────────────────────
export interface BreadcrumbItem {
  title: string;
  href?: string;
}

// ── Date Range ──────────────────────────────────
export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: DateRangePreset;
}

// ── Currency ────────────────────────────────────
export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  decimals: number;
}

// ── API Response ────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

// ── Sort & Filter ───────────────────────────────
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface FilterConfig {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in";
  value: string | number | boolean | string[];
}
