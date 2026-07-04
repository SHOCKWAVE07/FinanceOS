"use server";

import { requireAuth } from "@/app/(dashboard)/investments/actions";
import type { ActionResult } from "@/types";

export interface MonthlyCashFlowData {
  month: string;
  total_income: number;
  total_expense: number;
  savings: number;
  savings_rate: number;
}

export interface CategorySpendingData {
  category_name: string;
  category_color: string | null;
  total_amount: number;
  transaction_count: number;
}

export interface AssetAllocationData {
  type: string;
  value: number;
  invested: number;
  gain: number;
  gain_percentage: number;
}

export interface NetWorthSummary {
  total_cash: number;
  total_investments: number;
  net_worth: number;
}

// ═══════════════════════════════════════════════
// ANALYTICS SERVER ACTIONS
// ═══════════════════════════════════════════════

export async function getMonthlyCashFlowData(): Promise<ActionResult<MonthlyCashFlowData[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data, error } = await (supabase as any)
      .from("monthly_cash_flow")
      .select("*")
      .eq("user_id", userId)
      .order("month", { ascending: true });

    if (error) throw error;

    const formattedData = (data || []).map((row: any) => ({
      month: row.month,
      total_income: Number(row.total_income || 0),
      total_expense: Number(row.total_expense || 0),
      savings: Number(row.savings || 0),
      savings_rate: Number(row.savings_rate || 0),
    }));

    return { ok: true, data: formattedData };
  } catch (err: any) {
    console.error("Error in getMonthlyCashFlowData action:", err);
    return { ok: false, error: err.message || "Failed to fetch cash flow data" };
  }
}

export async function getCategorySpendingData(monthStr?: string): Promise<ActionResult<CategorySpendingData[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    let query = (supabase as any)
      .from("category_spending")
      .select("*")
      .eq("user_id", userId);

    if (monthStr) {
      query = query.eq("month", monthStr);
    }

    const { data, error } = await query;
    if (error) throw error;

    // If no specific month was specified, aggregate category spending in JS
    if (!monthStr) {
      const aggMap = new Map<string, { color: string | null; amount: number; count: number }>();
      (data || []).forEach((row: any) => {
        const key = row.category_name;
        const existing = aggMap.get(key) || { color: row.category_color, amount: 0, count: 0 };
        aggMap.set(key, {
          color: row.category_color,
          amount: existing.amount + Number(row.total_amount || 0),
          count: existing.count + Number(row.transaction_count || 0),
        });
      });

      const aggregated: CategorySpendingData[] = Array.from(aggMap.entries()).map(([name, val]) => ({
        category_name: name,
        category_color: val.color,
        total_amount: val.amount,
        transaction_count: val.count,
      }));

      return { ok: true, data: aggregated.sort((a: CategorySpendingData, b: CategorySpendingData) => b.total_amount - a.total_amount) };
    }

    const formatted = (data || []).map((row: any) => ({
      category_name: row.category_name,
      category_color: row.category_color,
      total_amount: Number(row.total_amount || 0),
      transaction_count: Number(row.transaction_count || 0),
    })).sort((a: CategorySpendingData, b: CategorySpendingData) => b.total_amount - a.total_amount);

    return { ok: true, data: formatted };
  } catch (err: any) {
    console.error("Error in getCategorySpendingData action:", err);
    return { ok: false, error: err.message || "Failed to fetch category spending data" };
  }
}

export async function getAssetAllocationData(): Promise<ActionResult<AssetAllocationData[]>> {
  try {
    const { supabase, userId } = await requireAuth();

    const { data: investments, error } = await (supabase as any)
      .from("investments")
      .select("type, current_value, invested_amount")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (error) throw error;

    const aggMap = new Map<string, { current: number; invested: number }>();
    (investments || []).forEach((inv: any) => {
      const type = inv.type;
      const current = Number(inv.current_value || 0);
      const invested = Number(inv.invested_amount || 0);
      const existing = aggMap.get(type) || { current: 0, invested: 0 };
      aggMap.set(type, {
        current: existing.current + current,
        invested: existing.invested + invested,
      });
    });

    const result: AssetAllocationData[] = Array.from(aggMap.entries()).map(([type, val]) => {
      const gain = val.current - val.invested;
      const gain_percentage = val.invested > 0 ? (gain / val.invested) * 100 : 0;
      return {
        type,
        value: val.current,
        invested: val.invested,
        gain,
        gain_percentage,
      };
    });

    return { ok: true, data: result.sort((a: AssetAllocationData, b: AssetAllocationData) => b.value - a.value) };
  } catch (err: any) {
    console.error("Error in getAssetAllocationData action:", err);
    return { ok: false, error: err.message || "Failed to fetch asset allocation data" };
  }
}

export async function getNetWorthSummary(): Promise<ActionResult<NetWorthSummary>> {
  try {
    const { supabase, userId } = await requireAuth();

    // 1. Fetch active accounts balances
    const { data: accounts, error: errAcc } = await (supabase as any)
      .from("accounts")
      .select("balance")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (errAcc) throw errAcc;

    // 2. Fetch active investments values
    const { data: investments, error: errInv } = await (supabase as any)
      .from("investments")
      .select("current_value")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (errInv) throw errInv;

    const totalCash = (accounts || []).reduce((acc: number, cur: any) => acc + Number(cur.balance || 0), 0);
    const totalInvestments = (investments || []).reduce((acc: number, cur: any) => acc + Number(cur.current_value || 0), 0);
    const netWorth = totalCash + totalInvestments;

    return {
      ok: true,
      data: {
        total_cash: totalCash,
        total_investments: totalInvestments,
        net_worth: netWorth,
      },
    };
  } catch (err: any) {
    console.error("Error in getNetWorthSummary action:", err);
    return { ok: false, error: err.message || "Failed to fetch net worth summary" };
  }
}
