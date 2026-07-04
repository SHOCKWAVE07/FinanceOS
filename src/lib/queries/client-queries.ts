// ==============================================
// Client-Side Data Queries
// Used in client components to avoid router-refresh loops
// ==============================================

import { createClient } from "@/lib/supabase/client";
import { expenseFiltersSchema } from "@/lib/validations/expense.schemas";
import { incomeFiltersSchema } from "@/lib/validations/income.schemas";
import { noteFiltersSchema, timelineFiltersSchema } from "@/lib/validations/note.schemas";
import type { ExpenseWithRelations, IncomeWithRelations, Note, TimelineEvent, NoteWithRelations } from "@/types/database";

export async function clientGetExpenses(rawFilters: any = {}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (search) query = query.ilike("title", `%${search}%`);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);
  if (minAmount !== undefined) query = query.gte("amount", minAmount);
  if (maxAmount !== undefined) query = query.lte("amount", maxAmount);
  if (isRecurring !== undefined) query = query.eq("is_recurring", isRecurring);
  if (isReimbursable !== undefined) query = query.eq("is_reimbursable", isReimbursable);

  if (tagIds && tagIds.length > 0) {
    const { data: taggedExpenses } = await supabase
      .from("expense_tags")
      .select("expense_id")
      .in("tag_id", tagIds);
    const ids = [...new Set((taggedExpenses ?? []).map((r: any) => r.expense_id))];
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const normalised = (data ?? []).map((row: any) => ({
    ...row,
    tags: (row.tags as unknown as { tag: { id: string; name: string; color: string | null } }[])
      .map((t: any) => t.tag),
  })) as ExpenseWithRelations[];

  const total = count ?? 0;
  return {
    data: normalised,
    count: total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

export async function clientGetExpenseStats(year?: number, month?: number) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", thisStart)
      .lte("date", thisEnd),
    supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", prevStart)
      .lte("date", prevEnd),
    supabase
      .from("expenses")
      .select("amount, category:categories(name, color)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", thisStart)
      .lte("date", thisEnd),
    supabase
      .from("expenses")
      .select("date, amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", thisStart)
      .lte("date", thisEnd)
      .order("date"),
  ]);

  if (thisRes.error) throw thisRes.error;
  if (prevRes.error) throw prevRes.error;
  if (catRes.error) throw catRes.error;
  if (dailyRes.error) throw dailyRes.error;

  const totalThisMonth = (thisRes.data ?? []).reduce((s: any, r: any) => s + Number(r.amount), 0);
  const totalLastMonth = (prevRes.data ?? []).reduce((s: any, r: any) => s + Number(r.amount), 0);
  const changePercent  =
    totalLastMonth === 0
      ? 0
      : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;

  const catMap = new Map<string, { name: string; color: string | null; total: number }>();
  for (const row of (catRes.data ?? []) as any[]) {
    const cat = (row.category as unknown) as { name: string; color: string | null } | null;
    const key = cat?.name ?? "Uncategorised";
    const existing = catMap.get(key) ?? { name: key, color: cat?.color ?? null, total: 0 };
    existing.total += Number(row.amount);
    catMap.set(key, existing);
  }
  const topCategories = [...catMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((c: any) => ({
      ...c,
      percent: totalThisMonth > 0 ? (c.total / totalThisMonth) * 100 : 0,
    }));

  const dayMap = new Map<string, number>();
  for (const row of (dailyRes.data ?? []) as any[]) {
    dayMap.set(row.date, (dayMap.get(row.date) ?? 0) + Number(row.amount));
  }
  const dailyTotals = [...dayMap.entries()].map(([date, total]) => ({ date, total }));

  return { totalThisMonth, totalLastMonth, changePercent, topCategories, dailyTotals };
}

