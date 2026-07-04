"use client";

// ==============================================
// IncomePage — Full Dashboard & Transaction List
// Features: Stats bar, filters, TanStack Table list,
// add/edit form dialog, detail view panel, CSV import/export.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { IncomeStatsBar } from "@/components/income/income-stats";
import { IncomeFilters } from "@/components/income/income-filters";
import { IncomeTable } from "@/components/income/income-table";
import { IncomeForm } from "@/components/forms/income-form";
import { IncomeDetailSheet } from "@/components/income/income-detail-sheet";
import { CSVHandler } from "@/components/income/csv-handler";

import {
  deleteIncome,
  bulkDeleteIncomes,
  createIncome,
} from "@/app/(dashboard)/income/actions";
import {
  createTag,
  createCategory,
} from "@/app/(dashboard)/expenses/actions";
import {
  clientGetIncomes,
  clientGetIncomeStats,
  clientGetIncomeCategories,
  clientGetAccounts,
  clientGetTags,
} from "@/lib/queries/client-queries";
import type { IncomeFiltersFormValues } from "@/lib/validations/income.schemas";
import type { IncomeWithRelations } from "@/types/database";

export default function IncomePage() {
  const queryClient = useQueryClient();

  // ── States ──────────────────────────────────────
  const [filters, setFilters] = React.useState<Partial<IncomeFiltersFormValues>>({
    page: 1,
    pageSize: 20,
    sortBy: "date",
    sortOrder: "desc",
  });

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingIncome, setEditingIncome] = React.useState<IncomeWithRelations | undefined>(
    undefined
  );

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedIncome, setSelectedIncome] = React.useState<IncomeWithRelations | null>(null);

  // ── Queries ─────────────────────────────────────
  const {
    data: incomesData,
    isLoading: listLoading,
    refetch: refetchIncomes,
  } = useQuery({
    queryKey: ["incomes", filters],
    queryFn: () => clientGetIncomes(filters),
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["income-stats"],
    queryFn: () => clientGetIncomeStats(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["income-categories"],
    queryFn: () => clientGetIncomeCategories(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => clientGetAccounts(),
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => clientGetTags(),
  });

  // ── Mutations ──────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteIncome(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Income deleted successfully");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete income");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await bulkDeleteIncomes(ids);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Selected incomes deleted");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete incomes");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (income: IncomeWithRelations) => {
      const res = await createIncome({
        title: `${income.title} (Copy)`,
        amount: income.amount,
        date: income.date,
        currency: income.currency,
        category_id: income.category_id,
        account_id: income.account_id,
        source: income.source ?? "",
        notes: income.notes ?? "",
        tag_ids: income.tags.map((t) => t.id),
        is_recurring: false,
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Income duplicated");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to duplicate income");
    },
  });

  const inlineTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await createTag(name);
      if (!res.ok) throw new Error(res.error);
      return res.data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const inlineCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await createCategory(name, "income", "💼", "hsl(142, 71%, 45%)");
      if (!res.ok) throw new Error(res.error);
      return res.data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["income-categories"] });
    },
  });

  // ── Helpers ────────────────────────────────────
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["incomes"] });
    void queryClient.invalidateQueries({ queryKey: ["income-stats"] });
  };

  const handleEdit = (income: IncomeWithRelations) => {
    setEditingIncome(income);
    setFormOpen(true);
  };

  const handleView = (income: IncomeWithRelations) => {
    setSelectedIncome(income);
    setDetailOpen(true);
  };

  const handleAddClick = () => {
    setEditingIncome(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-500" />
            Incomes & Inflow
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and monitor salaries, dividends, freelance projects, and other income streams.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* CSV handler */}
          <CSVHandler filters={filters} onSuccess={invalidateAll} />

          {/* Add Income Button */}
          <Button onClick={handleAddClick} size="sm" className="gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : statsData ? (
        <IncomeStatsBar stats={statsData} />
      ) : null}

      {/* Filters Control */}
      <IncomeFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        accounts={accounts}
      />

      {/* Income List Table */}
      {listLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-8 w-28" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : incomesData ? (
        <IncomeTable
          data={incomesData.data}
          totalCount={incomesData.count}
          filters={filters}
          onFiltersChange={setFilters}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={(id) => deleteMutation.mutate(id)}
          onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
          onDuplicate={(inc) => duplicateMutation.mutate(inc)}
        />
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
          Failed to load incomes.
        </div>
      )}

      {/* Add / Edit Income Drawer Form */}
      <IncomeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        income={editingIncome}
        categories={categories}
        accounts={accounts}
        tags={tags}
        onSuccess={invalidateAll}
        onTagCreated={async (name) => inlineTagMutation.mutateAsync(name)}
        onCategoryCreated={async (name) => inlineCategoryMutation.mutateAsync(name)}
      />

      {/* View Detail Panel Drawer */}
      <IncomeDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        income={selectedIncome}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
