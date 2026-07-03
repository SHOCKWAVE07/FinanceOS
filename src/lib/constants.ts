// ==============================================
// Application Constants
// ==============================================

// ── App Info ────────────────────────────────────
export const APP_NAME = "FinanceOS";
export const APP_DESCRIPTION =
  "Your Personal Finance Operating System — track expenses, investments, goals, and more.";
export const APP_VERSION = "0.1.0";

// ── Routes ──────────────────────────────────────
export const ROUTES = {
  // Public
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",

  // Protected
  DASHBOARD: "/dashboard",
  EXPENSES: "/expenses",
  INCOME: "/income",
  SALARY: "/salary",
  INVESTMENTS: "/investments",
  GOALS: "/goals",
  MILESTONES: "/milestones",
  NOTES: "/notes",
  TIMELINE: "/timeline",
  ANALYTICS: "/analytics",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;

// ── Currency ────────────────────────────────────
export const DEFAULT_CURRENCY = {
  code: "INR",
  symbol: "₹",
  locale: "en-IN",
  decimals: 2,
} as const;

export const SUPPORTED_CURRENCIES = [
  { code: "INR", symbol: "₹", locale: "en-IN", decimals: 2 },
  { code: "USD", symbol: "$", locale: "en-US", decimals: 2 },
  { code: "EUR", symbol: "€", locale: "en-DE", decimals: 2 },
  { code: "GBP", symbol: "£", locale: "en-GB", decimals: 2 },
] as const;

// ── Default Categories ──────────────────────────
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Food & Dining", slug: "food-dining", icon: "🍽️", color: "#ef4444" },
  { name: "Transportation", slug: "transportation", icon: "🚗", color: "#f97316" },
  { name: "Shopping", slug: "shopping", icon: "🛍️", color: "#eab308" },
  { name: "Entertainment", slug: "entertainment", icon: "🎬", color: "#22c55e" },
  { name: "Bills & Utilities", slug: "bills-utilities", icon: "💡", color: "#3b82f6" },
  { name: "Healthcare", slug: "healthcare", icon: "🏥", color: "#8b5cf6" },
  { name: "Education", slug: "education", icon: "📚", color: "#ec4899" },
  { name: "Travel", slug: "travel", icon: "✈️", color: "#06b6d4" },
  { name: "Groceries", slug: "groceries", icon: "🛒", color: "#10b981" },
  { name: "Rent", slug: "rent", icon: "🏠", color: "#6366f1" },
  { name: "Insurance", slug: "insurance", icon: "🛡️", color: "#14b8a6" },
  { name: "Personal Care", slug: "personal-care", icon: "💇", color: "#f43f5e" },
  { name: "Gifts & Donations", slug: "gifts-donations", icon: "🎁", color: "#a855f7" },
  { name: "Subscriptions", slug: "subscriptions", icon: "📱", color: "#0ea5e9" },
  { name: "Other", slug: "other-expense", icon: "📌", color: "#64748b" },
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", slug: "salary", icon: "💰", color: "#22c55e" },
  { name: "Freelance", slug: "freelance", icon: "💻", color: "#3b82f6" },
  { name: "Investment Returns", slug: "investment-returns", icon: "📈", color: "#10b981" },
  { name: "Rental Income", slug: "rental-income", icon: "🏠", color: "#6366f1" },
  { name: "Interest", slug: "interest", icon: "🏦", color: "#14b8a6" },
  { name: "Dividends", slug: "dividends", icon: "💵", color: "#0ea5e9" },
  { name: "Bonus", slug: "bonus", icon: "🎉", color: "#f97316" },
  { name: "Refund", slug: "refund", icon: "↩️", color: "#8b5cf6" },
  { name: "Other", slug: "other-income", icon: "📌", color: "#64748b" },
] as const;

// ── Account Types ───────────────────────────────
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  savings: "Savings Account",
  current: "Current Account",
  credit_card: "Credit Card",
  wallet: "Wallet",
  cash: "Cash",
  loan: "Loan",
  other: "Other",
};

// ── Pagination ──────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// ── Date Formats ────────────────────────────────
export const DATE_FORMATS = {
  display: "dd MMM yyyy",
  displayShort: "dd MMM",
  displayLong: "dd MMMM yyyy",
  input: "yyyy-MM-dd",
  monthYear: "MMM yyyy",
  time: "HH:mm",
  dateTime: "dd MMM yyyy, HH:mm",
} as const;
