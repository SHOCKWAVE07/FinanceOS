"use client";

// ==============================================
// AppraisalsList — Phase 3
// Vertical timeline showing career progression & hikes.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import { Edit2, Trash, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { SalaryAppraisal } from "@/types/database";

interface AppraisalsListProps {
  data: SalaryAppraisal[];
  onEdit: (appraisal: SalaryAppraisal) => void;
  onDelete: (id: string) => void;
}

export function AppraisalsList({ data, onEdit, onDelete }: AppraisalsListProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground bg-card/10">
        No salary appraisals recorded. Track hikes and role transitions here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((appraisal, index) => {
        const hikePercent = appraisal.percentage_hike;
        const hikeAmount = appraisal.new_gross_salary - appraisal.previous_gross_salary;
        const dateStr = format(new Date(appraisal.effective_date), "dd MMM yyyy");

        return (
          <div key={appraisal.id} className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-0.5 before:bg-border/60 last:before:hidden">
            {/* Timeline dot */}
            <div className="absolute left-1.5 top-2.5 h-2.5 w-2.5 rounded-full border border-emerald-500 bg-background" />

            <Card className="border-border/60 bg-gradient-to-br from-card/85 to-card/30 hover:to-card/50 transition-all duration-300">
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      {appraisal.designation}
                    </h4>
                    <span className="text-xs text-muted-foreground">at {appraisal.company}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {dateStr}
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                      <TrendingUp className="h-3.5 w-3.5" />
                      +{hikePercent.toFixed(1)}% hike
                    </span>
                  </div>

                  {appraisal.notes && (
                    <p className="text-xs text-muted-foreground/80 mt-1 italic max-w-md">
                      "{appraisal.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                  <div className="font-mono text-right">
                    <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                      <span>{formatCurrency(appraisal.previous_gross_salary, "INR")}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span className="font-semibold text-foreground">{formatCurrency(appraisal.new_gross_salary, "INR")}</span>
                    </div>
                    <span className="text-xs text-emerald-500 font-semibold block">
                      +{formatCurrency(hikeAmount, "INR")} / month
                    </span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-border/60 pl-3">
                    <Button variant="ghost" size="icon-xs" onClick={() => onEdit(appraisal)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-xs" className="hover:text-destructive" onClick={() => onDelete(appraisal.id)}>
                      <Trash className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
