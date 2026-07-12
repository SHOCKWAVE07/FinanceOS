// ==============================================
// Salary & Appraisal Validation Schemas — Phase 3
// Used by React Hook Form + Server Actions
// ==============================================

import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const nonNegativeAmount = z.coerce
  .number()
  .min(0, "Amount must be zero or positive")
  .max(999_999_999_99, "Amount is too large");

const positiveAmount = z.coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(999_999_999_99, "Amount is too large");

// ── Salary Record Schema ─────────────────────────

export const salaryRecordSchema = z
  .object({
    month: z
      .string()
      .min(1, "Month is required")
      .transform((val) => {
        // Ensure month format is YYYY-MM-01
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          return val.substring(0, 8) + "01";
        }
        if (/^\d{4}-\d{2}$/.test(val)) {
          return val + "-01";
        }
        return val;
      })
      .pipe(z.string().regex(/^\d{4}-\d{2}-01$/, "Invalid month format")),

    company: z
      .string()
      .min(1, "Company name is required")
      .max(100)
      .trim(),

    designation: z
      .string()
      .min(1, "Designation is required")
      .max(100)
      .trim(),

    // Earnings breakdown
    basic: nonNegativeAmount.default(0),
    hra: nonNegativeAmount.default(0),
    special_allowance: nonNegativeAmount.default(0),
    lta: nonNegativeAmount.default(0),

    // Deductions breakdown
    pf_deduction: nonNegativeAmount.default(0),
    nps_deduction: nonNegativeAmount.default(0),
    tax_deduction: nonNegativeAmount.default(0),
    other_deductions: nonNegativeAmount.default(0),

    notes: z.string().max(2000).trim().nullable().optional(),
    
    // Optional flag to create an income transaction in the ledger automatically
    create_income_transaction: z.boolean().default(true),
    account_id: z.string().uuid("Please select a bank account to credit").nullable().optional(),
  });

export type SalaryRecordFormValues = z.infer<typeof salaryRecordSchema>;

// ── Salary Appraisal Schema ──────────────────────

export const salaryAppraisalSchema = z.object({
  company: z
    .string()
    .min(1, "Company name is required")
    .max(100)
    .trim(),

  designation: z
    .string()
    .min(1, "Designation is required")
    .max(100)
    .trim(),

  effective_date: isoDate,

  previous_gross_salary: positiveAmount,

  new_gross_salary: positiveAmount,

  notes: z.string().max(2000).trim().nullable().optional(),
});

export type SalaryAppraisalFormValues = z.infer<typeof salaryAppraisalSchema>;
