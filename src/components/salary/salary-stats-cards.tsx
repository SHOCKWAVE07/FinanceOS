"use client";

// ==============================================
// SalaryStatsCards — Phase 3
// UI cards for Salary & Appraisal dashboard stats.
// ==============================================

import * as React from "react";
import { Briefcase, TrendingUp, DollarSign, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { SalaryStats } from "@/app/(dashboard)/salary/actions";

interface SalaryStatsCardsProps {
  stats: SalaryStats;
}

export function SalaryStatsCards({ stats }: SalaryStatsCardsProps) {
  const {
    latestGrossSalary,
    latestNetSalary,
    latestDesignation,
    latestCompany,
    totalHikesCount,
    averageHikePercent,
  } = stats;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Latest Take Home */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Latest Net Salary
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-emerald-500 font-mono">
              {formatCurrency(latestNetSalary, "INR")}
            </h3>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>Monthly cash in-hand credit</span>
          </div>
        </CardContent>
      </Card>

      {/* Latest Gross */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Latest Gross Salary
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {formatCurrency(latestGrossSalary, "INR")}
            </h3>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>Before deductions / taxes</span>
          </div>
        </CardContent>
      </Card>

      {/* Current Job Role */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Current Employment
            </span>
            <h3 className="text-lg font-bold tracking-tight text-foreground truncate max-w-[200px]">
              {latestDesignation || "Not Recorded"}
            </h3>
          </div>
          <div className="mt-2 text-xs text-muted-foreground truncate max-w-[200px]">
            {latestCompany ? `@ ${latestCompany}` : "No company listed"}
          </div>
        </CardContent>
      </Card>

      {/* Total Hike Summary */}
      <Card className="border-border/60 bg-gradient-to-br from-card/80 to-card/20 backdrop-blur-md">
        <CardContent className="p-5 flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Appraisals History
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-foreground flex items-baseline gap-1">
              <span>{totalHikesCount}</span>
              <span className="text-xs font-medium text-muted-foreground">hike{totalHikesCount !== 1 ? "s" : ""}</span>
            </h3>
          </div>
          <div className="mt-2 text-xs text-emerald-500 font-semibold flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>Avg hike: +{averageHikePercent.toFixed(1)}%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
