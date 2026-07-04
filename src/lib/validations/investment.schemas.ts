import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const nonNegativeAmount = z.coerce
  .number()
  .min(0, "Amount must be zero or positive")
  .max(999_999_999_99, "Amount is too large");

export const investmentSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100)
    .trim(),
  
  type: z.enum([
    "mutual_fund",
    "stock",
    "crypto",
    "gold",
    "fixed_deposit",
    "ppf",
    "nps",
    "real_estate",
    "other",
  ], {
    message: "Asset type is required",
  }),
  
  institution: z
    .string()
    .min(1, "Institution name is required")
    .max(100)
    .trim(),
  
  invested_amount: nonNegativeAmount.default(0),
  current_value: nonNegativeAmount.default(0),
  
  quantity: z.coerce
    .number()
    .positive("Quantity must be positive")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
    
  avg_buy_price: z.coerce
    .number()
    .positive("Average buy price must be positive")
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
    
  currency: z.string().default("INR"),
  
  start_date: isoDate.default(() => new Date().toISOString().split("T")[0]),
  
  notes: z.string().max(2000).trim().nullable().optional(),
});

export const valuationSchema = z.object({
  valuation_date: isoDate.default(() => new Date().toISOString().split("T")[0]),
  value: nonNegativeAmount,
  invested_amount: nonNegativeAmount,
});

export const investmentFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).default(20),
  sortBy: z
    .enum(["name", "invested_amount", "current_value", "start_date", "created_at"])
    .default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type InvestmentFormValues = z.infer<typeof investmentSchema>;
export type ValuationFormValues = z.infer<typeof valuationSchema>;
export type InvestmentFiltersFormValues = z.infer<typeof investmentFiltersSchema>;
