// ==============================================
// Zod Validation Schemas
// ==============================================

import { z } from "zod";

// ── Auth Schemas ────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Profile Schemas ─────────────────────────────
export const profileSchema = z.object({
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  currency: z.string().min(3).max(3),
  locale: z.string().min(2),
  timezone: z.string().min(1),
  theme: z.enum(["light", "dark", "system"]),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// ── Category Schemas ────────────────────────────
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Name must be less than 50 characters"),
  type: z.enum(["expense", "income", "both"]),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// ── Account Schemas ─────────────────────────────
export const accountSchema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Name must be less than 100 characters"),
  type: z.enum([
    "savings",
    "current",
    "credit_card",
    "wallet",
    "cash",
    "loan",
    "other",
  ]),
  institution: z.string().max(100).nullable().optional(),
  balance: z.coerce.number(),
  currency: z.string().min(3).max(3).default("INR"),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
