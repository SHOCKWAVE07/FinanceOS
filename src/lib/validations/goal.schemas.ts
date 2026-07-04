import { z } from "zod";

export const goalCategorySchema = z.enum([
  "retirement",
  "house",
  "car",
  "education",
  "vacation",
  "emergency_fund",
  "other",
]);

export const goalStatusSchema = z.enum([
  "active",
  "completed",
  "paused",
  "abandoned",
]);

export const goalPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const linkedInvestmentSchema = z.object({
  investmentId: z.string().uuid(),
  allocatedShare: z.number().min(0).max(100),
});

export const goalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  description: z.string().optional().nullable(),
  target_amount: z.number().positive("Target amount must be greater than 0"),
  target_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid target date",
  }),
  category: goalCategorySchema,
  status: goalStatusSchema.default("active"),
  priority: goalPrioritySchema.default("medium"),
  manual_savings: z.number().min(0, "Manual savings cannot be negative").default(0),
  linkedInvestments: z.array(linkedInvestmentSchema).default([]),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export const milestoneFormSchema = z.object({
  name: z.string().min(1, "Milestone name is required"),
  target_amount: z.number().min(0).optional().nullable(),
  target_date: z.string().optional().nullable().refine((val) => {
    if (!val) return true;
    return !isNaN(Date.parse(val));
  }, {
    message: "Invalid target date",
  }),
  is_completed: z.boolean().default(false),
});

export type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;
