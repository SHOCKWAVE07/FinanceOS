"use client";

// ==============================================
// InvestmentTable — Phase 4
// Table displaying holdings, valuation returns, and actions.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import { Edit2, Trash, History, PlusCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Investment } from "@/types/database";

interface InvestmentTableProps {
  data: Investment[];
  categories?: any[];
  onEdit: (investment: Investment) => void;
  onDelete: (id: string) => void;
  onViewHistory: (investment: Investment) => void;
  onAddValuation: (investment: Investment) => void;
}

export function InvestmentTable({
  data,
  categories = [],
  onEdit,
  onDelete,
  onViewHistory,
  onAddValuation,
}: InvestmentTableProps) {
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead className="text-right">Invested Value</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead className="text-right">Returns (P&L)</TableHead>
            <TableHead className="text-right w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => {
              const invested = Number(item.invested_amount);
              const current = Number(item.current_value);
              const returns = current - invested;
              const returnsPct = invested > 0 ? (returns / invested) * 100 : 0;
              const isProfit = returns >= 0;

              const category = categories.find((c) => c.slug === item.type);
              const label = category ? category.name : (TYPE_LABELS[item.type] ?? item.type);
              const icon = category?.icon;
              const color = category?.color || "#64748b";

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-foreground">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Started: {format(new Date(item.start_date), "dd MMM yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] font-medium"
                      style={{
                        backgroundColor: `${color}10`,
                        color: color,
                        borderColor: `${color}20`
                      }}
                    >
                      {icon && <span className="mr-1">{icon}</span>}
                      {label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.institution}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatCurrency(invested, "INR")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                    {formatCurrency(current, "INR")}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <div className={`flex flex-col items-end text-xs font-semibold ${
                      isProfit ? "text-emerald-500" : "text-destructive"
                    }`}>
                      <span className="flex items-center gap-0.5">
                        {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {isProfit ? "+" : ""}{formatCurrency(returns, "INR")}
                      </span>
                      <span className="text-[10px]">
                        {isProfit ? "+" : ""}{returnsPct.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Quick Valuation Update"
                        onClick={() => onAddValuation(item)}
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="History & Trends"
                        onClick={() => onViewHistory(item)}
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Edit Details"
                        onClick={() => onEdit(item)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="hover:text-destructive"
                        title="Delete"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                No investment holdings found. Click "Add Asset" to start tracking.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
