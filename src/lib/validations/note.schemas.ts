import { z } from "zod";

export const noteLinkTypeSchema = z.enum(["expense", "income", "investment", "goal"]);

export const noteLinkSchema = z.object({
  link_type: noteLinkTypeSchema,
  link_id: z.string().uuid("Invalid link reference ID"),
});

export const noteFormSchema = z.object({
  title: z.string().min(1, "Note title is required").max(200, "Title is too long"),
  content: z.string().default(""), // Markdown text content
  tag_ids: z.array(z.string().uuid()).default([]),
  links: z.array(noteLinkSchema).default([]),
});

export type NoteFormValues = z.infer<typeof noteFormSchema>;

export const noteFiltersSchema = z.object({
  search: z.string().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  linkType: noteLinkTypeSchema.optional(),
  linkId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(12),
  sortBy: z.enum(["created_at", "updated_at", "title"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type NoteFilters = z.infer<typeof noteFiltersSchema>;

// Timeline Filters
export const timelineFiltersSchema = z.object({
  search: z.string().optional(),
  eventTypes: z.array(
    z.enum([
      "expense",
      "income",
      "salary",
      "investment_purchase",
      "note",
      "milestone_achieved",
      "milestone_pending",
    ])
  ).optional(),
  startDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid start date",
  }),
  endDate: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid end date",
  }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(25),
  sortBy: z.enum(["event_date", "title", "amount"]).default("event_date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type TimelineFilters = z.infer<typeof timelineFiltersSchema>;
