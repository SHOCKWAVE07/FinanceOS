"use server";

// ==============================================
// Income Server Actions — Phase 3
// Auth-checked, Zod-validated, and revalidated.
// ==============================================

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/action-client";
import {
  incomeSchema,
  incomeFiltersSchema,
  csvIncomeImportRowSchema,
  CSV_INCOME_EXPORT_HEADERS,
  type IncomeFormValues,
} from "@/lib/validations/income.schemas";
import type {
  IncomeWithRelations,
  IncomeFilters,
  PaginatedResult,
  Category,
  Account,
  Tag,
} from "@/types/database";

// ── Auth helper ──────────────────────────────────

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

export async function getIncomes(
  rawFilters: IncomeFilters = {}
): Promise<ActionResult<PaginatedResult<IncomeWithRelations>>> {
  try {
    const { supabase, userId } = await requireAuth();

    const filters = incomeFiltersSchema.parse(rawFilters);
    const {
      search,
      categoryId,
      tagIds,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      isRecurring,
      page,
      pageSize,
      sortBy,
      sortOrder,
    } = filters;

    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("incomes")
      .select(
        `
        *,
        category:categories(id, name, icon, color),
        account:accounts(id, name, type),
        tags:income_tags(tag:tags(id, name, color))
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

    // Tag filter
    if (tagIds && tagIds.length > 0) {
      const { data: taggedIncomes } = await supabase
        .from("income_tags")
        .select("income_id")
        .in("tag_id", tagIds);
      const ids = [...new Set((taggedIncomes ?? []).map((r) => r.income_id))];
      query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    }

    // ── Sort & paginate ──
    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Flatten nested tag join
    const normalised = (data ?? []).map((row) => ({
      ...row,
      tags: (row.tags as unknown as { tag: { id: string; name: string; color: string | null } }[])
        .map((t) => t.tag),
    })) as IncomeWithRelations[];

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

export async function getIncomeById(
  id: string
): Promise<ActionResult<IncomeWithRelations>> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await supabase
      .from("incomes")
      .select(
        `*,
        category:categories(id, name, icon, color),
        account:accounts(id, name, type),
        tags:income_tags(tag:tags(id, name, color))`
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
    } as IncomeWithRelations;

    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════

export async function createIncome(
  raw: IncomeFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();

    const parsed = incomeSchema.parse(raw);
    const { tag_ids, ...incomeFields } = parsed;

    const { data, error } = await supabase
      .from("incomes")
      .insert({ ...incomeFields, user_id: userId })
      .select("id")
      .single();

    if (error) throw error;

    // Sync tags
    if (tag_ids.length > 0) {
      const { error: tagError } = await supabase
        .from("income_tags")
        .insert(tag_ids.map((tag_id) => ({ income_id: data.id, tag_id })));
      if (tagError) throw tagError;
    }

    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════

export async function updateIncome(
  id: string,
  raw: IncomeFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const parsed = incomeSchema.parse(raw);
    const { tag_ids, ...incomeFields } = parsed;

    const { error } = await supabase
      .from("incomes")
      .update(incomeFields)
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    // Full tag replace: delete all → re-insert
    await supabase.from("income_tags").delete().eq("income_id", id);
    if (tag_ids.length > 0) {
      const { error: tagError } = await supabase
        .from("income_tags")
        .insert(tag_ids.map((tag_id) => ({ income_id: id, tag_id })));
      if (tagError) throw tagError;
    }

    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════

export async function deleteIncome(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { error } = await supabase
      .from("incomes")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function bulkDeleteIncomes(ids: string[]): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    const { error } = await supabase
      .from("incomes")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids)
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════

export async function exportIncomesCSV(
  rawFilters: IncomeFilters = {}
): Promise<ActionResult<string>> {
  try {
    const result = await getIncomes({ ...rawFilters, pageSize: 10_000, page: 1 });
    if (!result.ok) throw new Error(result.error);

    const rows = result.data.data;

    const escape = (val: string) =>
      val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;

    const header = CSV_INCOME_EXPORT_HEADERS.join(",");

    const lines = rows.map((e) => {
      const cols = [
        e.date,
        escape(e.title),
        e.amount.toString(),
        e.currency,
        escape(e.category?.name ?? ""),
        escape(e.tags.map((t) => t.name).join(",")),
        escape(e.notes ?? ""),
        escape(e.source ?? ""),
        e.is_recurring.toString(),
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

export async function importIncomesCSV(
  rawRows: Record<string, string>[]
): Promise<ActionResult<ImportResult>> {
  try {
    const { supabase, userId } = await requireAuth();

    const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

    const categoryCache = new Map<string, string>();
    const tagCache = new Map<string, string>();

    const { data: existingCats } = await supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", userId)
      .eq("type", "income");
    for (const c of existingCats ?? []) categoryCache.set(c.name.toLowerCase(), c.id);

    const { data: existingTags } = await supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", userId);
    for (const t of existingTags ?? []) tagCache.set(t.name.toLowerCase(), t.id);

    for (let i = 0; i < rawRows.length; i++) {
      const rowNum = i + 2;
      const parseResult = csvIncomeImportRowSchema.safeParse(rawRows[i]);

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
        .from("incomes")
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
            .insert({ user_id: userId, name: row.Category, slug, type: "income" })
            .select("id")
            .single();
          if (newCat) {
            categoryId = newCat.id;
            categoryCache.set(key, newCat.id);
          }
        }
      }

      // Insert income
      const { data: newIncome, error: insertErr } = await supabase
        .from("incomes")
        .insert({
          user_id: userId,
          title: row.Title,
          amount: row.Amount,
          date: row.Date,
          currency: row.Currency ?? "INR",
          category_id: categoryId,
          source: row.Source ?? null,
          notes: row.Notes ?? null,
          is_recurring: row.Recurring ?? false,
        })
        .select("id")
        .single();

      if (insertErr || !newIncome) {
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
            .from("income_tags")
            .insert(tagIds.map((tag_id) => ({ income_id: newIncome.id, tag_id })));
        }
      }

      result.imported++;
    }

    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════

export interface IncomeStats {
  totalThisMonth: number;
  totalLastMonth: number;
  changePercent: number;
  topCategories: { name: string; color: string | null; total: number; percent: number }[];
  dailyTotals: { date: string; total: number }[];
}

export async function getIncomeStats(
  year?: number,
  month?: number
): Promise<ActionResult<IncomeStats>> {
  try {
    const { supabase, userId } = await requireAuth();

    const now = new Date();
    const activeYear = year ?? now.getFullYear();
    const activeMonth = month ?? (now.getMonth() + 1);

    const pad = (n: number) => String(n).padStart(2, "0");
    const thisStart = `${activeYear}-${pad(activeMonth)}-01`;
    const thisEnd   = `${activeYear}-${pad(activeMonth)}-31`;

    const prevMonth = activeMonth === 1 ? 12 : activeMonth - 1;
    const prevYear  = activeMonth === 1 ? activeYear - 1 : activeYear;
    const prevStart = `${prevYear}-${pad(prevMonth)}-01`;
    const prevEnd   = `${prevYear}-${pad(prevMonth)}-31`;

    const [thisRes, prevRes, catRes, dailyRes] = await Promise.all([
      supabase
        .from("incomes")
        .select("amount")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", thisStart)
        .lte("date", thisEnd),
      supabase
        .from("incomes")
        .select("amount")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", prevStart)
        .lte("date", prevEnd),
      supabase
        .from("incomes")
        .select("amount, category:categories(name, color)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .gte("date", thisStart)
        .lte("date", thisEnd),
      supabase
        .from("incomes")
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

    // Group categories
    const catMap = new Map<string, { color: string | null; total: number }>();
    for (const r of (catRes.data ?? []) as any[]) {
      const cat = Array.isArray(r.category) ? r.category[0] : r.category;
      const name = cat?.name ?? "Uncategorised";
      const color = cat?.color ?? null;
      const current = catMap.get(name) ?? { color, total: 0 };
      catMap.set(name, { color, total: current.total + Number(r.amount) });
    }
    const topCategories = Array.from(catMap.entries())
      .map(([name, { color, total }]) => ({
        name,
        color,
        total,
        percent: totalThisMonth > 0 ? (total / totalThisMonth) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Group daily
    const dailyMap = new Map<string, number>();
    for (const r of dailyRes.data ?? []) {
      const d = r.date;
      dailyMap.set(d, (dailyMap.get(d) ?? 0) + Number(r.amount));
    }
    const dailyTotals = Array.from(dailyMap.entries()).map(([date, total]) => ({
      date,
      total,
    }));

    return {
      ok: true,
      data: {
        totalThisMonth,
        totalLastMonth,
        changePercent,
        topCategories,
        dailyTotals,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Shared Lookups (categories, tags, accounts) ───

export async function getIncomeCategories(): Promise<ActionResult<Category[]>> {
  try {
    const { supabase, userId } = await requireAuth();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "income")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return { ok: true, data: data as Category[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
