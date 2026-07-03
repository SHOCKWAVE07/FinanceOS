// ==============================================
// Expense Validation Schemas — Phase 2
// Used by React Hook Form + Server Actions
// ==============================================

import { z } from "zod";

// ── Shared helpers ───────────────────────────────

/** ISO date string YYYY-MM-DD */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const positiveAmount = z.coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(999_999_999_99, "Amount is too large");

// ── Expense Schema ───────────────────────────────

export const expenseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters")
    .trim(),

  amount: positiveAmount,

  date: isoDate,

  currency: z
    .string()
    .length(3, "Currency must be a 3-letter code")
    .default("INR"),

  category_id: z.string().uuid("Invalid category").nullable().optional(),

  account_id: z.string().uuid("Invalid account").nullable().optional(),

  merchant: z
    .string()
    .max(100, "Merchant name must be under 100 characters")
    .trim()
    .nullable()
    .optional(),

  notes: z
    .string()
    .max(2000, "Notes must be under 2000 characters")
    .nullable()
    .optional(),

  tag_ids: z.array(z.string().uuid()).default([]),

  is_reimbursable: z.boolean().default(false),

  is_reimbursed: z.boolean().default(false),

  // When true, the recurring sub-form fields are required
  is_recurring: z.boolean().default(false),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// ── Recurring Rule Schema ────────────────────────

export const RECURRING_FREQUENCY_OPTIONS = [
  { value: "daily",     label: "Daily" },
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Every 2 Weeks" },
  { value: "monthly",   label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly",    label: "Yearly" },
] as const;

const frequencyEnum = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const recurringRuleSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200)
      .trim(),

    amount: positiveAmount,

    currency: z.string().length(3).default("INR"),

    category_id: z.string().uuid().nullable().optional(),

    account_id: z.string().uuid().nullable().optional(),

    merchant: z.string().max(100).trim().nullable().optional(),

    notes: z.string().max(2000).nullable().optional(),

    frequency: frequencyEnum,

    interval_count: z.coerce
      .number()
      .int("Interval must be a whole number")
      .min(1, "Interval must be at least 1")
      .max(365, "Interval is too large")
      .default(1),

    start_date: isoDate,

    end_date: isoDate.nullable().optional(),

    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.end_date && data.start_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    { message: "End date must be on or after start date", path: ["end_date"] }
  );

export type RecurringRuleFormValues = z.infer<typeof recurringRuleSchema>;

// ── Expense Filters Schema ───────────────────────

export const expenseFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  isRecurring: z.boolean().optional(),
  isReimbursable: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["date", "amount", "title", "created_at"])
    .default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ExpenseFiltersFormValues = z.infer<typeof expenseFiltersSchema>;

// ── CSV Import Row Schema ────────────────────────
// Lenient — accepts multiple date formats, coerces strings

/** Flexible date parsing for CSV rows */
function parseFlexibleDate(val: unknown): string | undefined {
  if (typeof val !== "string" || !val.trim()) return undefined;
  const raw = val.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // DD MMM YYYY (e.g. "03 Jul 2026")
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const textDate = raw.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{4})$/);
  if (textDate) {
    const month = monthMap[textDate[2].toLowerCase()];
    if (month) return `${textDate[3]}-${month}-${textDate[1].padStart(2, "0")}`;
  }

  return undefined;
}

export const csvImportRowSchema = z.object({
  Date: z
    .string()
    .transform(parseFlexibleDate)
    .pipe(z.string("Date is required").regex(/^\d{4}-\d{2}-\d{2}$/)),

  Title: z
    .string()
    .min(1, "Title is required")
    .max(200)
    .trim(),

  Amount: z.coerce
    .number()
    .positive("Amount must be positive"),

  Currency: z.string().length(3).default("INR").optional(),

  Category: z.string().max(50).trim().optional(),

  Tags: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val.split(",").map((t) => t.trim()).filter(Boolean)
        : []
    ),

  Notes: z.string().max(2000).optional(),

  Recurring: z
    .string()
    .optional()
    .transform((val) => val?.toLowerCase() === "true"),
});

export type CSVImportRow = z.infer<typeof csvImportRowSchema>;

// ── CSV Export Column Definition ─────────────────

export const CSV_EXPORT_HEADERS = [
  "Date",
  "Title",
  "Amount",
  "Currency",
  "Category",
  "Tags",
  "Notes",
  "Recurring",
  "Reimbursable",
] as const;
