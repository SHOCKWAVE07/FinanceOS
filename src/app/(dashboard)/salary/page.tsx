"use client";

// ==============================================
// SalaryPage — Salary History & Appraisals Dashboard
// React Query integration for robust mutations.
// ==============================================

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Award, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SalaryStatsCards } from "@/components/salary/salary-stats-cards";
import { PayslipsTable } from "@/components/salary/payslips-table";
import { AppraisalsList } from "@/components/salary/appraisals-list";

import { SalaryRecordForm } from "@/components/forms/salary-record-form";
import { SalaryAppraisalForm } from "@/components/forms/salary-appraisal-form";

import {
  deleteSalaryRecord,
  deleteSalaryAppraisal,
  type SalaryStats,
} from "@/app/(dashboard)/salary/actions";
import { createClient } from "@/lib/supabase/client";
import type { SalaryRecord, SalaryAppraisal } from "@/types/database";
import dynamic from "next/dynamic";

const SalaryCharts = dynamic(
  () => import("@/components/salary/salary-charts").then((mod) => mod.SalaryCharts),
  { ssr: false }
);

export default function SalaryPage() {
  const queryClient = useQueryClient();

  // ── States ──────────────────────────────────────
  const [recordFormOpen, setRecordFormOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<SalaryRecord | undefined>(undefined);

  const [appraisalFormOpen, setAppraisalFormOpen] = React.useState(false);
  const [editingAppraisal, setEditingAppraisal] = React.useState<SalaryAppraisal | undefined>(undefined);

  // ── Queries ─────────────────────────────────────
  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ["salary-records"],
    queryFn: async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      
      const { data, error } = await supabase
        .from("salary_records")
        .select("*, income:incomes(account_id)")
        .eq("user_id", user.id)
        .order("month", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: appraisals = [], isLoading: appraisalsLoading } = useQuery({
    queryKey: ["salary-appraisals"],
    queryFn: async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { data, error } = await supabase
        .from("salary_appraisals")
        .select("*")
        .eq("user_id", user.id)
        .order("effective_date", { ascending: false });

      if (error) throw error;
      return data as SalaryAppraisal[];
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["salary-stats"],
    queryFn: async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      // 1. Fetch all salary records to get trends
      const { data: records, error: recErr } = await supabase
        .from("salary_records")
        .select("month, gross_salary, net_salary, designation, company")
        .eq("user_id", user.id)
        .order("month", { ascending: true });

      if (recErr) throw recErr;

      // 2. Fetch all appraisals
      const { data: appraisals, error: appErr } = await supabase
        .from("salary_appraisals")
        .select("percentage_hike")
        .eq("user_id", user.id);

      if (appErr) throw appErr;

      const latest = records && records.length > 0 ? records[records.length - 1] : null;

      const totalHikesCount = appraisals?.length ?? 0;
      const averageHikePercent =
        totalHikesCount > 0
          ? appraisals.reduce((sum: number, app: any) => sum + Number(app.percentage_hike), 0) / totalHikesCount
          : 0;

      const chartData = (records ?? []).slice(-12).map((r: any) => {
        const date = new Date(r.month);
        const label = date.toLocaleString("default", { month: "short", year: "2-digit" });
        return {
          month: label,
          gross: Number(r.gross_salary),
          net: Number(r.net_salary),
        };
      });

      return {
        latestGrossSalary: latest ? Number(latest.gross_salary) : 0,
        latestNetSalary: latest ? Number(latest.net_salary) : 0,
        latestDesignation: latest ? latest.designation : null,
        latestCompany: latest ? latest.company : null,
        totalHikesCount,
        averageHikePercent,
        chartData,
      } as SalaryStats;
    },
  });

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

  // ── Mutations ──────────────────────────────────
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSalaryRecord(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Payslip record deleted");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete payslip");
    },
  });

  const deleteAppraisalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteSalaryAppraisal(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Appraisal record deleted");
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete appraisal");
    },
  });

  // ── Helpers ────────────────────────────────────
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["salary-records"] });
    void queryClient.invalidateQueries({ queryKey: ["salary-appraisals"] });
    void queryClient.invalidateQueries({ queryKey: ["salary-stats"] });
    void queryClient.invalidateQueries({ queryKey: ["incomes"] });
    void queryClient.invalidateQueries({ queryKey: ["income-stats"] });
  };

  const handleEditRecord = (record: SalaryRecord) => {
    setEditingRecord(record);
    setRecordFormOpen(true);
  };

  const handleEditAppraisal = (appraisal: SalaryAppraisal) => {
    setEditingAppraisal(appraisal);
    setAppraisalFormOpen(true);
  };

  const handleAddRecordClick = () => {
    setEditingRecord(undefined);
    setRecordFormOpen(true);
  };

  const handleAddAppraisalClick = () => {
    setEditingAppraisal(undefined);
    setAppraisalFormOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-emerald-500" />
            Salary & Career Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track monthly payslips, auto-post salary credits, and monitor professional growth appraisals.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={handleAddAppraisalClick} size="sm" variant="outline" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Record Appraisal
          </Button>

          <Button onClick={handleAddRecordClick} size="sm" className="gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" />
            Record Payslip
          </Button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <SalaryStatsCards stats={stats} />
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Trend Chart */}
        <div className="md:col-span-2">
          {statsLoading ? (
            <Skeleton className="h-[350px] w-full rounded-xl" />
          ) : stats ? (
            <SalaryCharts stats={stats} />
          ) : null}
        </div>

        {/* Career Milestones Mini-Timeline */}
        <div>
          <div className="rounded-xl border border-border/80 bg-card p-5 space-y-4 h-full min-h-[350px]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Appraisals</h3>
              <Button variant="ghost" size="xs" onClick={handleAddAppraisalClick} className="text-emerald-500 hover:text-emerald-600 gap-0.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {appraisalsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <AppraisalsList
                data={appraisals.slice(0, 3)}
                onEdit={handleEditAppraisal}
                onDelete={(id) => deleteAppraisalMutation.mutate(id)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main payslips history tab */}
      <Tabs defaultValue="payslips" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="payslips" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Payslip History
          </TabsTrigger>
          <TabsTrigger value="appraisals" className="flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            All Appraisals ({appraisals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payslips" className="space-y-4 mt-4">
          {recordsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <PayslipsTable
              data={records}
              onEdit={handleEditRecord}
              onDelete={(id) => deleteRecordMutation.mutate(id)}
            />
          )}
        </TabsContent>

        <TabsContent value="appraisals" className="space-y-4 mt-4">
          {appraisalsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <AppraisalsList
              data={appraisals}
              onEdit={handleEditAppraisal}
              onDelete={(id) => deleteAppraisalMutation.mutate(id)}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Form Modals */}
      <SalaryRecordForm
        open={recordFormOpen}
        onOpenChange={setRecordFormOpen}
        record={editingRecord}
        accounts={accounts}
        onSuccess={invalidateAll}
      />

      <SalaryAppraisalForm
        open={appraisalFormOpen}
        onOpenChange={setAppraisalFormOpen}
        appraisal={editingAppraisal}
        onSuccess={invalidateAll}
      />
    </div>
  );
}
