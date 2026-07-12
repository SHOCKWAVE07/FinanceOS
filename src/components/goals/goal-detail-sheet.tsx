"use client";

// ==============================================
// GoalDetailSheet — Deep view of a financial goal
// Details of savings target, allocations, and linked assets.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import { Calendar, Link2, Coins, Landmark, CheckCircle2, Circle } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { GoalWithStats } from "@/app/(dashboard)/goals/actions";

interface GoalDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalWithStats;
  onSuccess?: () => void;
  onToggleStatus: (goal: GoalWithStats) => void;
}

export function GoalDetailSheet({ open, onOpenChange, goal, onToggleStatus }: GoalDetailSheetProps) {
  if (!goal) return null;

  const PRIORITY_BADGES: Record<string, string> = {
    low: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    critical: "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse",
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

  const isCompleted = goal.status === "completed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl border-l border-border bg-card/95 backdrop-blur-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${PRIORITY_BADGES[goal.priority]}`}>
              {goal.priority}
            </span>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase">
              {CATEGORY_LABELS[goal.category] || goal.category}
            </span>
            <span className={`text-[10px] border px-2 py-0.5 rounded font-bold uppercase ${
              isCompleted 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-muted text-muted-foreground border-border"
            }`}>
              {goal.status}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold mt-2">{goal.name}</SheetTitle>
          {goal.description && (
            <SheetDescription className="text-sm text-muted-foreground mt-1">
              {goal.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <Separator />

        {/* Form Content body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Target Value and Progress */}
          <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aggregate Savings Progress</span>
            <div className="flex items-end justify-between font-mono">
              <span className="text-2xl font-bold text-emerald-500">{formatCurrency(goal.total_saved, "INR")}</span>
              <span className="text-xs text-muted-foreground">
                of <span className="font-semibold text-foreground">{formatCurrency(goal.target_amount, "INR")}</span> ({goal.progress_percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="relative w-full py-2">
              <div className="relative h-2.5 w-full rounded-full bg-muted-foreground/15 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Target Date: {format(new Date(goal.target_date), "dd MMMM yyyy")}
              </span>
            </div>
          </div>

          {/* Savings Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-primary" /> Savings Breakdown
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="text-[10px] text-muted-foreground">Manual Cash / Direct Savings</span>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatCurrency(goal.manual_savings, "INR")}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3 space-y-1">
                <span className="text-[10px] text-muted-foreground">Linked Portfolio Value</span>
                <div className="text-sm font-mono font-bold text-foreground">
                  {formatCurrency(goal.total_saved - goal.manual_savings, "INR")}
                </div>
              </div>
            </div>
          </div>

          {/* Linked investments List */}
          {goal.linked_investments.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" /> Linked Portfolio Assets
              </h4>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border">
                  {goal.linked_investments.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{inv.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Landmark className="h-3 w-3" /> {inv.institution} • Share: {inv.allocated_share}%
                        </div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="font-mono font-bold text-foreground">
                          {formatCurrency(inv.allocated_value, "INR")}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-mono">
                          Total Asset: {formatCurrency(inv.current_value, "INR")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-2 bg-muted/5">
          <Button 
            onClick={() => onToggleStatus(goal)} 
            variant="outline" 
            size="sm" 
            className={`h-9 text-xs gap-1.5 transition-colors ${
              isCompleted 
                ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600" 
                : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/5 border-border"
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark Complete
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close Details
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
