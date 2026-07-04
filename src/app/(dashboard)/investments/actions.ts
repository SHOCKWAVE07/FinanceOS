"use server";

// ==============================================
// Investment Server Actions — Phase 4
// Auth-checked, Zod-validated CRUD operations
// for Investments and Valuations.
// ==============================================

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/action-client";
import {
  investmentSchema,
  valuationSchema,
  investmentFiltersSchema,
  type InvestmentFormValues,
  type ValuationFormValues,
  type InvestmentFiltersFormValues,
} from "@/lib/validations/investment.schemas";
import type {
  Investment,
  InvestmentValuation,
  PaginatedResult,
} from "@/types/database";

// ── Auth helper ──────────────────────────────────
export async function requireAuth() {
  const supabase = await createActionClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// ═══════════════════════════════════════════════
// INVESTMENTS CRUD ACTIONS
// ═══════════════════════════════════════════════

export async function getInvestments(
  rawFilters: Partial<InvestmentFiltersFormValues>
): Promise<ActionResult<PaginatedResult<Investment>>> {
  try {
    const { supabase, userId } = await requireAuth();
    const filters = investmentFiltersSchema.parse(rawFilters);

    let query = supabase
      .from("investments")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // Search query
    if (filters.search) {
      query = query.ilike("name", `%${filters.search.trim()}%`);
    }

    // Type filter
    if (filters.type && filters.type !== "all") {
      query = query.eq("type", filters.type);
    }

    // Sorting & Pagination
    query = query.order(filters.sortBy, { ascending: filters.sortOrder === "asc" });
    
    const start = (filters.page - 1) * filters.pageSize;
    const end = start + filters.pageSize - 1;
    query = query.range(start, end);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      ok: true,
      data: {
        data: data as Investment[],
        count: count ?? 0,
        page: filters.page,
        pageSize: filters.pageSize,
        pageCount: Math.ceil((count ?? 0) / filters.pageSize),
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function createInvestment(
  raw: InvestmentFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = investmentSchema.parse(raw);

    // Insert investment
    const { data: newInv, error: invErr } = await supabase
      .from("investments")
      .insert({
        user_id: userId,
        name: parsed.name,
        type: parsed.type,
        institution: parsed.institution,
        invested_amount: parsed.invested_amount,
        current_value: parsed.current_value,
        quantity: parsed.quantity,
        avg_buy_price: parsed.avg_buy_price,
        currency: parsed.currency,
        start_date: parsed.start_date,
        notes: parsed.notes || null,
      })
      .select("id")
      .single();

    if (invErr) throw invErr;

    // Create initial valuation snapshot
    const { error: valErr } = await supabase
      .from("investment_valuations")
      .insert({
        investment_id: newInv.id,
        valuation_date: parsed.start_date,
        value: parsed.current_value,
        invested_amount: parsed.invested_amount,
      });

    if (valErr) {
      // rollback investment creation
      await supabase.from("investments").delete().eq("id", newInv.id);
      throw valErr;
    }

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: newInv.id } };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function updateInvestment(
  id: string,
  raw: InvestmentFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = investmentSchema.parse(raw);

    // Fetch original value
    const { data: orig, error: origErr } = await supabase
      .from("investments")
      .select("invested_amount, current_value")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (origErr || !orig) throw new Error("Investment not found");

    // Update investment
    const { error: invErr } = await supabase
      .from("investments")
      .update({
        name: parsed.name,
        type: parsed.type,
        institution: parsed.institution,
        invested_amount: parsed.invested_amount,
        current_value: parsed.current_value,
        quantity: parsed.quantity,
        avg_buy_price: parsed.avg_buy_price,
        currency: parsed.currency,
        start_date: parsed.start_date,
        notes: parsed.notes || null,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (invErr) throw invErr;

    // If invested_amount or current_value changed, record today's valuation snapshot
    if (
      Number(orig.invested_amount) !== parsed.invested_amount ||
      Number(orig.current_value) !== parsed.current_value
    ) {
      const todayStr = new Date().toISOString().split("T")[0];
      await supabase
        .from("investment_valuations")
        .upsert(
          {
            investment_id: id,
            valuation_date: todayStr,
            value: parsed.current_value,
            invested_amount: parsed.invested_amount,
          },
          { onConflict: "investment_id,valuation_date" }
        );
    }

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();

    // Soft delete
    const { error } = await supabase
      .from("investments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function addValuationSnapshot(
  investmentId: string,
  raw: ValuationFormValues
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const parsed = valuationSchema.parse(raw);

    // Verify ownership
    const { data: inv, error: invErr } = await supabase
      .from("investments")
      .select("id")
      .eq("id", investmentId)
      .eq("user_id", userId)
      .single();

    if (invErr || !inv) throw new Error("Investment not found");

    // Upsert valuation snapshot
    const { error: valErr } = await supabase
      .from("investment_valuations")
      .upsert(
        {
          investment_id: investmentId,
          valuation_date: parsed.valuation_date,
          value: parsed.value,
          invested_amount: parsed.invested_amount,
        },
        { onConflict: "investment_id,valuation_date" }
      );

    if (valErr) throw valErr;

    // Update current value on investment asset
    const { error: updateErr } = await supabase
      .from("investments")
      .update({
        current_value: parsed.value,
        invested_amount: parsed.invested_amount,
      })
      .eq("id", investmentId);

    if (updateErr) throw updateErr;

    revalidatePath("/investments");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function getValuationHistory(
  investmentId: string
): Promise<ActionResult<InvestmentValuation[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    // Verify ownership
    const { data: inv } = await supabase
      .from("investments")
      .select("id")
      .eq("id", investmentId)
      .eq("user_id", userId)
      .single();

    if (!inv) throw new Error("Investment not found");

    const { data, error } = await supabase
      .from("investment_valuations")
      .select("*")
      .eq("investment_id", investmentId)
      .order("valuation_date", { ascending: true });

    if (error) throw error;
    return { ok: true, data: data as InvestmentValuation[] };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ═══════════════════════════════════════════════
// PORTFOLIO STATS & METRICS
// ═══════════════════════════════════════════════

export interface PortfolioStats {
  totalInvested: number;
  totalCurrentValue: number;
  totalReturns: number;
  returnsPercent: number;
  distribution: { type: string; value: number; label: string; color: string }[];
  history: { date: string; invested: number; value: number }[];
}

export async function getInvestmentStats(): Promise<ActionResult<PortfolioStats>> {
  try {
    const { supabase, userId } = await requireAuth();

    // Fetch active investments
    const { data: assets, error: assetsErr } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (assetsErr) throw assetsErr;

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const distributionMap = new Map<string, number>();

    for (const asset of assets ?? []) {
      const invested = Number(asset.invested_amount);
      const current = Number(asset.current_value);
      totalInvested += invested;
      totalCurrentValue += current;

      distributionMap.set(
        asset.type,
        (distributionMap.get(asset.type) ?? 0) + current
      );
    }

    const totalReturns = totalCurrentValue - totalInvested;
    const returnsPercent = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    const COLORS: Record<string, string> = {
      mutual_fund: "#3b82f6", // Blue
      stock: "#10b981",       // Green
      crypto: "#f59e0b",      // Amber
      gold: "#eab308",        // Yellow
      fixed_deposit: "#8b5cf6", // Purple
      ppf: "#ec4899",         // Pink
      nps: "#f97316",         // Orange
      real_estate: "#06b6d4", // Cyan
      other: "#64748b",       // Slate
    };

    const LABELS: Record<string, string> = {
      mutual_fund: "Mutual Funds",
      stock: "Equities/Stocks",
      crypto: "Crypto Assets",
      gold: "Gold/Precious",
      fixed_deposit: "Fixed Deposits",
      ppf: "PPF",
      nps: "NPS Portfolio",
      real_estate: "Real Estate",
      other: "Others",
    };

    const distribution = [...distributionMap.entries()].map(([type, value]) => ({
      type,
      value,
      label: LABELS[type] ?? type,
      color: COLORS[type] ?? "#6b7280",
    }));

    // Fetch daily/monthly combined valuations history
    const { data: valuations, error: valErr } = await supabase
      .from("investment_valuations")
      .select(`
        valuation_date,
        value,
        invested_amount,
        investment:investments(user_id, deleted_at)
      `);

    if (valErr) throw valErr;

    // Filter valuations belonging to current active investments of this user
    const filteredVals = (valuations ?? []).filter((v) => {
      const inv = v.investment as any;
      return inv && inv.user_id === userId && inv.deleted_at === null;
    });

    // Group valuations by valuation_date, summing values
    const dateMap = new Map<string, { invested: number; value: number }>();
    for (const v of filteredVals) {
      const dateKey = v.valuation_date.substring(0, 7); // group by YYYY-MM
      const existing = dateMap.get(dateKey) ?? { invested: 0, value: 0 };
      existing.invested += Number(v.invested_amount);
      existing.value += Number(v.value);
      dateMap.set(dateKey, existing);
    }

    const history = [...dateMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, sums]) => {
        const dateObj = new Date(month + "-01");
        const label = dateObj.toLocaleString("default", { month: "short", year: "2-digit" });
        return {
          date: label,
          invested: sums.invested,
          value: sums.value,
        };
      });

    return {
      ok: true,
      data: {
        totalInvested,
        totalCurrentValue,
        totalReturns,
        returnsPercent,
        distribution,
        history,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
