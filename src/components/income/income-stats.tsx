"use client";

// ==============================================
// IncomeStatsBar — Phase 3
// Dashboard stats bar for incomes.
// ==============================================

import * as React from "react";
import {
  TrendingDown,
  TrendingUp,
  PieChart as PieIcon,
  CalendarDays,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { IncomeStats } from "@/app/(dashboard)/income/actions";
import { Badge } from "@/components/ui/badge";

interface IncomeStatsProps {
  stats: IncomeStats;
  currency?: string;
}

export function IncomeStatsBar({ stats, currency = "INR" }: IncomeStatsProps) {
  const { totalThisMonth, totalLastMonth, changePercent, topCategories, dailyTotals } = stats;

  const isUp = changePercent >= 0;
  const absChange = Math.abs(changePercent).toFixed(1);

  // Format daily totals data for Recharts area chart
  const chartData = React.useMemo(() => {
    return dailyTotals.map((d) => ({
      day: d.date.split("-")[2], // "YYYY-MM-DD" -> "DD"
      amount: d.total,
      rawDate: d.date,
    }));
  }, [dailyTotals]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* ── CARD 1: Monthly Total & MoM Trend ── */}
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col justify-between h-full min-h-[140px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                This Month Income
              </span>
              <Badge variant="outline" className="text-[10px] font-mono py-0 text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                Current
              </Badge>
            </div>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalThisMonth, currency)}
            </h3>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground">Last Month</span>
              <span className="text-sm font-semibold">
                {formatCurrency(totalLastMonth, currency)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {totalLastMonth > 0 ? (
                <>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-bold ${
                      isUp ? "text-emerald-500" : "text-destructive"
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {absChange}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">MoM</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 2: Top Categories Breakdown ── */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col h-full min-h-[140px] justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <PieIcon className="h-3.5 w-3.5 text-emerald-500" />
              Category Breakdown
            </span>
          </div>

          <div className="flex-1 space-y-2.5">
            {topCategories.length > 0 ? (
              topCategories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium truncate max-w-[130px] flex items-center gap-1">
                      {cat.color && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      {cat.name}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {cat.percent.toFixed(0)}% ({formatCurrency(cat.total, currency)})
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: cat.color ?? undefined,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground py-4">
                No categorical data this month.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 3: Daily Spending Trend Area Chart ── */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col h-full min-h-[140px] justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-500" />
              Daily Trend
            </span>
          </div>

          <div className="h-[75px] w-full mt-1">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const dataPoint = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-md">
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {dataPoint.rawDate}
                            </p>
                            <p className="text-xs font-bold font-mono">
                              {formatCurrency(Number(payload[0].value), currency)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No daily data this month.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
