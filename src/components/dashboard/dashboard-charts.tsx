"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  name: string;
  value: number;
}

interface DashboardChartsProps {
  expenseBifurcation: ChartDataPoint[];
  salarySplit: ChartDataPoint[];
}

// Cohort of beautiful curated colors for expenses categories
const CATEGORY_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#ef4444", // Red
  "#84cc16", // Lime
  "#a855f7", // Purple
];

// Curated colors for Salary split
const SALARY_SPLIT_COLORS: Record<string, string> = {
  Expenses: "#ef4444",    // Red
  Investments: "#3b82f6", // Blue
  Savings: "#10b981",     // Emerald
};

export function DashboardCharts({ expenseBifurcation, salarySplit }: DashboardChartsProps) {
  // Filter out zero values for visual correctness
  const activeExpenses = expenseBifurcation.filter((d) => d.value > 0);
  const activeSalary = salarySplit.filter((d) => d.value > 0);

  const totalExpenseSum = activeExpenses.reduce((sum, d) => sum + d.value, 0);
  const totalSalarySum = salarySplit.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Expense Bifurcation Chart */}
      <Card className="border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Expense Bifurcation</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Distribution of all expenses by category
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center min-h-[300px]">
          {activeExpenses.length > 0 ? (
            <div className="w-full h-[260px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeExpenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activeExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value), "INR"), "Spent"]}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    formatter={(value: string, entry: any) => {
                      const item = activeExpenses.find((d) => d.name === value);
                      if (!item) return value;
                      const pct = totalExpenseSum > 0 ? ((item.value / totalExpenseSum) * 100).toFixed(0) : "0";
                      return (
                        <span className="text-[11px] font-medium text-muted-foreground mr-1">
                          {value} <span className="text-foreground font-semibold font-mono">({pct}%)</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Central Text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Total Expenses</span>
                <span className="text-lg font-bold text-foreground font-mono">
                  {formatCurrency(totalExpenseSum, "INR")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border/80 rounded-xl bg-muted/10 p-6 text-center">
              <span className="text-2xl mb-1">📊</span>
              <p className="text-xs font-semibold text-muted-foreground">No expense data available</p>
              <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[200px]">
                Add your first expense to see your category breakdown.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Distribution Chart */}
      <Card className="border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground">Last Month's Salary Split</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Bifurcation of last month's salary into Expenses, Investments, and Savings
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center min-h-[300px]">
          {totalSalarySum > 0 ? (
            <div className="w-full h-[260px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salarySplit}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {salarySplit.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SALARY_SPLIT_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value), "INR"), "Amount"]}
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconSize={8}
                    iconType="circle"
                    formatter={(value: string, entry: any) => {
                      const item = salarySplit.find((d) => d.name === value);
                      if (!item) return value;
                      const pct = totalSalarySum > 0 ? ((item.value / totalSalarySum) * 100).toFixed(0) : "0";
                      return (
                        <span className="text-[11px] font-medium text-muted-foreground mr-1">
                          {value} <span className="text-foreground font-semibold font-mono">({pct}%)</span>
                        </span>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Central Text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Salary Pool</span>
                <span className="text-lg font-bold text-foreground font-mono">
                  {formatCurrency(totalSalarySum, "INR")}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border/80 rounded-xl bg-muted/10 p-6 text-center">
              <span className="text-2xl mb-1">💰</span>
              <p className="text-xs font-semibold text-muted-foreground">No salary or income recorded for last month</p>
              <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[220px]">
                Create a payslip or record salary income in your history to see your salary allocation split.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
