"use client";

// ==============================================
// PayslipsTable — Phase 3
// Table showing monthly salary credits history.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import { Edit2, Trash, Link } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { SalaryRecord } from "@/types/database";

interface PayslipsTableProps {
  data: SalaryRecord[];
  onEdit: (record: SalaryRecord) => void;
  onDelete: (id: string) => void;
}

export function PayslipsTable({ data, onEdit, onDelete }: PayslipsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Employer & Role</TableHead>
            <TableHead className="text-right">Gross Salary</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net Credit</TableHead>
            <TableHead>Ledger Link</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((record) => {
              const deductions =
                Number(record.pf_deduction) +
                Number(record.nps_deduction) +
                Number(record.tax_deduction) +
                Number(record.other_deductions);
              return (
                <TableRow key={record.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {format(new Date(record.month), "MMMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{record.designation}</span>
                      <span className="text-xs text-muted-foreground">{record.company}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {formatCurrency(record.gross_salary, "INR")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">
                    -{formatCurrency(deductions, "INR")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-emerald-500">
                    {formatCurrency(record.net_salary, "INR")}
                  </TableCell>
                  <TableCell>
                    {record.income_id ? (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 gap-1">
                        <Link className="h-2.5 w-2.5" />
                        Linked
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon-xs" onClick={() => onEdit(record)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" className="hover:text-destructive" onClick={() => onDelete(record.id)}>
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
                No payslip history recorded. Click "Add Payslip" to start tracking.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
