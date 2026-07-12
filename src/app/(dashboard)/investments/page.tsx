"use client";

// ==============================================
// Investments Dashboard — Phase 4
// Combines Stats, Charts, holding list, and forms.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentStats } from "@/components/investments/investment-stats";
import { InvestmentFilters } from "@/components/investments/investment-filters";
import { InvestmentTable } from "@/components/investments/investment-table";
import { InvestmentForm } from "@/components/forms/investment-form";
import { ValuationForm } from "@/components/forms/valuation-form";
import { InvestmentDetailSheet } from "@/components/investments/investment-detail-sheet";

import { getInvestments, getInvestmentStats, deleteInvestment } from "@/app/(dashboard)/investments/actions";
import { createClient } from "@/lib/supabase/client";
import type { Investment } from "@/types/database";

export default function InvestmentsPage() {
  const queryClient = useQueryClient();

  // Fetch accounts list
  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch investment categories list
  const { data: categories = [] } = useQuery({
    queryKey: ["investment-categories"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "investment")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Search & Filter State
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("all");

  // Dialog / Sheet states
  const [formOpen, setFormOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<Investment | undefined>(undefined);
  
  const [valOpen, setValOpen] = React.useState(false);
  const [valItem, setValItem] = React.useState<Investment | undefined>(undefined);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailItem, setDetailItem] = React.useState<Investment | undefined>(undefined);

  // Debounced search to avoid excessive database calls
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch investments list
  const { data: listResult, isLoading: isListLoading } = useQuery({
    queryKey: ["investments", debouncedSearch, type],
    queryFn: () => getInvestments({ search: debouncedSearch, type, pageSize: 100 }),
  });

  // Fetch summary stats
  const { data: statsResult, isLoading: isStatsLoading } = useQuery({
    queryKey: ["investment-stats"],
    queryFn: () => getInvestmentStats(),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteInvestment,
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Investment asset deleted");
        queryClient.invalidateQueries({ queryKey: ["investments"] });
        queryClient.invalidateQueries({ queryKey: ["investment-stats"] });
      } else {
        toast.error(res.error ?? "Failed to delete asset");
      }
    },
  });

  const handleEdit = (item: Investment) => {
    setSelectedItem(item);
    setFormOpen(true);
  };

  const handleAddValuation = (item: Investment) => {
    setValItem(item);
    setValOpen(true);
  };

  const handleViewHistory = (item: Investment) => {
    setDetailItem(item);
    setDetailOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this investment asset?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["investments"] });
    queryClient.invalidateQueries({ queryKey: ["investment-stats"] });
  };

  const clearFilters = () => {
    setSearch("");
    setType("all");
  };

  const holdings = listResult?.ok ? listResult.data.data : [];
  const stats = statsResult?.ok ? statsResult.data : null;

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Investments</h2>
          <p className="text-muted-foreground text-sm">
            Track net worth growth, asset allocation, and historical portfolio returns.
          </p>
        </div>
        <Button onClick={() => { setSelectedItem(undefined); setFormOpen(true); }} className="bg-primary text-primary-foreground gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Stats section */}
      {isStatsLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : stats ? (
        <InvestmentStats stats={stats} />
      ) : null}

      {/* Filter Options */}
      <InvestmentFilters
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        onClear={clearFilters}
        categories={categories}
      />

      {/* Asset Grid / Table */}
      {isListLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : (
        <InvestmentTable
          data={holdings}
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewHistory={handleViewHistory}
          onAddValuation={handleAddValuation}
        />
      )}

      {/* Sheet Forms */}
      <InvestmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        investment={selectedItem}
        accounts={accounts}
        categories={categories}
        onSuccess={handleFormSuccess}
      />

      <ValuationForm
        open={valOpen}
        onOpenChange={setValOpen}
        investment={valItem}
        accounts={accounts}
        onSuccess={handleFormSuccess}
      />

      <InvestmentDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        investment={detailItem}
      />
    </div>
  );
}
