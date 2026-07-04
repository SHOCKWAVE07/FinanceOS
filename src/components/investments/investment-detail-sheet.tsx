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
  
  // Format chart data
  const chartData = history.map((val) => {
    const dateObj = new Date(val.valuation_date);
    return {
      date: format(dateObj, "dd MMM yy"),
      "Invested Capital": Number(val.invested_amount),
      "Current Value": Number(val.value),
    };
  });

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
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valuation History Log</h4>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Snapshot Date</TableHead>
                        <TableHead className="text-right">Invested Capital</TableHead>
                        <TableHead className="text-right">Asset Value</TableHead>
                        <TableHead className="text-right">Gain / Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length > 0 ? (
                        [...history].reverse().map((record) => {
                          const gain = Number(record.value) - Number(record.invested_amount);
                          const gainPct = Number(record.invested_amount) > 0 ? (gain / Number(record.invested_amount)) * 100 : 0;
                          const isProfit = gain >= 0;

                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {format(new Date(record.valuation_date), "dd MMMM yyyy")}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {formatCurrency(record.invested_amount, "INR")}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold">
                                {formatCurrency(record.value, "INR")}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                <div className={`flex flex-col items-end text-xs font-semibold ${
                                  isProfit ? "text-emerald-500" : "text-destructive"
                                }`}>
                                  <span className="flex items-center gap-0.5">
                                    {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {isProfit ? "+" : ""}{formatCurrency(gain, "INR")}
                                  </span>
                                  <span className="text-[10px] opacity-80">
                                    {isProfit ? "+" : ""}{gainPct.toFixed(1)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-20 text-center text-xs text-muted-foreground">
                            No historical snapshots logged.
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
