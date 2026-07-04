"use server";

import { requireAuth } from "@/app/(dashboard)/investments/actions";
import type { ActionResult } from "@/types";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface DashboardStatCard {
  title: string;
  value: number;
  change: number; // percentage change vs last month
  description: string;
}

export interface DashboardActivity {
  id: string;
  description: string;
  amount: number; // positive for income, negative for expense
  category: string;
  date: string;
  icon: string;
}

export interface DashboardGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  color: string;
}

export interface DashboardOverview {
  total_balance: DashboardStatCard;
  monthly_income: DashboardStatCard;
  monthly_expenses: DashboardStatCard;
  savings_rate: DashboardStatCard;
  recent_activity: DashboardActivity[];
  quick_goals: DashboardGoal[];
  net_worth: number;
  investments_value: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  salary: "💰",
  freelance: "💻",
  investment: "📈",
  groceries: "🛒",
  subscriptions: "📱",
  bills: "💡",
  dining: "🍔",
  transport: "🚗",
  shopping: "🛍️",
  entertainment: "🎬",
  health: "🏥",
  education: "📚",
  other: "💵",
};

const GOAL_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];

export async function getDashboardOverview(): Promise<ActionResult<DashboardOverview>> {
  try {
    const { supabase, userId } = await requireAuth();

    const now = new Date();
    const curStart = format(startOfMonth(now), "yyyy-MM-dd");
    const curEnd = format(endOfMonth(now), "yyyy-MM-dd");

    const prevMonthDate = subMonths(now, 1);
    const prevStart = format(startOfMonth(prevMonthDate), "yyyy-MM-dd");
    const prevEnd = format(endOfMonth(prevMonthDate), "yyyy-MM-dd");

    // 1. Fetch Accounts Balances (Current)
    const { data: accounts, error: errAcc } = await (supabase as any)
      .from("accounts")
      .select("balance, type")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (errAcc) throw errAcc;

    // 2. Fetch Investments (Current Value)
    const { data: investments, error: errInv } = await (supabase as any)
      .from("investments")
      .select("current_value")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (errInv) throw errInv;

    const totalCash = (accounts || []).reduce((acc: number, cur: any) => acc + Number(cur.balance || 0), 0);
    const totalInvestments = (investments || []).reduce((acc: number, cur: any) => acc + Number(cur.current_value || 0), 0);
    const currentNetWorth = totalCash + totalInvestments;

    // 3. Fetch Incomes (Current Month)
    const { data: curIncomes, error: errCurInc } = await (supabase as any)
      .from("incomes")
      .select("id, title, amount, date, categories(name, slug)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", curStart)
      .lte("date", curEnd);

    if (errCurInc) throw errCurInc;

    // 4. Fetch Incomes (Prev Month)
    const { data: prevIncomes, error: errPrevInc } = await (supabase as any)
      .from("incomes")
      .select("amount")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", prevStart)
      .lte("date", prevEnd);

    if (errPrevInc) throw errPrevInc;

    // 5. Fetch Expenses (Current Month)
    const { data: curExpenses, error: errCurExp } = await (supabase as any)
      .from("expenses")
      .select("id, title, amount, date, categories(name, slug)")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", curStart)
      .lte("date", curEnd);

    if (errCurExp) throw errCurExp;

    // 6. Fetch Expenses (Prev Month)
    const { data: prevExpenses, error: errPrevExp } = await (supabase as any)
      .from("expenses")
      .select("amount")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", prevStart)
      .lte("date", prevEnd);

    if (errPrevExp) throw errPrevExp;

    // 7. Fetch Active Goals
    const { data: goals, error: errGoals } = await (supabase as any)
      .from("goals")
      .select("id, name, target_amount, manual_savings, status")
      .eq("user_id", userId)
      .limit(3);

    if (errGoals) throw errGoals;

    // Calculations
    const curIncSum = (curIncomes || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const prevIncSum = (prevIncomes || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    const curExpSum = (curExpenses || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const prevExpSum = (prevExpenses || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    // Savings rates
    const curSavings = curIncSum - curExpSum;
    const curSavingsRate = curIncSum > 0 ? (curSavings / curIncSum) * 100 : 0;

    const prevSavings = prevIncSum - prevExpSum;
    const prevSavingsRate = prevIncSum > 0 ? (prevSavings / prevIncSum) * 100 : 0;

    // MoM Percentages
    const incomeMoM = prevIncSum > 0 ? ((curIncSum - prevIncSum) / prevIncSum) * 100 : 0;
    const expenseMoM = prevExpSum > 0 ? ((curExpSum - prevExpSum) / prevExpSum) * 100 : 0;
    const savingsRateMoM = curSavingsRate - prevSavingsRate; // Difference of rates represents improvement

    // Consolidation of Activities
    const listInc: DashboardActivity[] = (curIncomes || []).map((inc: any) => {
      const slug = inc.categories?.slug || "other";
      return {
        id: inc.id,
        description: inc.title,
        amount: Number(inc.amount || 0),
        category: inc.categories?.name || "Income",
        date: inc.date,
        icon: CATEGORY_ICONS[slug] || "💵",
      };
    });

    const listExp: DashboardActivity[] = (curExpenses || []).map((exp: any) => {
      const slug = exp.categories?.slug || "other";
      return {
        id: exp.id,
        description: exp.title,
        amount: -Number(exp.amount || 0),
        category: exp.categories?.name || "Expense",
        date: exp.date,
        icon: CATEGORY_ICONS[slug] || "🛒",
      };
    });

    const recentActivity = [...listInc, ...listExp]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Format goals
    const quickGoals: DashboardGoal[] = (goals || []).map((goal: any, idx: number) => ({
      id: goal.id,
      name: goal.name,
      current: Number(goal.manual_savings || 0),
      target: Number(goal.target_amount || 0),
      color: GOAL_COLORS[idx % GOAL_COLORS.length],
    }));

    return {
      ok: true,
      data: {
        total_balance: {
          title: "Total Cash",
          value: totalCash,
          change: prevIncSum > 0 ? ((totalCash - (totalCash - curSavings)) / (totalCash - curSavings)) * 100 : 0,
          description: "Across savings & credit accounts",
        },
        monthly_income: {
          title: "Monthly Income",
          value: curIncSum,
          change: incomeMoM,
          description: "Credits this calendar month",
        },
        monthly_expenses: {
          title: "Monthly Expenses",
          value: curExpSum,
          change: expenseMoM,
          description: "Debits this calendar month",
        },
        savings_rate: {
          title: "Savings Rate",
          value: curSavingsRate,
          change: savingsRateMoM,
          description: "Current month savings margin",
        },
        recent_activity: recentActivity,
        quick_goals: quickGoals,
        net_worth: currentNetWorth,
        investments_value: totalInvestments,
      },
    };
  } catch (err: any) {
    console.error("Error in getDashboardOverview server action:", err);
    return { ok: false, error: err.message || "Failed to retrieve dashboard summaries" };
  }
}
