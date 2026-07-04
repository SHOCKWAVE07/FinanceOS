"use client";

// ==============================================
// InvestmentStats — Phase 4
// Cards showing total stats and pie chart distribution.
// ==============================================

import * as React from "react";
import { Cell, PieChart, Pie, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, DollarSign, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { PortfolioStats } from "@/app/(dashboard)/investments/actions";

interface InvestmentStatsProps {
  stats: PortfolioStats;
}

export function InvestmentStats({ stats }: InvestmentStatsProps) {
  const { totalInvested, totalCurrentValue, totalReturns, returnsPercent, distribution } = stats;
  const isProfit = totalReturns >= 0;

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Valuation */}
        <Card className="border-border/60 bg-gradient-to-br from-card/85 to-card/25 backdrop-blur-md">
          <CardContent className="p-5 flex flex-col justify-between min-h-[110px]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Portfolio Net Value
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(totalCurrentValue, "INR")}
              </h3>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>Current valuation of all assets</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Invested */}
        <Card className="border-border/60 bg-gradient-to-br from-card/85 to-card/25 backdrop-blur-md">
          <CardContent className="p-5 flex flex-col justify-between min-h-[110px]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Total Invested Capital
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                {formatCurrency(totalInvested, "INR")}
              </h3>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Net principal injected amount</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Returns */}
        <Card className="border-border/60 bg-gradient-to-br from-card/85 to-card/25 backdrop-blur-md">
          <CardContent className="p-5 flex flex-col justify-between min-h-[110px]">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Total Unrealized Returns
              </span>
              <h3 className={`text-2xl font-bold tracking-tight font-mono flex items-baseline gap-1.5 ${
                isProfit ? "text-emerald-500" : "text-destructive"
              }`}>
                <span>{isProfit ? "+" : ""}{formatCurrency(totalReturns, "INR")}</span>
              </h3>
            </div>
            <div className={`mt-2 text-xs font-semibold flex items-center gap-1 ${
              isProfit ? "text-emerald-500" : "text-destructive"
            }`}>
              {isProfit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{isProfit ? "+" : ""}{returnsPercent.toFixed(2)}% absolute return</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Distribution */}
      {distribution.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 border-border/60 bg-card/60 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Asset Allocation</CardTitle>
              <CardDescription>Visual breakdown of portfolio value distribution.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6">
              {/* Pie Chart */}
              <div className="h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-border bg-popover p-2.5 shadow-md text-xs font-mono">
                              <span className="font-semibold block mb-0.5 text-muted-foreground">{data.label}</span>
                              <span className="font-bold text-foreground">{formatCurrency(data.value, "INR")}</span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Pie
                      data={distribution}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legends details */}
              <div className="flex-1 grid grid-cols-2 gap-3.5 w-full">
                {distribution.map((item) => {
                  const percent = totalCurrentValue > 0 ? (item.value / totalCurrentValue) * 100 : 0;
                  return (
                    <div key={item.type} className="flex items-center gap-2.5 p-2 rounded-lg border border-border/40 bg-muted/10">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-foreground block truncate">{item.label}</span>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          {percent.toFixed(1)}% ({formatCurrency(item.value, "INR")})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Mini Insights Card */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-md flex flex-col justify-center p-6 text-center">
            <TrendingUp className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <h4 className="font-semibold text-sm">Portfolio Health</h4>
            <p className="text-xs text-muted-foreground mt-2 max-w-[220px] mx-auto leading-relaxed">
              {isProfit
                ? "Your portfolio is currently in positive territory. Reinvest returns to compound wealth."
                : "Portfolio is showing absolute decline. Diversify across assets to balance risks."}
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
