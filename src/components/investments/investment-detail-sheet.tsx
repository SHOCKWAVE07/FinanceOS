"use client";

// ==============================================
// InvestmentDetailSheet — Phase 4
// Slide-over displaying historical valuation logs and charts.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Building, Coins, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getValuationHistory } from "@/app/(dashboard)/investments/actions";
import { formatCurrency } from "@/lib/utils";
import type { Investment } from "@/types/database";

function calculateXIRR(cashFlows: { date: Date; amount: number }[]): number | null {
  if (cashFlows.length < 2) return null;

  const d1 = cashFlows[0].date;
  
  const npv = (r: number) => {
    return cashFlows.reduce((sum, cf) => {
      const years = (cf.date.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return sum + cf.amount / Math.pow(1 + r, years);
    }, 0);
  };

  const npvDerivative = (r: number) => {
    return cashFlows.reduce((sum, cf) => {
      const years = (cf.date.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (years === 0) return sum;
      return sum - (cf.amount * years) / Math.pow(1 + r, years + 1);
    }, 0);
  };

  let r = 0.1;
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    const val = npv(r);
    const deriv = npvDerivative(r);
    if (Math.abs(deriv) < 1e-12) break;
    const nextR = r - val / deriv;
    if (Math.abs(nextR - r) < tolerance) {
      return nextR;
    }
    r = nextR;
  }

  // Fallback: Bisection search
  let low = -0.999;
  let high = 10.0;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const val = npv(mid);
    if (Math.abs(val) < tolerance) {
      return mid;
    }
    if (val > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return null;
}

interface InvestmentDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
}

export function InvestmentDetailSheet({
  open,
  onOpenChange,
  investment,
}: InvestmentDetailSheetProps) {
  // Query valuation history
  const { data: historyResult, isLoading } = useQuery({
    queryKey: ["investment-valuations", investment?.id],
    queryFn: () => getValuationHistory(investment!.id),
    enabled: !!investment && open,
  });

  const history = historyResult?.ok ? historyResult.data : [];
  
  // Calculate XIRR and Performance Stats
  const performanceStats = React.useMemo(() => {
    if (history.length === 0) return { invested: 0, current: 0, absolute: 0, pct: 0, xirr: null };

    // Sort ascending by date
    const sortedHistory = [...history].sort((a, b) => new Date(a.valuation_date).getTime() - new Date(b.valuation_date).getTime());
    
    const latest = sortedHistory[sortedHistory.length - 1];
    const invested = Number(latest.invested_amount);
    const current = Number(latest.value);
    const absolute = current - invested;
    const pct = invested > 0 ? (absolute / invested) * 100 : 0;

    // Build cash flows for XIRR
    const cashFlows: { date: Date; amount: number }[] = [];
    
    // 1. Initial invested amount
    cashFlows.push({
      date: new Date(sortedHistory[0].valuation_date),
      amount: -Number(sortedHistory[0].invested_amount),
    });

    // 2. Incremental adjustments
    for (let i = 1; i < sortedHistory.length; i++) {
      const diff = Number(sortedHistory[i].invested_amount) - Number(sortedHistory[i-1].invested_amount);
      if (diff !== 0) {
        cashFlows.push({
          date: new Date(sortedHistory[i].valuation_date),
          amount: -diff,
        });
      }
    }

    // 3. Final current valuation (if it's not already added or to represent the closing value)
    cashFlows.push({
      date: new Date(latest.valuation_date),
      amount: current,
    });

    // Clean up duplicate cash flows on the same date by summing them
    const flowMap = new Map<string, number>();
    for (const cf of cashFlows) {
      const key = format(cf.date, "yyyy-MM-dd");
      flowMap.set(key, (flowMap.get(key) || 0) + cf.amount);
    }

    const uniqueFlows = Array.from(flowMap.entries()).map(([dateStr, amt]) => ({
      date: new Date(dateStr),
      amount: amt,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Compute XIRR
    let xirrVal = null;
    if (uniqueFlows.length >= 2 && absolute !== 0) {
      const hasPositive = uniqueFlows.some(f => f.amount > 0);
      const hasNegative = uniqueFlows.some(f => f.amount < 0);
      if (hasPositive && hasNegative) {
        xirrVal = calculateXIRR(uniqueFlows);
      }
    }

    return {
      invested,
      current,
      absolute,
      pct,
      xirr: xirrVal !== null ? xirrVal * 100 : null,
    };
  }, [history]);

  // Format chart data
  const chartData = history.map((val) => {
    const dateObj = new Date(val.valuation_date);
    return {
      date: format(dateObj, "dd MMM yy"),
      "Invested Capital": Number(val.invested_amount),
      "Current Value": Number(val.value),
    };
  });

  // Format transactions list
  const transactions = React.useMemo(() => {
    if (history.length === 0) return [];

    const sorted = [...history].sort((a, b) => new Date(a.valuation_date).getTime() - new Date(b.valuation_date).getTime());
    
    const list: {
      id: string;
      date: string;
      type: "initial" | "add" | "subtract" | "valuation";
      amount: number;
      resultingInvested: number;
      resultingValue: number;
    }[] = [];

    // 1. Initial snapshot
    list.push({
      id: sorted[0].id,
      date: sorted[0].valuation_date,
      type: "initial",
      amount: Number(sorted[0].invested_amount),
      resultingInvested: Number(sorted[0].invested_amount),
      resultingValue: Number(sorted[0].value),
    });

    // 2. Subsequent snapshots
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const diffInvested = Number(curr.invested_amount) - Number(prev.invested_amount);
      const diffValue = Number(curr.value) - Number(prev.value);

      if (diffInvested > 0) {
        list.push({
          id: curr.id,
          date: curr.valuation_date,
          type: "add",
          amount: diffInvested,
          resultingInvested: Number(curr.invested_amount),
          resultingValue: Number(curr.value),
        });
      } else if (diffInvested < 0) {
        list.push({
          id: curr.id,
          date: curr.valuation_date,
          type: "subtract",
          amount: Math.abs(diffInvested),
          resultingInvested: Number(curr.invested_amount),
          resultingValue: Number(curr.value),
        });
      } else if (diffValue !== 0) {
        list.push({
          id: curr.id,
          date: curr.valuation_date,
          type: "valuation",
          amount: diffValue,
          resultingInvested: Number(curr.invested_amount),
          resultingValue: Number(curr.value),
        });
      }
    }

    return list.reverse();
  }, [history]);

  const TYPE_LABELS: Record<string, string> = {
    mutual_fund: "Mutual Fund",
    stock: "Equities/Stock",
    crypto: "Crypto",
    gold: "Gold",
    fixed_deposit: "Fixed Deposit",
    ppf: "PPF",
    nps: "NPS",
    real_estate: "Real Estate",
    other: "Other",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl border-l border-border bg-card/95 backdrop-blur-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-xl font-bold">{investment?.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-3 flex-wrap mt-1 text-xs">
            <span className="flex items-center gap-1">
              <Building className="h-3 w-3" /> {investment?.institution}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold text-primary">
              <Coins className="h-3 w-3" /> {investment ? TYPE_LABELS[investment.type] : ""}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Started {investment ? format(new Date(investment.start_date), "dd MMMM yyyy") : ""}
            </span>
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Performance Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Absolute Returns</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold font-mono ${
                      performanceStats.absolute >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}>
                      {performanceStats.absolute >= 0 ? "+" : ""}{formatCurrency(performanceStats.absolute, "INR")}
                    </span>
                    <span className={`text-xs font-semibold font-mono ${
                      performanceStats.absolute >= 0 ? "text-emerald-500" : "text-destructive"
                    }`}>
                      ({performanceStats.absolute >= 0 ? "+" : ""}{performanceStats.pct.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    XIRR (Annualized)
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-xl font-bold font-mono ${
                      performanceStats.xirr === null
                        ? "text-muted-foreground"
                        : performanceStats.xirr >= 0
                        ? "text-emerald-500"
                        : "text-destructive"
                    }`}>
                      {performanceStats.xirr === null 
                        ? "0.00%" 
                        : `${performanceStats.xirr >= 0 ? "+" : ""}${performanceStats.xirr.toFixed(2)}%`}
                    </span>
                    {performanceStats.xirr !== null && (
                      <span className="text-[10px] text-muted-foreground">p.a.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Chart */}
              {chartData.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portfolio Valuation Curve</h4>
                  <div className="h-[220px] w-full rounded-xl border border-border bg-muted/20 p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickFormatter={(v) => `₹${v/1000}k`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(30, 41, 59, 0.95)",
                            borderColor: "rgba(255, 255, 255, 0.1)",
                            borderRadius: "10px",
                          }}
                          labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: 600 }}
                          itemStyle={{ fontSize: "12px", fontFamily: "monospace" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                        <Line type="monotone" dataKey="Invested Capital" stroke="#64748b" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="Current Value" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Valuation Timeline Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transaction & Activity Log</h4>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead className="text-right">Amount Change</TableHead>
                        <TableHead className="text-right">Total Invested</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.length > 0 ? (
                        transactions.map((tx) => {
                          const typeLabels = {
                            initial: "Initial Deposit",
                            add: "Capital Addition",
                            subtract: "Capital Withdrawal",
                            valuation: "Valuation Update",
                          };

                          const typeColors = {
                            initial: "text-muted-foreground",
                            add: "text-emerald-500 font-semibold",
                            subtract: "text-destructive font-semibold",
                            valuation: "text-sky-500",
                          };

                          const prefix = tx.type === "add" || tx.type === "initial"
                            ? "+"
                            : tx.type === "subtract"
                            ? "-"
                            : tx.amount >= 0 ? "+" : "";

                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {format(new Date(tx.date), "dd MMM yyyy")}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className={`font-medium ${typeColors[tx.type]}`}>
                                  {typeLabels[tx.type]}
                                </span>
                              </TableCell>
                              <TableCell className={`text-right font-mono text-xs font-semibold ${
                                tx.type === "add" || (tx.type === "valuation" && tx.amount >= 0)
                                  ? "text-emerald-500" 
                                  : tx.type === "subtract" || (tx.type === "valuation" && tx.amount < 0)
                                  ? "text-destructive" 
                                  : ""
                              }`}>
                                {prefix}{formatCurrency(tx.amount, "INR")}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {formatCurrency(tx.resultingInvested, "INR")}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold">
                                {formatCurrency(tx.resultingValue, "INR")}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-20 text-center text-xs text-muted-foreground">
                            No transaction history.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes */}
              {investment?.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</h4>
                  <div className="rounded-xl border border-border bg-muted/15 p-4 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {investment.notes}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close panel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
