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
  expense_bifurcation: { name: string; value: number }[];
  salary_split: { name: string; value: number }[];
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

    // 2. Fetch Investments (Current & Invested Values)
    const { data: investments, error: errInv } = await (supabase as any)
      .from("investments")
      .select("current_value, invested_amount, start_date")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (errInv) throw errInv;

    const totalCash = (accounts || []).reduce((acc: number, cur: any) => acc + Number(cur.balance || 0), 0);
    const totalInvestments = (investments || []).reduce((acc: number, cur: any) => acc + Number(cur.current_value || 0), 0);
    const currentNetWorth = totalCash + totalInvestments;

    // 3. Fetch Incomes (All Months)
    const { data: curIncomes, error: errCurInc } = await (supabase as any)
      .from("incomes")
      .select("id, title, amount, date, categories(name, slug)")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (errCurInc) throw errCurInc;

    // 4. Fetch Expenses (All Months)
    const { data: curExpenses, error: errCurExp } = await (supabase as any)
      .from("expenses")
      .select("id, title, amount, date, categories(name, slug)")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (errCurExp) throw errCurExp;

    // 5. Fetch Active Goals
    const { data: goals, error: errGoals } = await (supabase as any)
      .from("goals")
      .select("id, name, target_amount, manual_savings, status")
      .eq("user_id", userId)
      .limit(3);

    if (errGoals) throw errGoals;

    // Calculations
    const curIncSum = (curIncomes || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const curExpSum = (curExpenses || []).reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    // Calculate current month and previous month sums in memory for MoM trends
    const thisMonthIncomes = (curIncomes || []).filter((inc: any) => inc.date >= curStart && inc.date <= curEnd);
    const prevMonthIncomes = (curIncomes || []).filter((inc: any) => inc.date >= prevStart && inc.date <= prevEnd);

    const thisMonthExpenses = (curExpenses || []).filter((exp: any) => exp.date >= curStart && exp.date <= curEnd);
    const prevMonthExpenses = (curExpenses || []).filter((exp: any) => exp.date >= prevStart && exp.date <= prevEnd);

    const thisMonthIncSum = thisMonthIncomes.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const prevMonthIncSum = prevMonthIncomes.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    const thisMonthExpSum = thisMonthExpenses.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const prevMonthExpSum = prevMonthExpenses.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    // MoM Percentages
    const incomeMoM = prevMonthIncSum > 0 ? ((thisMonthIncSum - prevMonthIncSum) / prevMonthIncSum) * 100 : 0;
    const expenseMoM = prevMonthExpSum > 0 ? ((thisMonthExpSum - prevMonthExpSum) / prevMonthExpSum) * 100 : 0;

    // Savings rates (Cumulative)
    const curSavings = curIncSum - curExpSum;
    const curSavingsRate = curIncSum > 0 ? (curSavings / curIncSum) * 100 : 0;

    // Previous savings rate (Cumulative prior to current month)
    const prevIncomesAllTime = (curIncomes || []).filter((inc: any) => inc.date < curStart);
    const prevExpensesAllTime = (curExpenses || []).filter((exp: any) => exp.date < curStart);
    const prevIncSumAllTime = prevIncomesAllTime.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const prevExpSumAllTime = prevExpensesAllTime.reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);
    const prevSavingsAllTime = prevIncSumAllTime - prevExpSumAllTime;
    const prevSavingsRate = prevIncSumAllTime > 0 ? (prevSavingsAllTime / prevIncSumAllTime) * 100 : 0;

    const savingsRateMoM = curSavingsRate - prevSavingsRate;

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

    // 6. Calculate Expense Bifurcation
    const expenseMap: Record<string, number> = {};
    (curExpenses || []).forEach((exp: any) => {
      const catName = exp.categories?.name || "Other";
      expenseMap[catName] = (expenseMap[catName] || 0) + Number(exp.amount || 0);
    });
    const expense_bifurcation = Object.entries(expenseMap)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    // 7. Calculate Last Month Salary Split
    const lastMonthSalaryIncome = (curIncomes || [])
      .filter((inc: any) => inc.date >= prevStart && inc.date <= prevEnd && inc.categories?.slug === "salary")
      .reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    const totalLastMonthIncome = (curIncomes || [])
      .filter((inc: any) => inc.date >= prevStart && inc.date <= prevEnd)
      .reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    const baseSalary = lastMonthSalaryIncome > 0 ? lastMonthSalaryIncome : (totalLastMonthIncome > 0 ? totalLastMonthIncome : 0);

    const lastMonthExp = (curExpenses || [])
      .filter((exp: any) => exp.date >= prevStart && exp.date <= prevEnd)
      .reduce((acc: number, cur: any) => acc + Number(cur.amount || 0), 0);

    const lastMonthInv = (investments || [])
      .filter((inv: any) => inv.start_date >= prevStart && inv.start_date <= prevEnd)
      .reduce((acc: number, cur: any) => acc + Number(cur.invested_amount || 0), 0);

    const lastMonthSavings = Math.max(0, baseSalary - lastMonthExp - lastMonthInv);

    const salary_split = [
      { name: "Expenses", value: lastMonthExp },
      { name: "Investments", value: lastMonthInv },
      { name: "Savings", value: lastMonthSavings },
    ];

    return {
      ok: true,
      data: {
        total_balance: {
          title: "Total Cash",
          value: totalCash,
          change: prevMonthIncSum > 0 ? ((totalCash - (totalCash - curSavings)) / (totalCash - curSavings)) * 100 : 0,
          description: "Across savings & credit accounts",
        },
        monthly_income: {
          title: "Monthly Income",
          value: curIncSum,
          change: incomeMoM,
          description: "Cumulative income across all months",
        },
        monthly_expenses: {
          title: "Monthly Expenses",
          value: curExpSum,
          change: expenseMoM,
          description: "Cumulative expenses across all months",
        },
        savings_rate: {
          title: "Savings Rate",
          value: curSavingsRate,
          change: savingsRateMoM,
          description: "Cumulative savings margin",
        },
        recent_activity: recentActivity,
        quick_goals: quickGoals,
        net_worth: currentNetWorth,
        investments_value: totalInvestments,
        expense_bifurcation,
        salary_split,
      },
    };
  } catch (err: any) {
    console.error("Error in getDashboardOverview server action:", err);
    return { ok: false, error: err.message || "Failed to retrieve dashboard summaries" };
  }
}
