"use client";

// ==============================================
// RecurringRulesPage — Management of recurring
// transactions, frequencies, and scheduling.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, Play, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import {
  getRecurringRules,
  deleteRecurringRule,
  toggleRecurringRuleActive,
  processRecurringExpenses,
} from "@/app/(dashboard)/expenses/actions";
import { formatCurrency } from "@/lib/utils";

export default function RecurringRulesPage() {
  const queryClient = useQueryClient();

  // ── Queries ─────────────────────────────────────
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["recurring-rules"],
    queryFn: async () => {
      const res = await getRecurringRules();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  // ── Mutations ──────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await toggleRecurringRuleActive(id, active);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Rule status updated");
      void queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteRecurringRule(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Recurring rule deleted");
      void queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete rule");
    },
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      const res = await processRecurringExpenses();
      if (!res.ok) throw new Error(res.error);
      return res.data.created;
    },
    onSuccess: (createdCount) => {
      if (createdCount > 0) {
        toast.success(`Processed recurring rules: generated ${createdCount} new expenses`);
      } else {
        toast.info("No recurring expenses were due today");
      }
      void queryClient.invalidateQueries({ queryKey: ["recurring-rules"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to process rules");
    },
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Back to expenses & Header */}
      <div className="space-y-2">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Expenses
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-primary" />
              Recurring Rules
            </h1>
            <p className="text-sm text-muted-foreground">
              Define schedules for expenses that repeat automatically (rent, subscriptions, etc.)
            </p>
          </div>

          <Button
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
            size="sm"
            className="gap-1.5 shadow-sm"
          >
            {processMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Process Rules
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rules.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Active</TableHead>
                <TableHead>Rule Title</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Checkbox
                      checked={rule.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: rule.id, active: !!checked })
                      }
                      aria-label="Toggle rule active status"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                        {rule.title}
                      </span>
                      {rule.notes && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          {rule.notes}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-xs font-mono text-muted-foreground">
                    {rule.frequency} {rule.interval_count > 1 ? `(every ${rule.interval_count})` : ""}
                  </TableCell>
                  <TableCell>
                    {/* Category */}
                    {(rule as any).category ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 py-0.5 font-normal text-xs"
                        style={
                          (rule as any).category.color
                            ? {
                                borderColor: (rule as any).category.color,
                                color: (rule as any).category.color,
                              }
                            : undefined
                        }
                      >
                        <span>{(rule as any).category.icon}</span>
                        <span>{(rule as any).category.name}</span>
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-muted-foreground">
                    {(rule as any).account?.name ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(rule.next_due_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-right">
                    {formatCurrency(rule.amount, rule.currency)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this recurring rule?")) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                      title="Delete rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-16 border rounded-xl bg-card/20 border-border/80">
          <p className="text-sm text-muted-foreground">No recurring rules configured yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            You can configure recurring options when adding or editing an expense.
          </p>
        </div>
      )}
    </div>
  );
}
