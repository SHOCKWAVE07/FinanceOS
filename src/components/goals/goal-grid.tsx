"use client";

// ==============================================
// GoalGrid — Displays financial goals as beautiful
// status grid cards.
// ==============================================

import * as React from "react";
import { Target, Calendar, Award, Trash, Edit, Link2, Coins, Eye, CheckCircle2, Circle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { GoalWithStats } from "@/app/(dashboard)/goals/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GoalGridProps {
  data: GoalWithStats[];
  onEdit: (goal: GoalWithStats) => void;
  onDelete: (id: string) => void;
  onViewDetails: (goal: GoalWithStats) => void;
  onToggleStatus: (goal: GoalWithStats) => void;
}

export function GoalGrid({ data, onEdit, onDelete, onViewDetails, onToggleStatus }: GoalGridProps) {
  const PRIORITY_BADGES: Record<string, string> = {
    low: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    critical: "bg-red-500/10 text-red-400 border border-red-500/20",
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

  if (data.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/25 p-8 text-center text-sm text-muted-foreground">
        <Target className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <p className="font-semibold text-foreground">No financial goals found</p>
        <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">
          Define your savings targets, link investment portfolios, and track progress.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((goal) => {
        const isCompleted = goal.status === "completed";

        return (
          <Card key={goal.id} className="border-border bg-card/30 hover:bg-card/50 backdrop-blur-sm transition-all duration-300 flex flex-col justify-between overflow-hidden group">
            <div>
              {/* Card Header */}
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {CATEGORY_LABELS[goal.category] || goal.category}
                    </span>
                    <CardTitle className="text-base font-bold truncate text-foreground group-hover:text-primary transition-colors pt-1">
                      {goal.name}
                    </CardTitle>
                  </div>
                  
                  {/* Actions Dropdown / Quick Buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono ${PRIORITY_BADGES[goal.priority]}`}>
                      {goal.priority}
                    </span>
                  </div>
                </div>
                {goal.description && (
                  <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {goal.description}
                  </CardDescription>
                )}
              </CardHeader>

              {/* Card Content (Progress and Stats) */}
              <CardContent className="px-5 py-2 space-y-4">
                {/* Progress Stats */}
                <div className="space-y-1.5">
                  <div className="flex items-end justify-between font-mono">
                    <span className="text-sm font-bold text-emerald-500">
                      {formatCurrency(goal.total_saved, "INR")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      of <span className="font-semibold text-foreground">{formatCurrency(goal.target_amount, "INR")}</span> ({goal.progress_percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="relative w-full py-1">
                    <div className="relative h-1.5 w-full rounded-full bg-muted-foreground/10 overflow-visible">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Linking and breakdown stats */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    <span>Direct: {formatCurrency(goal.manual_savings, "INR")}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Link2 className="h-3 w-3" />
                    <span>{goal.linked_investments_count} Assets linked</span>
                  </div>
                </div>
              </CardContent>
            </div>

            {/* Card Footer Actions */}
            <CardFooter className="p-4 bg-muted/5 border-t border-border flex items-center justify-between gap-2 mt-4">
              <div className="flex items-center gap-1.5">
                <Button 
                  onClick={() => onViewDetails(goal)} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Details
                </Button>

                <Button 
                  onClick={() => onToggleStatus(goal)} 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 text-xs gap-1.5 transition-colors ${
                    isCompleted 
                      ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" 
                      : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5"
                  }`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Circle className="h-3.5 w-3.5" />
                      Mark Complete
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button onClick={() => onEdit(goal)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button onClick={() => onDelete(goal.id)} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