export async function clientGetCategories() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function clientGetTags() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function clientGetIncomes(rawFilters: any = {}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (search) query = query.ilike("title", `%${search}%`);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);
  if (minAmount !== undefined) query = query.gte("amount", minAmount);
  if (maxAmount !== undefined) query = query.lte("amount", maxAmount);
  if (isRecurring !== undefined) query = query.eq("is_recurring", isRecurring);

  if (tagIds && tagIds.length > 0) {
    const { data: taggedIncomes } = await supabase
      .from("income_tags")
      .select("income_id")
      .in("tag_id", tagIds);
    const ids = [...new Set((taggedIncomes ?? []).map((r: any) => r.income_id))];
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  query = query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const normalised = (data ?? []).map((row: any) => ({
    ...row,
    tags: (row.tags as unknown as { tag: { id: string; name: string; color: string | null } }[])
      .map((t: any) => t.tag),
  })) as IncomeWithRelations[];

  const total = count ?? 0;
  return {
    data: normalised,
    count: total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

export async function clientGetIncomeStats(year?: number, month?: number) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

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
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", thisStart)
      .lte("date", thisEnd),
    supabase
      .from("incomes")
      .select("amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", prevStart)
      .lte("date", prevEnd),
    supabase
      .from("incomes")
      .select("amount, category:categories(name, color)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", thisStart)
      .lte("date", thisEnd),
    supabase
      .from("incomes")
      .select("date, amount")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("date", thisStart)
      .lte("date", thisEnd)
      .order("date"),
  ]);

  if (thisRes.error) throw thisRes.error;
  if (prevRes.error) throw prevRes.error;
  if (catRes.error) throw catRes.error;
  if (dailyRes.error) throw dailyRes.error;

  const totalThisMonth = (thisRes.data ?? []).reduce((s: any, r: any) => s + Number(r.amount), 0);
  const totalLastMonth = (prevRes.data ?? []).reduce((s: any, r: any) => s + Number(r.amount), 0);
  const changePercent  =
    totalLastMonth === 0
      ? 0
      : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;

  const catMap = new Map<string, { color: string | null; total: number }>();
  for (const r of (catRes.data ?? []) as any[]) {
    const name = r.category?.name ?? "Uncategorised";
    const color = r.category?.color ?? null;
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

  const dailyMap = new Map<string, number>();
  for (const r of (dailyRes.data ?? []) as any[]) {
    const d = r.date;
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + Number(r.amount));
  }
  const dailyTotals = Array.from(dailyMap.entries()).map(([date, total]) => ({
    date,
    total,
  }));

  return {
    totalThisMonth,
    totalLastMonth,
    changePercent,
    topCategories,
    dailyTotals,
  };
}

export async function clientGetIncomeCategories() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "income")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function clientGetAccounts() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function clientGetNotes(rawFilters: any = {}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const filters = noteFiltersSchema.parse(rawFilters);

  let query = supabase
    .from("notes")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    const { data: noteTagsData } = await supabase
      .from("note_tags")
      .select("note_id")
      .in("tag_id", filters.tagIds);
    const ids = [...new Set((noteTagsData ?? []).map((r: any) => r.note_id))];
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  if (filters.linkType && filters.linkId) {
    const { data: noteLinksData } = await supabase
      .from("note_links")
      .select("note_id")
      .eq("link_type", filters.linkType)
      .eq("link_id", filters.linkId);
    const ids = [...new Set((noteLinksData ?? []).map((r: any) => r.note_id))];
    query = query.in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }

  const offset = (filters.page - 1) * filters.pageSize;
  query = query
    .order(filters.sortBy, { ascending: filters.sortOrder === "asc" })
    .range(offset, offset + filters.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  const noteIds = (data || []).map((n: any) => n.id);

  if (noteIds.length === 0) {
    return {
      data: [] as NoteWithRelations[],
      count: total,
      page: filters.page,
      pageSize: filters.pageSize,
      pageCount: Math.ceil(total / filters.pageSize),
    };
  }

  // Fetch Tags
  const { data: tagsData } = await supabase
    .from("note_tags")
    .select("note_id, tags(*)")
    .in("note_id", noteIds);

  // Fetch Links
  const { data: linksData } = await supabase
    .from("note_links")
    .select("*")
    .in("note_id", noteIds);

  // Fetch Attachments
  const { data: attachData } = await supabase
    .from("attachments")
    .select("*")
    .in("note_id", noteIds);

  // Combine notes with their relations
  const notesWithRelations = (data || []).map((note: any) => {
    const associatedTags = (tagsData || [])
      .filter((t: any) => t.note_id === note.id && t.tags)
      .map((t: any) => t.tags);

    const associatedLinks = (linksData || [])
      .filter((l: any) => l.note_id === note.id);

    const associatedAttachments = (attachData || [])
      .filter((a: any) => a.note_id === note.id);

    return {
      ...note,
      tags: associatedTags,
      links: associatedLinks,
      attachments: associatedAttachments,
    };
  });

  return {
    data: notesWithRelations as NoteWithRelations[],
    count: total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.ceil(total / filters.pageSize),
  };
}

export async function clientGetTimeline(rawFilters: any = {}) {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const filters = timelineFiltersSchema.parse(rawFilters);

  let query = supabase
    .from("timeline_events")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters.eventTypes && filters.eventTypes.length > 0) {
    query = query.in("event_type", filters.eventTypes);
  }

  if (filters.startDate) {
    query = query.gte("event_date", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("event_date", filters.endDate);
  }

  const offset = (filters.page - 1) * filters.pageSize;
  query = query
    .order(filters.sortBy, { ascending: filters.sortOrder === "asc" })
    .range(offset, offset + filters.pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: data as TimelineEvent[],
    count: total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.ceil(total / filters.pageSize),
  };
}

