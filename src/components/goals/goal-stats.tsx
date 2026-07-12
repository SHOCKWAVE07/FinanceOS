"use client";

// ==============================================
// GoalStats — Goals Dashboard Stats
// Interactive summaries, allocation charts, and
// upcoming milestones cards.
// ==============================================

import * as React from "react";
import { Target, Flag, Calendar, Award, TrendingUp } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { GoalStats as GoalStatsData } from "@/app/(dashboard)/goals/actions";

interface GoalStatsProps {
  stats: GoalStatsData;
}

export function GoalStats({ stats }: GoalStatsProps) {
  const CATEGORY_COLORS: Record<string, string> = {
    retirement: "#f97316",    // Orange
    house: "#06b6d4",         // Cyan
    car: "#3b82f6",           // Blue
    education: "#8b5cf6",     // Purple
    vacation: "#ec4899",      // Pink
    emergency_fund: "#eab308", // Yellow
    other: "#64748b",         // Slate
  };

  const CATEGORY_LABELS: Record<string, string> = {
    retirement: "Retirement",
    house: "House / Property",
    car: "Car / Vehicle",
    education: "Education",
    vacation: "Vacation",
    emergency_fund: "Emergency Fund",
    other: "Other Goals",
  };

  const chartData = React.useMemo(() => {
    return stats.categoryDistribution.map((item) => ({
      name: CATEGORY_LABELS[item.category] || item.category,
      value: Number(item.saved),
      target: Number(item.target),
      color: CATEGORY_COLORS[item.category] || "#6b7280",
    }));
  }, [stats.categoryDistribution]);

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Active Goals */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Goals Tracking
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold font-mono">
              {stats.activeGoalsCount} <span className="text-xs font-normal text-muted-foreground">active</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {stats.completedGoalsCount} of {stats.totalGoalsCount} completed successfully
            </p>
          </CardContent>
        </Card>

        {/* Portfolio Saved Value */}
        <Card className="border-border bg-card/50 backdrop-blur-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aggregate Savings Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold font-mono text-emerald-500">
                {formatCurrency(stats.totalSavedAmount, "INR")}
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Target: {formatCurrency(stats.totalTargetAmount, "INR")} ({stats.overallProgressPercent.toFixed(1)}%)
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted-foreground/15 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${stats.overallProgressPercent}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Completed Goals */}
        <Card className="border-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Goals
            </CardTitle>
            <Award className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-2xl font-bold font-mono">
              {stats.completedGoalsCount} <span className="text-xs font-normal text-muted-foreground">goals</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {stats.totalGoalsCount > 0 ? ((stats.completedGoalsCount / stats.totalGoalsCount) * 100).toFixed(0) : 0}% success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Allocation */}
      {chartData.length > 0 && (
        <div className="grid gap-4 md:grid-cols-1">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Goal Category Allocations</CardTitle>
              <CardDescription className="text-xs">
                Current accumulated net worth allocated to goals by category.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-around gap-4 py-6">
              <div className="h-[200px] w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(30, 41, 59, 0.95)",
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ fontSize: "11px", fontFamily: "monospace" }}
                      formatter={(value) => formatCurrency(Number(value), "INR")}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto w-full sm:w-auto pr-2 min-w-[200px]">
                {chartData.map((entry, index) => {
                  const percent = stats.totalSavedAmount > 0 ? (entry.value / stats.totalSavedAmount) * 100 : 0;
                  return (
                    <div key={`legend-${index}`} className="flex items-center justify-between gap-6 text-xs border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        {percent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
