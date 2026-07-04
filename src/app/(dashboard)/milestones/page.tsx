"use client";

// ==============================================
// MilestonesDashboard — Phase 5
// Consolidated view of all roadmaps and milestone checklists
// across all financial goals.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, CheckCircle2, Circle, Calendar, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

import { getGoals, toggleMilestone, deleteMilestone } from "@/app/(dashboard)/goals/actions";

export default function MilestonesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("pending");

  // Fetch goals (which contains milestones)
  const { data: result, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => getGoals(),
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      toggleMilestone(id, isCompleted),
    onSuccess: (res) => {
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
      } else {
        toast.error(res.error ?? "Failed to update milestone status");
      }
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMilestone,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Milestone deleted");
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
      } else {
        toast.error(res.error ?? "Failed to delete milestone");
      }
    },
  });

  const goals = result?.ok ? result.data : [];

  // Extract all milestones and link back to goals
  const allMilestones = React.useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      target_amount: number | null;
      target_date: string | null;
      is_completed: boolean;
      completed_at: string | null;
      goalId: string;
      goalName: string;
      goalCategory: string;
    }> = [];

    goals.forEach((g) => {
      g.milestones.forEach((m) => {
        list.push({
          ...m,
          goalId: g.id,
          goalName: g.name,
          goalCategory: g.category,
        });
      });
    });

    return list;
  }, [goals]);

  // Statistics
  const totalCount = allMilestones.length;
  const completedCount = allMilestones.filter((m) => m.is_completed).length;
  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Filtered milestones list
  const filteredMilestones = React.useMemo(() => {
    if (activeTab === "pending") {
      return allMilestones.filter((m) => !m.is_completed).sort((a, b) => {
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      });
    }
    if (activeTab === "completed") {
      return allMilestones.filter((m) => m.is_completed).sort((a, b) => {
        if (!a.completed_at) return 1;
        if (!b.completed_at) return -1;
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      });
    }
    // All
    return allMilestones.sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
    });
  }, [allMilestones, activeTab]);

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isCompleted: !currentStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this milestone?")) {
      deleteMutation.mutate(id);
    }
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
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Milestones Roadmap</h2>
          <p className="text-muted-foreground text-sm">
            Consolidated overview of all intermediate targets and roadmap items across your active financial goals.
          </p>
        </div>
        <Link href="/goals">
          <Button className="bg-primary text-primary-foreground gap-1.5 shadow-sm">
            Go to Goals
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Milestone stats */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Completion rate card */}
            <Card className="border-border bg-card/50 backdrop-blur-sm md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Roadmap Achievement Rate
                </CardTitle>
                <Trophy className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="pt-2 space-y-3">
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-bold font-mono text-amber-500">
                    {completionRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {completedCount} of {totalCount} milestones completed
                  </div>
                </div>
                <Progress value={completionRate} className="h-1.5 bg-muted-foreground/10" />
              </CardContent>
            </Card>

            {/* Pending card */}
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Roadmap Items
                </CardTitle>
                <Flag className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-2xl font-bold font-mono">
                  {pendingCount} <span className="text-xs font-normal text-muted-foreground">remaining</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Keep checking milestones off to power your goals progress!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Roadmap list tabbed */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList className="bg-muted/15 border border-border">
                <TabsTrigger value="pending" className="data-[state=active]:bg-background">Pending</TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-background">Completed</TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-background">All Items</TabsTrigger>
              </TabsList>
              <span className="text-xs text-muted-foreground font-mono">
                {filteredMilestones.length} shown
              </span>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <Card className="border-border bg-card/25 backdrop-blur-sm overflow-hidden">
                {filteredMilestones.length > 0 ? (
                  <div className="divide-y divide-border">
                    {filteredMilestones.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-4 transition-all hover:bg-muted/5 ${
                          m.is_completed ? "bg-emerald-500/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <Checkbox
                            checked={m.is_completed}
                            onCheckedChange={() => handleToggle(m.id, m.is_completed)}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 min-w-0">
                            <div className={`text-sm font-semibold truncate ${
                              m.is_completed ? "line-through text-muted-foreground" : "text-foreground"
                            }`}>
                              {m.name}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.25 rounded">
                                {CATEGORY_LABELS[m.goalCategory] || m.goalCategory}
                              </span>
                              <span className="text-muted-foreground">
                                Goal: <Link href="/goals" className="underline hover:text-foreground font-medium">{m.goalName}</Link>
                              </span>
                              {m.target_amount && (
                                <span className="font-mono text-foreground">
                                  • Target: {formatCurrency(m.target_amount, "INR")}
                                </span>
                              )}
                              {m.target_date && (
                                <span className="flex items-center gap-0.5">
                                  • <Calendar className="h-3 w-3" /> Due {format(new Date(m.target_date), "dd MMM yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {m.is_completed && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              <Sparkles className="h-3 w-3" /> Achieved
                            </span>
                          )}
                          <Button
                            onClick={() => handleDelete(m.id)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
                    <p>No roadmap milestones found for this filter.</p>
                    <Link href="/goals">
                      <Button variant="outline" size="sm" className="mt-2 text-xs">
                        Define Goals & Milestones
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
