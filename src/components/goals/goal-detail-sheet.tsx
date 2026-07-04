"use client";

// ==============================================
// GoalDetailSheet — Deep view of a financial goal
// Milestones roadmap, checklist toggles, and linked
// asset allocations.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Award, Trash, Edit, CheckCircle2, Circle, Plus, Link2, Coins, Landmark } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";
import type { GoalWithStats } from "@/app/(dashboard)/goals/actions";
import { toggleMilestone, deleteMilestone } from "@/app/(dashboard)/goals/actions";
import { MilestoneForm } from "@/components/forms/milestone-form";
import type { Milestone } from "@/types/database";

interface GoalDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalWithStats;
  onSuccess?: () => void;
}

export function GoalDetailSheet({ open, onOpenChange, goal, onSuccess }: GoalDetailSheetProps) {
  const queryClient = useQueryClient();
  const [milestoneFormOpen, setMilestoneFormOpen] = React.useState(false);
  const [selectedMilestone, setSelectedMilestone] = React.useState<Milestone | undefined>(undefined);

  // Toggle Milestone Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      toggleMilestone(id, isCompleted),
    onSuccess: (res) => {
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
        onSuccess?.();
      } else {
        toast.error(res.error ?? "Failed to toggle milestone status");
      }
    },
  });

  // Delete Milestone Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMilestone,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Milestone deleted");
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
        onSuccess?.();
      } else {
        toast.error(res.error ?? "Failed to delete milestone");
      }
    },
  });

  if (!goal) return null;

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isCompleted: !currentStatus });
  };

  const handleEditMilestone = (m: Milestone) => {
    setSelectedMilestone(m);
    setMilestoneFormOpen(true);
  };

  const handleDeleteMilestone = (id: string) => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddMilestone = () => {
    setSelectedMilestone(undefined);
    setMilestoneFormOpen(true);
  };

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

  return (
    <>
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
              <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded font-bold uppercase">
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Roadmap Progress</span>
              <div className="flex items-end justify-between font-mono">
                <span className="text-2xl font-bold text-emerald-500">{formatCurrency(goal.total_saved, "INR")}</span>
                <span className="text-xs text-muted-foreground">
                  of <span className="font-semibold text-foreground">{formatCurrency(goal.target_amount, "INR")}</span> ({goal.progress_percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted-foreground/15 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${goal.progress_percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Target Date: {format(new Date(goal.target_date), "dd MMMM yyyy")}
                </span>
                <span>
                  {goal.completed_milestones_count} of {goal.milestones_count} Milestones Achieved
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

            {/* Milestones Checklist Roadmap */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-500" /> Milestones Roadmap
                </h4>
                <Button onClick={handleAddMilestone} variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary/80">
                  <Plus className="h-3.5 w-3.5" /> Add Milestone
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {goal.milestones.length > 0 ? (
                  <div className="divide-y divide-border">
                    {goal.milestones.map((m) => (
                      <div key={m.id} className={`flex items-center justify-between p-3.5 transition-all ${
                        m.is_completed ? "bg-emerald-500/5" : ""
                      }`}>
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={m.is_completed}
                            onCheckedChange={() => handleToggle(m.id, m.is_completed)}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className={`text-xs font-semibold truncate ${
                              m.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                            }`}>
                              {m.name}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground">
                              {m.target_amount && (
                                <span className="font-mono font-medium text-foreground">
                                  Val: {formatCurrency(m.target_amount, "INR")}
                                </span>
                              )}
                              {m.target_amount && m.target_date && <span>•</span>}
                              {m.target_date && (
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3" /> Due {format(new Date(m.target_date), "dd MMM yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 ml-4">
                          <Button onClick={() => handleEditMilestone(m)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => handleDeleteMilestone(m.id)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <p>No intermediate milestones mapped for this goal.</p>
                    <Button onClick={handleAddMilestone} variant="outline" size="sm" className="h-8 text-xs">
                      Add First Milestone
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close Dashboard
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Milestone Form Sheet */}
      <MilestoneForm
        open={milestoneFormOpen}
        onOpenChange={setMilestoneFormOpen}
        goalId={goal.id}
        milestone={selectedMilestone}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["goals"] });
          queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
          onSuccess?.();
        }}
      />
    </>
  );
}
