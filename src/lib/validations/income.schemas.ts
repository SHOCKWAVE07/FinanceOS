// ==============================================
// Income Validation Schemas — Phase 3
// Used by React Hook Form + Server Actions
// ==============================================

import { z } from "zod";

// ── Shared helpers ───────────────────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const positiveAmount = z.coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(999_999_999_99, "Amount is too large");

// ── Income Schema ───────────────────────────────

export const incomeSchema = z.object({
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

  source: z
    .string()
    .max(100, "Source name must be under 100 characters")
    .trim()
    .nullable()
    .optional(),

  notes: z
    .string()
    .max(2000, "Notes must be under 2000 characters")
    .trim()
    .nullable()
    .optional(),

  tag_ids: z.array(z.string().uuid()).default([]),

  is_recurring: z.boolean().default(false),
});

export type IncomeFormValues = z.infer<typeof incomeSchema>;

// ── Income Filters Schema ───────────────────────

export const incomeFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  isRecurring: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["date", "amount", "title", "created_at"])
    .default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type IncomeFiltersFormValues = z.infer<typeof incomeFiltersSchema>;

// ── CSV Import Row Schema ────────────────────────

function parseFlexibleDate(val: unknown): string | undefined {
  if (typeof val !== "string" || !val.trim()) return undefined;
  const raw = val.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

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

export const csvIncomeImportRowSchema = z.object({
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

  Source: z.string().max(100).optional(),

  Recurring: z
    .string()
    .optional()
    .transform((val) => val?.toLowerCase() === "true"),
});

export type CSVIncomeImportRow = z.infer<typeof csvIncomeImportRowSchema>;

export const CSV_INCOME_EXPORT_HEADERS = [
  "Date",
  "Title",
  "Amount",
  "Currency",
  "Category",
  "Tags",
  "Notes",
  "Source",
  "Recurring",
] as const;
