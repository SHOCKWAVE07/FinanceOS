"use client";

// ==============================================
// ExpensesPage — Full Dashboard & Transaction List
// Features: Stats bar, filters, TanStack Table list,
// add/edit form dialog, detail view panel, CSV import/export.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, RefreshCw, Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ExpenseStatsBar } from "@/components/expenses/expense-stats";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseTable } from "@/components/expenses/expense-table";
import { ExpenseForm } from "@/components/forms/expense-form";
import { ExpenseDetailSheet } from "@/components/expenses/expense-detail-sheet";
import { CSVHandler } from "@/components/expenses/csv-handler";

import {
  getExpenses,
  deleteExpense,
  bulkDeleteExpenses,
  createExpense,
  getCategories,
  getAccounts,
  getTags,
  createTag,
  createCategory,
  getExpenseStats,
} from "@/app/(dashboard)/expenses/actions";
import type { ExpenseFiltersFormValues } from "@/lib/validations/expense.schemas";
import type { ExpenseWithRelations } from "@/types/database";

export default function ExpensesPage() {
  const queryClient = useQueryClient();

  // ── States ──────────────────────────────────────
  const [filters, setFilters] = React.useState<Partial<ExpenseFiltersFormValues>>({
    page: 1,
    pageSize: 20,
    sortBy: "date",
    sortOrder: "desc",
  });

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<ExpenseWithRelations | undefined>(
    undefined
  );

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<ExpenseWithRelations | null>(null);

  // ── Queries ─────────────────────────────────────
  const {
    data: expensesData,
    isLoading: listLoading,
    isPlaceholderData: listPlaceholder,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      const res = await getExpenses(filters);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["expense-stats"],
    queryFn: async () => {
      const res = await getExpenseStats();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await getCategories();
      return res.ok && res.data ? res.data : [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await getAccounts();
      return res.ok && res.data ? res.data : [];
    },
  });

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await getTags();
      return res.ok && res.data ? res.data : [];
    },
  });

  // ── Mutations ──────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteExpense(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete expense");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await bulkDeleteExpenses(ids);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Selected expenses deleted");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete expenses");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (expense: ExpenseWithRelations) => {
      const res = await createExpense({
        title: `${expense.title} (Copy)`,
        amount: expense.amount,
        date: expense.date,
        currency: expense.currency,
        category_id: expense.category_id,
        account_id: expense.account_id,
        merchant: expense.merchant ?? "",
        notes: expense.notes ?? "",
        tag_ids: expense.tags.map((t) => t.id),
        is_reimbursable: expense.is_reimbursable,
        is_reimbursed: false,
        is_recurring: false,
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Expense duplicated");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to duplicate expense");
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
      const res = await createCategory(name, "expense");
      if (!res.ok) throw new Error(res.error);
      return res.data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // ── Helpers ────────────────────────────────────
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["expenses"] });
    void queryClient.invalidateQueries({ queryKey: ["expense-stats"] });
  };

  const handleEdit = (expense: ExpenseWithRelations) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  const handleView = (expense: ExpenseWithRelations) => {
    setSelectedExpense(expense);
    setDetailOpen(true);
  };

  const handleAddClick = () => {
    setEditingExpense(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Expenses
          </h1>
          <p className="text-sm text-muted-foreground">
            View, filter, and manage your day-to-day transactions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* CSV handler */}
          <CSVHandler filters={filters} onSuccess={invalidateAll} />

          {/* Add Expense Button */}
          <Button onClick={handleAddClick} size="sm" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Expense
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
        <ExpenseStatsBar stats={statsData} />
      ) : null}

      {/* Filters Control */}
      <ExpenseFilters
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        accounts={accounts}
      />

      {/* Expense List Table */}
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
      ) : expensesData ? (
        <ExpenseTable
          data={expensesData.data}
          totalCount={expensesData.count}
          filters={filters}
          onFiltersChange={setFilters}
          onEdit={handleEdit}
          onView={handleView}
          onDelete={(id) => deleteMutation.mutate(id)}
          onBulkDelete={(ids) => bulkDeleteMutation.mutate(ids)}
          onDuplicate={(exp) => duplicateMutation.mutate(exp)}
        />
      ) : (
        <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
          Failed to load expenses.
        </div>
      )}

      {/* Add / Edit Expense Drawer Form */}
      <ExpenseForm
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editingExpense}
        categories={categories}
        accounts={accounts}
        tags={tags}
        onSuccess={invalidateAll}
        onTagCreated={async (name) => inlineTagMutation.mutateAsync(name)}
        onCategoryCreated={async (name) => inlineCategoryMutation.mutateAsync(name)}
      />

      {/* View Detail Panel Drawer */}
      <ExpenseDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        expense={selectedExpense}
        onEdit={handleEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  );
}
