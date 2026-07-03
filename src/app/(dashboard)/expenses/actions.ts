"use server";

// ==============================================
// Expense Server Actions — Phase 2
// All mutations: auth-checked, Zod-validated,
// revalidatePath called for read-your-own-writes.
// ==============================================

import { revalidatePath } from "next/cache";
// createActionClient is the untyped variant — avoids 'never' inference on
// hand-authored Database types. Replace with the typed client once Supabase
// CLI auto-generates types from the live schema.
import { createActionClient } from "@/lib/supabase/action-client";
import {
  expenseSchema,
  recurringRuleSchema,
  expenseFiltersSchema,
  csvImportRowSchema,
  CSV_EXPORT_HEADERS,
  type ExpenseFormValues,
  type RecurringRuleFormValues,
} from "@/lib/validations/expense.schemas";
import type {
  ExpenseWithRelations,
  ExpenseFilters,
  PaginatedResult,
  RecurringRule,
  Category,
  Account,
  Tag,
} from "@/types/database";


// ── Auth helper ──────────────────────────────────

/** Throws if no authenticated session; returns user id. */
async function requireAuth() {
  const supabase = await createActionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

// ── Action result type ───────────────────────────

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ═══════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════

/**
 * Fetches a paginated, filtered list of expenses with relations.
 * Called by the ExpenseTable client component via TanStack Query.
 */
export async function getExpenses(
  rawFilters: ExpenseFilters = {}
): Promise<ActionResult<PaginatedResult<ExpenseWithRelations>>> {
  try {
    const { supabase, userId } = await requireAuth();

    // Parse and validate filters (applies defaults)
    const filters = expenseFiltersSchema.parse(rawFilters);
    const {
      search,
      categoryId,
      tagIds,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      isRecurring,
      isReimbursable,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = filters;

    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("expenses")
      .select(
        `
        *,
        category:categories(id, name, icon, color),
        account:accounts(id, name, type),
        tags:expense_tags(tag:tags(id, name, color)),
        attachments(id, name, size, mime_type, storage_path, created_at)
        `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .is("deleted_at", null);

    // ── Filters ──
    if (search)       query = query.ilike("title", `%${search}%`);
    if (categoryId)   query = query.eq("category_id", categoryId);
    if (startDate)    query = query.gte("date", startDate);
    if (endDate)      query = query.lte("date", endDate);
    if (minAmount !== undefined) query = query.gte("amount", minAmount);
    if (maxAmount !== undefined) query = query.lte("amount", maxAmount);
    if (isRecurring !== undefined)   query = query.eq("is_recurring", isRecurring);
    if (isReimbursable !== undefined) query = query.eq("is_reimbursable", isReimbursable);

    // Tag filter: get expense ids that have ALL requested tags, then filter
    if (tagIds && tagIds.length > 0) {
      const { data: taggedExpenses } = await supabase
        .from("expense_tags")
        .select("expense_id")
        .in("tag_id", tagIds);
      const ids = [...new Set((taggedExpenses ?? []).map((r) => r.expense_id))];
      query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }

    // ── Sort & paginate ──
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Flatten nested tag join: expense_tags[].tag → Tag[]
    const normalised = (data ?? []).map((row) => ({
      ...row,
      tags: (row.tags as unknown as { tag: { id: string; name: string; color: string | null } }[])
        .map((t) => t.tag),
    })) as ExpenseWithRelations[];

    const total = count ?? 0;
    return {
      ok: true,
      data: {
        data: normalised,
        count: total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Fetches a single expense with full relations.
 */
export async function getExpenseById(
  id: string
): Promise<ActionResult<ExpenseWithRelations>> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from("expenses")
      .select(
        `*,
        category:categories(id, name, icon, color),
        account:accounts(id, name, type),
        tags:expense_tags(tag:tags(id, name, color)),
        attachments(id, name, size, mime_type, storage_path, created_at)`
      )
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) throw error;

    const result = {
      ...data,
      tags: (data.tags as unknown as { tag: { id: string; name: string; color: string | null } }[])
        .map((t) => t.tag),
    } as ExpenseWithRelations;

    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════

/**
 * Creates a new expense.
 * Inserts the expense row then syncs tags in a second pass.
 */
export async function createExpense(
  raw: ExpenseFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();

    const parsed = expenseSchema.parse(raw);
    const { tag_ids, ...expenseFields } = parsed;

    const { data, error } = await supabase
      .from("expenses")
      .insert({ ...expenseFields, user_id: userId })
      .select("id")
      .single();

    if (error) throw error;

    // Sync tags
    if (tag_ids.length > 0) {
      const { error: tagError } = await supabase
        .from("expense_tags")
        .insert(tag_ids.map((tag_id) => ({ expense_id: data.id, tag_id })));
      if (tagError) throw tagError;
    }

    revalidatePath("/expenses");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════

/**
 * Updates an existing expense and syncs its tags.
 * Ownership is enforced by matching user_id in the WHERE clause.
 */
export async function updateExpense(
  id: string,
  raw: ExpenseFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const parsed = expenseSchema.parse(raw);
    const { tag_ids, ...expenseFields } = parsed;

    const { error } = await supabase
      .from("expenses")
      .update(expenseFields)
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    // Full tag replace: delete all → re-insert
    await supabase.from("expense_tags").delete().eq("expense_id", id);
    if (tag_ids.length > 0) {
      const { error: tagError } = await supabase
        .from("expense_tags")
        .insert(tag_ids.map((tag_id) => ({ expense_id: id, tag_id })));
      if (tagError) throw tagError;
    }

    revalidatePath("/expenses");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════

/**
 * Soft-deletes an expense (sets deleted_at).
 * Financial data is never hard-deleted.
 */
export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    revalidatePath("/expenses");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Soft-deletes multiple expenses at once.
 */
export async function bulkDeleteExpenses(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    revalidatePath("/expenses");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// RECURRING RULES
// ═══════════════════════════════════════════════

export async function createRecurringRule(
  raw: RecurringRuleFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = recurringRuleSchema.parse(raw);

    const { data, error } = await supabase
      .from("recurring_rules")
      .insert({
        ...parsed,
        user_id: userId,
        next_due_date: parsed.start_date,
      })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/expenses/recurring");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateRecurringRule(
  id: string,
  raw: RecurringRuleFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = recurringRuleSchema.parse(raw);

    const { error } = await supabase
      .from("recurring_rules")
      .update(parsed)
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/expenses/recurring");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteRecurringRule(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    // Detach generated expenses from this rule before deleting
    await supabase
      .from("expenses")
      .update({ recurring_rule_id: null })
      .eq("recurring_rule_id", id)
      .eq("user_id", userId);

    const { error } = await supabase
      .from("recurring_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/expenses/recurring");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Generates due recurring expenses for the authenticated user.
 * Call this from a scheduled Edge Function or the UI "Generate Now" button.
 * Returns the number of expenses created.
 */
export async function processRecurringExpenses(): Promise<ActionResult<{ created: number }>> {
  try {
    const { supabase, userId } = await requireAuth();
    const today = new Date().toISOString().split("T")[0];

    // Fetch all active rules where next_due_date <= today
    const { data: dueRules, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .lte("next_due_date", today);

    if (error) throw error;

    let created = 0;
    for (const rule of dueRules as RecurringRule[]) {
      // Insert expense from rule
      const { error: insertError } = await supabase.from("expenses").insert({
        user_id: userId,
        title: rule.title,
        amount: rule.amount,
        currency: rule.currency,
        date: rule.next_due_date,
        category_id: rule.category_id,
        account_id: rule.account_id,
        notes: rule.notes,
        merchant: rule.merchant,
        recurring_rule_id: rule.id,
        is_recurring: true,
      });

      if (insertError) continue; // skip on error, log in production

      // Advance the rule's next_due_date via the DB function
      await supabase.rpc("advance_recurring_rule", { rule_id: rule.id });
      created++;
    }

    revalidatePath("/expenses");
    return { ok: true, data: { created } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════

/**
 * Exports all (filtered) expenses as a CSV string.
 * The client triggers a browser download from this string.
 */
export async function exportExpensesCSV(
  rawFilters: ExpenseFilters = {}
): Promise<ActionResult<string>> {
  try {
    // Fetch all pages (no pageSize limit for export)
    const result = await getExpenses({ ...rawFilters, pageSize: 10_000, page: 1 });
    if (!result.ok) throw new Error(result.error);

    const rows = result.data.data;

    const escape = (val: string) =>
      val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;

    const header = CSV_EXPORT_HEADERS.join(",");

    const lines = rows.map((e) => {
      const cols = [
        e.date,
        escape(e.title),
        e.amount.toString(),
        e.currency,
        escape(e.category?.name ?? ""),
        escape(e.account?.name ?? ""),
        escape(e.merchant ?? ""),
        escape(e.tags.map((t) => t.name).join(",")),
        escape(e.notes ?? ""),
        e.is_recurring.toString(),
        e.is_reimbursable.toString(),
      ];
      return cols.join(",");
    });

    return { ok: true, data: [header, ...lines].join("\n") };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// CSV IMPORT
// ═══════════════════════════════════════════════

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

/**
 * Imports an array of raw CSV row objects (parsed client-side with PapaParse).
 * Validates each row with csvImportRowSchema.
 * Creates missing categories/tags on the fly.
 * Skips duplicates (same title + amount + date).
 */
export async function importExpensesCSV(
  rawRows: Record<string, string>[]
): Promise<ActionResult<ImportResult>> {
  try {
    const { supabase, userId } = await requireAuth();

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    // Cache lookups to avoid N+1 queries
    const categoryCache = new Map<string, string>(); // name → id
    const tagCache = new Map<string, string>();       // name → id

    // Preload existing categories and tags
    const { data: existingCats } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)
      .eq("type", "expense");
    for (const c of existingCats ?? []) categoryCache.set(c.name.toLowerCase(), c.id);

    const { data: existingTags } = await supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", userId);
    for (const t of existingTags ?? []) tagCache.set(t.name.toLowerCase(), t.id);

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2; // 1-indexed, row 1 = header
      const parseResult = csvImportRowSchema.safeParse(rawRows[i]);

      if (!parseResult.success) {
        result.errors.push({
          row: rowNum,
          message: parseResult.error.issues[0]?.message ?? "Invalid row",
        });
        result.skipped++;
        continue;
      }

      const row = parseResult.data;

      // Duplicate check
      const { count } = await supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("title", row.Title)
        .eq("amount", row.Amount)
        .eq("date", row.Date)
        .is("deleted_at", null);

      if ((count ?? 0) > 0) {
        result.skipped++;
        continue;
      }

      // Resolve or create category
      let categoryId: string | null = null;
      if (row.Category) {
        const key = row.Category.toLowerCase();
        if (categoryCache.has(key)) {
          categoryId = categoryCache.get(key)!;
        } else {
          const slug = key.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          const { data: newCat } = await supabase
            .from("categories")
            .insert({ user_id: userId, name: row.Category, slug, type: "expense" })
            .select("id")
            .single();
          if (newCat) {
            categoryId = newCat.id;
            categoryCache.set(key, newCat.id);
          }
        }
      }

      // Insert expense
      const { data: newExpense, error: insertErr } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          title: row.Title,
          amount: row.Amount,
          date: row.Date,
          currency: row.Currency ?? "INR",
          category_id: categoryId,
          merchant: null,
          notes: row.Notes ?? null,
          is_recurring: row.Recurring ?? false,
        })
        .select("id")
        .single();

      if (insertErr || !newExpense) {
        result.errors.push({ row: rowNum, message: insertErr?.message ?? "Insert failed" });
        result.skipped++;
        continue;
      }

      // Resolve or create tags and link them
      if (row.Tags && row.Tags.length > 0) {
        const tagIds: string[] = [];
        for (const tagName of row.Tags) {
          const key = tagName.toLowerCase();
          if (tagCache.has(key)) {
            tagIds.push(tagCache.get(key)!);
          } else {
            const { data: newTag } = await supabase
              .from("tags")
              .insert({ user_id: userId, name: tagName })
              .select("id")
              .single();
            if (newTag) {
              tagIds.push(newTag.id);
              tagCache.set(key, newTag.id);
            }
          }
        }
        if (tagIds.length > 0) {
          await supabase
            .from("expense_tags")
            .insert(tagIds.map((tag_id) => ({ expense_id: newExpense.id, tag_id })));
        }
      }

      result.imported++;
    }

    revalidatePath("/expenses");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// ATTACHMENTS
// ═══════════════════════════════════════════════

/**
 * Records an attachment row after the file has been uploaded
 * to Supabase Storage by the client.
 */
export async function createAttachment(payload: {
  expense_id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();

    // Verify the expense belongs to this user
    const { count } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("id", payload.expense_id)
      .eq("user_id", userId);

    if (!count) throw new Error("Expense not found");

    const { data, error } = await supabase
      .from("attachments")
      .insert({ ...payload, user_id: userId })
      .select("id")
      .single();

    if (error) throw error;

    revalidatePath("/expenses");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Deletes an attachment record AND removes the file from Supabase Storage.
 */
export async function deleteAttachment(
  id: string
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: att, error: fetchErr } = await supabase
      .from("attachments")
      .select("storage_path")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !att) throw new Error("Attachment not found");

    // Remove from storage
    await supabase.storage.from("attachments").remove([att.storage_path]);

    const { error } = await supabase
      .from("attachments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/expenses");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// STATS (used by ExpenseStatsBar)
// ═══════════════════════════════════════════════

export interface ExpenseStats {
  totalThisMonth: number;
  totalLastMonth: number;
  changePercent: number;
  topCategories: { name: string; color: string | null; total: number; percent: number }[];
  dailyTotals: { date: string; total: number }[];
}

export async function getExpenseStats(
  year?: number,
  month?: number // 1-indexed
): Promise<ActionResult<ExpenseStats>> {
  try {
    const { supabase, userId } = await requireAuth();

    const now = new Date();
    const activeYear = year ?? now.getFullYear();
    const activeMonth = month ?? (now.getMonth() + 1);

    const pad = (n: number) => String(n).padStart(2, "0");
    const thisStart = `${activeYear}-${pad(activeMonth)}-01`;
    const thisEnd   = `${activeYear}-${pad(activeMonth)}-31`; // DB clamps to month end

    const prevMonth = activeMonth === 1 ? 12 : activeMonth - 1;
    const prevYear  = activeMonth === 1 ? activeYear - 1 : activeYear;
    const prevStart = `${prevYear}-${pad(prevMonth)}-01`;
    const prevEnd   = `${prevYear}-${pad(prevMonth)}-31`;

    const [thisRes, prevRes, catRes, dailyRes] = await Promise.all([
      supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", thisStart)
        .lte("date", thisEnd),
      supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", prevStart)
        .lte("date", prevEnd),
      supabase
        .from("expenses")
        .select("amount, category:categories(name, color)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", thisStart)
        .lte("date", thisEnd),
      supabase
        .from("expenses")
        .select("date, amount")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", thisStart)
        .lte("date", thisEnd)
        .order("date"),
    ]);

    const totalThisMonth = (thisRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const totalLastMonth = (prevRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
    const changePercent  =
      totalLastMonth === 0
        ? 0
        : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;

    // Aggregate by category
    const catMap = new Map<string, { name: string; color: string | null; total: number }>();
    for (const row of catRes.data ?? []) {
      const cat = (row.category as unknown) as { name: string; color: string | null } | null;
      const key = cat?.name ?? "Uncategorised";
      const existing = catMap.get(key) ?? { name: key, color: cat?.color ?? null, total: 0 };
      existing.total += Number(row.amount);
      catMap.set(key, existing);
    }
    const topCategories = [...catMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        percent: totalThisMonth > 0 ? (c.total / totalThisMonth) * 100 : 0,
      }));

    // Aggregate daily totals
    const dayMap = new Map<string, number>();
    for (const row of dailyRes.data ?? []) {
      dayMap.set(row.date, (dayMap.get(row.date) ?? 0) + Number(row.amount));
    }
    const dailyTotals = [...dayMap.entries()].map(([date, total]) => ({ date, total }));

    return {
      ok: true,
      data: { totalThisMonth, totalLastMonth, changePercent, topCategories, dailyTotals },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// OTHER DATA LOOKUPS (Categories, Accounts, Tags)
// ═══════════════════════════════════════════════

export async function getCategories(): Promise<ActionResult<Category[]>> {
  try {
    const { supabase, userId } = await requireAuth();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, data: data as Category[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getAccounts(): Promise<ActionResult<Account[]>> {
  try {
    const { supabase, userId } = await requireAuth();
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, data: data as Account[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getTags(): Promise<ActionResult<Tag[]>> {
  try {
    const { supabase, userId } = await requireAuth();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) throw error;
    return { ok: true, data: data as Tag[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createTag(name: string, color?: string): Promise<ActionResult<Tag>> {
  try {
    const { supabase, userId } = await requireAuth();
    const normalized = name.trim();
    
    // Check if tag already exists (case-insensitive name check)
    const { data: existing } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", normalized)
      .maybeSingle();

    if (existing) {
      return { ok: true, data: existing as Tag };
    }

    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, name: normalized, color })
      .select("*")
      .single();

    if (error) throw error;
    return { ok: true, data: data as Tag };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createCategory(
  name: string,
  type: "expense" | "income" = "expense",
  icon?: string,
  color?: string
): Promise<ActionResult<Category>> {
  try {
    const { supabase, userId } = await requireAuth();
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if category already exists for this type & slug
    const { data: existing } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .eq("slug", slug)
      .eq("type", type)
      .maybeSingle();

    if (existing) {
      return { ok: true, data: existing as Category };
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name,
        slug,
        type,
        icon: icon || "📁",
        color: color || "#6b7280",
      })
      .select("*")
      .single();

    if (error) throw error;
    return { ok: true, data: data as Category };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getRecurringRules(): Promise<ActionResult<RecurringRule[]>> {
  try {
    const { supabase, userId } = await requireAuth();
    const { data, error } = await supabase
      .from("recurring_rules")
      .select(`
        *,
        category:categories(id, name, icon, color),
        account:accounts(id, name, type)
      `)
      .eq("user_id", userId)
      .order("next_due_date", { ascending: true });

    if (error) throw error;
    return { ok: true, data: data as any };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function toggleRecurringRuleActive(id: string, is_active: boolean): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const { error } = await supabase
      .from("recurring_rules")
      .update({ is_active })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;
    revalidatePath("/expenses/recurring");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
