"use server";

import { requireAuth } from "@/app/(dashboard)/investments/actions";
import type { ActionResult } from "@/types";

export interface ReportExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface ReportIncome {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface ReportGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  status: string;
}

export interface ReportNote {
  id: string;
  title: string;
  created_at: string;
  tags: string[];
}

export interface ReportData {
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
  incomes: ReportIncome[];
  expenses: ReportExpense[];
  goals: ReportGoal[];
  notes: ReportNote[];
  category_breakdown: { category: string; amount: number; percentage: number }[];
}

export async function getReportData(startDateStr: string, endDateStr: string): Promise<ActionResult<ReportData>> {
  try {
    const { supabase, userId } = await requireAuth();

    // 1. Fetch Incomes in range
    const { data: incomes, error: errInc } = await (supabase as any)
      .from("incomes")
      .select("id, title, amount, date, categories(name)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    if (errInc) throw errInc;

    // 2. Fetch Expenses in range
    const { data: expenses, error: errExp } = await (supabase as any)
      .from("expenses")
      .select("id, title, amount, date, categories(name)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    if (errExp) throw errExp;

    // 3. Fetch active Goals
    const { data: goals, error: errGoals } = await (supabase as any)
      .from("goals")
      .select("id, name, target_amount, manual_savings, status")
      .eq("user_id", userId);

    if (errGoals) throw errGoals;

    // 4. Fetch Notes created in range
    const { data: notes, error: errNotes } = await (supabase as any)
      .from("notes")
      .select(`
        id,
        title,
        created_at,
        note_tags (
          tags (name)
        )
      `)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("created_at", startDateStr)
      .lte("created_at", `${endDateStr}T23:59:59Z`)
      .order("created_at", { ascending: false });

    if (errNotes) throw errNotes;

    // Format incomes & expenses
    const formattedIncomes: ReportIncome[] = (incomes || []).map((inc: any) => ({
      id: inc.id,
      title: inc.title,
      amount: Number(inc.amount || 0),
      date: inc.date,
      category: inc.categories?.name || "Uncategorized",
    }));

    const formattedExpenses: ReportExpense[] = (expenses || []).map((exp: any) => ({
      id: exp.id,
      title: exp.title,
      amount: Number(exp.amount || 0),
      date: exp.date,
      category: exp.categories?.name || "Uncategorized",
    }));

    // Aggregations
    const totalIncome = formattedIncomes.reduce((acc, cur) => acc + cur.amount, 0);
    const totalExpense = formattedExpenses.reduce((acc, cur) => acc + cur.amount, 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Category Breakdown for expenses
    const catMap = new Map<string, number>();
    formattedExpenses.forEach((exp) => {
      catMap.set(exp.category, (catMap.get(exp.category) || 0) + exp.amount);
    });

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Format goals
    const formattedGoals: ReportGoal[] = (goals || []).map((goal: any) => ({
      id: goal.id,
      name: goal.name,
      target_amount: Number(goal.target_amount || 0),
      current_amount: Number(goal.manual_savings || 0),
      status: goal.status,
    }));

    // Format notes
    const formattedNotes: ReportNote[] = (notes || []).map((note: any) => ({
      id: note.id,
      title: note.title,
      created_at: note.created_at,
      tags: (note.note_tags || []).map((nt: any) => nt.tags?.name).filter(Boolean),
    }));

    return {
      ok: true,
      data: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_savings: netSavings,
        savings_rate: savingsRate,
        incomes: formattedIncomes,
        expenses: formattedExpenses,
        goals: formattedGoals,
        notes: formattedNotes,
        category_breakdown: categoryBreakdown,
      },
    };
  } catch (err: any) {
    console.error("Error in getReportData server action:", err);
    return { ok: false, error: err.message || "Failed to generate report data" };
  }
}
