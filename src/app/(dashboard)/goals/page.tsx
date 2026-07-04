"use client";

// ==============================================
// GoalsDashboard — Phase 5
// Fully integrated goals and milestones tracking page.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalStats } from "@/components/goals/goal-stats";
import { GoalFilters } from "@/components/goals/goal-filters";
import { GoalGrid } from "@/components/goals/goal-grid";
import { GoalForm } from "@/components/forms/goal-form";
import { GoalDetailSheet } from "@/components/goals/goal-detail-sheet";

import { getGoals, getGoalStats, deleteGoal, type GoalWithStats } from "@/app/(dashboard)/goals/actions";

export default function GoalsPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  // Form sheet state
  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<GoalWithStats | undefined>(undefined);

  // Detail sheet state
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailGoal, setDetailGoal] = React.useState<GoalWithStats | undefined>(undefined);

  // Debounced search to avoid excessive compute / renders
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch goals
  const { data: goalsResult, isLoading: isGoalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => getGoals(),
  });

  // Fetch stats
  const { data: statsResult, isLoading: isStatsLoading } = useQuery({
    queryKey: ["goal-stats"],
    queryFn: () => getGoalStats(),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Financial goal deleted");
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
      } else {
        toast.error(res.error ?? "Failed to delete financial goal");
      }
    },
  });

  const goalsList = goalsResult?.ok ? goalsResult.data : [];
  const stats = statsResult?.ok ? statsResult.data : null;

  // Filter goals client-side for immediate responsiveness
  const filteredGoals = React.useMemo(() => {
    return goalsList.filter((g) => {
      const matchesSearch =
        g.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const matchesCategory = category === "all" || g.category === category;
      const matchesStatus = status === "all" || g.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [goalsList, debouncedSearch, category, status]);

  const handleEdit = (goal: GoalWithStats) => {
    setSelectedGoal(goal);
    setFormOpen(true);
  };

  const handleViewDetails = (goal: GoalWithStats) => {
    setDetailGoal(goal);
    setDetailOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this financial goal? All linked milestones will be deleted.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["goals"] });
    queryClient.invalidateQueries({ queryKey: ["goal-stats"] });
    
    // Also update detail sheet reference if active
    if (detailGoal) {
      const updated = goalsList.find((g) => g.id === detailGoal.id);
      if (updated) setDetailGoal(updated);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setStatus("all");
  };

  // Sync details sheet when goalsList changes in the background
  React.useEffect(() => {
    if (detailGoal && goalsList.length > 0) {
      const freshData = goalsList.find((g) => g.id === detailGoal.id);
      if (freshData) {
        setDetailGoal(freshData);
      }
    }
  }, [goalsList, detailGoal]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
          <p className="text-muted-foreground text-sm">
            Map out your future. Set long-term financial targets, link investments, and schedule milestones.
          </p>
        </div>
        <Button onClick={() => { setSelectedGoal(undefined); setFormOpen(true); }} className="bg-primary text-primary-foreground gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          Create Goal
        </Button>
      </div>

      {/* Stats Dashboard */}
      {isStatsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 md:col-span-2 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : stats ? (
        <GoalStats stats={stats} />
      ) : null}

      {/* Filters */}
      <GoalFilters
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        status={status}
        onStatusChange={setStatus}
        onClear={clearFilters}
      />

      {/* Goals Grid */}
      {isGoalsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : (
        <GoalGrid
          data={filteredGoals}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Sheet Forms */}
      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={selectedGoal}
        onSuccess={handleFormSuccess}
      />

      <GoalDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        goal={detailGoal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
