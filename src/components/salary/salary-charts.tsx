"use client";

// ==============================================
// SalaryCharts — Phase 3
// Recharts bar chart showing monthly salary credits (Gross vs Net).
// ==============================================

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { SalaryStats } from "@/app/(dashboard)/salary/actions";

interface SalaryChartsProps {
  stats: SalaryStats;
}

export function SalaryCharts({ stats }: SalaryChartsProps) {
  const { chartData } = stats;

  if (chartData.length === 0) {
    return (
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
          Record your monthly payslips to visualize earnings over time.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Salary Credit Trends</CardTitle>
        <CardDescription>Visualizing monthly gross earnings vs net take-home salary.</CardDescription>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-border bg-popover p-3 shadow-md space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">{payload[0].payload.month}</p>
                      <div className="space-y-1 font-mono text-xs">
                        <p className="text-foreground">
                          Gross: <span className="font-bold">{formatCurrency(payload[0].value as number, "INR")}</span>
                        </p>
                        <p className="text-emerald-500">
                          Net: <span className="font-bold">{formatCurrency(payload[1].value as number, "INR")}</span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
            <Bar dataKey="gross" name="Gross Salary" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
            <Bar dataKey="net" name="Net Salary" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
