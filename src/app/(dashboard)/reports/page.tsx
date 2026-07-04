"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Calendar,
  Printer,
  Loader2,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Percent,
  ChevronRight,
  Target,
  StickyNote,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, parse } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getReportData, type ReportData } from "@/app/(dashboard)/reports/actions";
import { formatCurrency, formatPercentage } from "@/lib/utils";

type ReportType = "monthly" | "quarterly" | "yearly" | "custom";

export default function ReportsPage() {
  const [reportType, setReportType] = React.useState<ReportType>("monthly");
  const [selectedMonth, setSelectedMonth] = React.useState<string>(format(new Date(), "yyyy-MM"));
  const [selectedQuarter, setSelectedQuarter] = React.useState<string>("Q1");
  const [selectedQuarterYear, setSelectedQuarterYear] = React.useState<string>(format(new Date(), "yyyy"));
  const [selectedYear, setSelectedYear] = React.useState<string>(format(new Date(), "yyyy"));
  const [customStart, setCustomStart] = React.useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = React.useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Calculate start/end dates based on selection
  const { start, end, label } = React.useMemo(() => {
    let s = new Date();
    let e = new Date();
    let lbl = "";

    if (reportType === "monthly") {
      const parsed = parse(selectedMonth, "yyyy-MM", new Date());
      s = startOfMonth(parsed);
      e = endOfMonth(parsed);
      lbl = format(parsed, "MMMM yyyy");
    } else if (reportType === "quarterly") {
      const yr = parseInt(selectedQuarterYear);
      const q = parseInt(selectedQuarter.replace("Q", ""));
      const monthIdx = (q - 1) * 3;
      const base = new Date(yr, monthIdx, 1);
      s = startOfQuarter(base);
      e = endOfQuarter(base);
      lbl = `${selectedQuarter} ${selectedQuarterYear}`;
    } else if (reportType === "yearly") {
      const base = new Date(parseInt(selectedYear), 0, 1);
      s = startOfYear(base);
      e = endOfYear(base);
      lbl = `Year ${selectedYear}`;
    } else {
      s = new Date(customStart);
      e = new Date(customEnd);
      lbl = `${format(s, "PP")} - ${format(e, "PP")}`;
    }

    return {
      start: format(s, "yyyy-MM-dd"),
      end: format(e, "yyyy-MM-dd"),
      label: lbl,
    };
  }, [reportType, selectedMonth, selectedQuarter, selectedQuarterYear, selectedYear, customStart, customEnd]);

  // Query report data
  const { data: reportRes, isLoading, refetch } = useQuery({
    queryKey: ["reports-data", start, end],
    queryFn: () => getReportData(start, end),
  });

  const report = reportRes?.ok ? reportRes.data : null;

  const handlePrint = () => {
    window.print();
  };

  // Generate lists for select boxes
  const monthOptions = React.useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = subMonths(now, i);
      list.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy"),
      });
    }
    return list;
  }, []);

  const yearOptions = ["2026", "2025", "2024"];

  return (
    <div className="space-y-6">
      {/* Print Styles Injection */}
      <style jsx global>{`
        @media print {
          /* Hide sidebar, headers, and UI widgets */
          [data-sidebar="sidebar"],
          header,
          .no-print,
          button,
          select,
          input {
            display: none !important;
          }
          
          /* Force standard white page background & dark text for print quality */
          body, main, html {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .printable-report {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-kpi-card {
            border: 1px solid #e2e8f0 !important;
            background: white !important;
            color: black !important;
          }

          .print-muted-text {
            color: #64748b !important;
          }

          .print-border {
            border-color: #cbd5e1 !important;
          }

          /* Prevent grid breaking pages */
          .printable-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>

      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Financial Reports</h2>
          <p className="text-sm text-muted-foreground">
            Generate and export monthly, quarterly, or yearly financial statements.
          </p>
        </div>
        <button
          onClick={handlePrint}
          disabled={isLoading || !report}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      {/* Controls Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/80 no-print">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4 items-end">
            {/* Report Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="monthly">Monthly Report</option>
                <option value="quarterly">Quarterly Report</option>
                <option value="yearly">Yearly Report</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Dynamic Period Inputs */}
            {reportType === "monthly" && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Select Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === "quarterly" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quarter</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="Q1">Q1 (Jan - Mar)</option>
                    <option value="Q2">Q2 (Apr - Jun)</option>
                    <option value="Q3">Q3 (Jul - Sep)</option>
                    <option value="Q4">Q4 (Oct - Dec)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Year</label>
                  <select
                    value={selectedQuarterYear}
                    onChange={(e) => setSelectedQuarterYear(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {reportType === "yearly" && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  />
                </div>
              </>
            )}

            <button
              onClick={() => refetch()}
              className="h-9 w-full rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold text-xs transition-all"
            >
              Generate Report
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Report Container */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Generating statement details…</p>
        </div>
      ) : !report ? (
        <div className="flex h-64 items-center justify-center text-xs text-muted-foreground italic border border-dashed rounded-xl">
          Failed to fetch report data. Try checking database connections.
        </div>
      ) : (
        <Card className="printable-report bg-card/45 border-border shadow-md max-w-4xl mx-auto overflow-hidden">
          {/* Statement Header */}
          <div className="p-8 border-b border-border/80 bg-muted/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary no-print" />
                <h3 className="text-xl font-bold tracking-tight text-foreground">Financial Performance Report</h3>
              </div>
              <p className="text-xs text-muted-foreground print-muted-text">
                Statement period: <span className="font-semibold text-foreground font-mono">{label}</span>
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-muted-foreground print-muted-text font-mono">
              <p className="font-semibold text-foreground">FinanceOS Platform</p>
              <p>Generated: {format(new Date(), "PPP")}</p>
            </div>
          </div>

          <CardContent className="p-8 space-y-8">
            {/* KPI Cards Row */}
            <div className="grid gap-4 sm:grid-cols-4">
              {/* Income */}
              <div className="print-kpi-card p-4 rounded-xl border border-border/60 bg-muted/5 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground print-muted-text flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" /> Total Inflows
                </p>
                <p className="text-lg font-bold tracking-tight font-mono">{formatCurrency(report.total_income)}</p>
              </div>

              {/* Expenses */}
              <div className="print-kpi-card p-4 rounded-xl border border-border/60 bg-muted/5 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground print-muted-text flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-destructive" /> Total Outflows
                </p>
                <p className="text-lg font-bold tracking-tight font-mono">{formatCurrency(report.total_expense)}</p>
              </div>

              {/* Net Savings */}
              <div className="print-kpi-card p-4 rounded-xl border border-border/60 bg-muted/5 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground print-muted-text flex items-center gap-1">
                  <PiggyBank className="h-3 w-3 text-blue-500" /> Net Savings
                </p>
                <p className="text-lg font-bold tracking-tight font-mono">{formatCurrency(report.net_savings)}</p>
              </div>

              {/* Savings Rate */}
              <div className="print-kpi-card p-4 rounded-xl border border-border/60 bg-muted/5 space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground print-muted-text flex items-center gap-1">
                  <Percent className="h-3 w-3 text-amber-500" /> Savings Rate
                </p>
                <p className="text-lg font-bold tracking-tight font-mono">{report.savings_rate.toFixed(1)}%</p>
              </div>
            </div>

            <Separator className="bg-border/60 print-border" />

            {/* Split Page Breakdown */}
            <div className="printable-grid grid gap-6 md:grid-cols-2">
              {/* Category Breakdown (Spent) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Spending Breakdown</h4>
                {report.category_breakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground print-muted-text italic">No expenditures logged during this period.</p>
                ) : (
                  <div className="space-y-3.5">
                    {report.category_breakdown.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold text-foreground/90">{item.category}</span>
                          <span className="text-muted-foreground print-muted-text">
                            {formatCurrency(item.amount)} ({item.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="h-1 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Goals & Milestones */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary no-print" /> Financial Goals Status
                </h4>
                {report.goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground print-muted-text italic">No savings goals created.</p>
                ) : (
                  <div className="space-y-3">
                    {report.goals.map((goal) => {
                      const percentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                      return (
                        <div key={goal.id} className="border border-border/40 p-2.5 rounded-lg bg-muted/5 text-xs">
                          <div className="flex items-center justify-between font-semibold">
                            <span>{goal.name}</span>
                            <span className="font-mono text-muted-foreground print-muted-text">{percentage.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 bg-muted/60 rounded-full overflow-hidden mt-1.5 mb-2">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }} />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground print-muted-text font-mono">
                            <span>Saved: {formatCurrency(goal.current_amount)}</span>
                            <span>Target: {formatCurrency(goal.target_amount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-border/60 print-border" />

            {/* Related Notes Block */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <StickyNote className="h-4 w-4 text-primary no-print" /> Notes Created ({report.notes.length})
              </h4>
              {report.notes.length === 0 ? (
                <p className="text-xs text-muted-foreground print-muted-text italic">No journals or notes created during this period.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.notes.map((note) => (
                    <div key={note.id} className="border border-border/40 p-3 rounded-lg bg-muted/5 space-y-1.5">
                      <p className="text-xs font-semibold text-foreground/90 truncate">{note.title}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground print-muted-text font-mono">
                        <span>Created: {format(new Date(note.created_at), "PPP")}</span>
                        <span>{note.tags.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Print Signature / Footer */}
            <div className="hidden print:block pt-12 text-center text-[10px] text-slate-400 print-muted-text border-t print-border mt-12 font-mono">
              <p>This statement represents an aggregate summary of accounts, transactions, and holdings recorded in the user's FinanceOS ledger.</p>
              <p className="mt-1">Generated electronically — No signature required.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
