"use client";

// ==============================================
// ExpenseTable — Phase 2
// TanStack Table with pagination, sorting, selection,
// and row action triggers.
// ==============================================

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Edit2,
  Eye,
  MoreHorizontal,
  Trash,
} from "lucide-react";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import type { ExpenseWithRelations } from "@/types/database";
import type { ExpenseFiltersFormValues } from "@/lib/validations/expense.schemas";
import { cn, formatCurrency } from "@/lib/utils";

interface ExpenseTableProps {
  data: ExpenseWithRelations[];
  totalCount: number;
  filters: Partial<ExpenseFiltersFormValues>;
  onFiltersChange: (filters: Partial<ExpenseFiltersFormValues>) => void;
  onEdit: (expense: ExpenseWithRelations) => void;
  onView: (expense: ExpenseWithRelations) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onDuplicate: (expense: ExpenseWithRelations) => void;
}

export function ExpenseTable({
  data,
  totalCount,
  filters,
  onFiltersChange,
  onEdit,
  onView,
  onDelete,
  onBulkDelete,
  onDuplicate,
}: ExpenseTableProps) {
  // Page calculations
  const currentPage = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const pageCount = Math.ceil(totalCount / pageSize);

  // Row selection state
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});

  // Reset selection on pagination/data changes
  React.useEffect(() => {
    setRowSelection({});
  }, [data, currentPage]);

  const handleSort = (column: "date" | "amount" | "title") => {
    const isCurrent = filters.sortBy === column;
    const nextOrder = isCurrent && filters.sortOrder === "desc" ? "asc" : "desc";
    onFiltersChange({
      ...filters,
      sortBy: column,
      sortOrder: nextOrder,
    });
  };

  const columns = React.useMemo<ColumnDef<ExpenseWithRelations>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "date",
        header: () => (
          <button
            onClick={() => handleSort("date")}
            className="flex items-center gap-1 font-medium hover:text-foreground text-muted-foreground"
          >
            Date
            {filters.sortBy === "date" ? (
              filters.sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const dateStr = row.original.date;
          return (
            <span className="font-mono text-xs">
              {format(new Date(dateStr), "dd MMM yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "title",
        header: () => (
          <button
            onClick={() => handleSort("title")}
            className="flex items-center gap-1 font-medium hover:text-foreground text-muted-foreground"
          >
            Title
            {filters.sortBy === "title" ? (
              filters.sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm text-foreground truncate max-w-[200px]">
                {expense.title}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => {
          const category = row.original.category;
          if (!category) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <Badge
              variant="outline"
              className="gap-1.5 py-0.5 font-normal"
              style={
                category.color
                  ? { borderColor: category.color, color: category.color }
                  : undefined
              }
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </Badge>
          );
        },
      },

      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const exp = row.original;
          return (
            <div className="flex flex-wrap gap-1">
              {exp.is_recurring && (
                <Badge variant="secondary" className="text-[10px] py-0">
                  Recurring
                </Badge>
              )}
              {exp.is_reimbursable && (
                <Badge
                  variant={exp.is_reimbursed ? "outline" : "default"}
                  className={cn(
                    "text-[10px] py-0",
                    exp.is_reimbursed
                      ? "text-emerald-500 border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                  )}
                >
                  {exp.is_reimbursed ? "Reimbursed" : "To Claim"}
                </Badge>
              )}
              {!exp.is_recurring && !exp.is_reimbursable && (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: () => (
          <button
            onClick={() => handleSort("amount")}
            className="flex items-center gap-1 font-medium hover:text-foreground text-muted-foreground ml-auto"
          >
            Amount
            {filters.sortBy === "amount" ? (
              filters.sortOrder === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const amount = row.original.amount;
          const currency = row.original.currency;
          return (
            <span className="font-mono text-sm font-semibold text-right block pr-1">
              {formatCurrency(amount, currency)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const expense = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted focus-visible:outline-none">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onView(expense)}>
                  <Eye className="mr-2 h-3.5 w-3.5" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(expense)}>
                  <Edit2 className="mr-2 h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(expense)}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(expense.id)}
                >
                  <Trash className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [filters, handleSort, onDelete, onDuplicate, onEdit, onView]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = selectedRows.map((r) => r.original.id);

  return (
    <div className="space-y-3">
      {/* Bulk actions banner */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5">
          <span className="text-xs text-destructive font-medium">
            {selectedRows.length} expense{selectedRows.length > 1 ? "s" : ""} selected
          </span>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => onBulkDelete(selectedIds)}
            className="h-7 gap-1"
          >
            <Trash className="h-3.5 w-3.5" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-muted-foreground text-sm"
                >
                  No expenses match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination panel */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted-foreground font-mono">
            Showing Page {currentPage} of {pageCount} ({totalCount} total items)
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => onFiltersChange({ ...filters, page: currentPage - 1 })}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pageCount }).map((_, i) => {
                const pageNum = i + 1;
                // Simple smart pagination display window
                if (
                  pageNum === 1 ||
                  pageNum === pageCount ||
                  Math.abs(pageNum - currentPage) <= 1
                ) {
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "secondary" : "ghost"}
                      size="xs"
                      className="w-7 h-7 p-0"
                      onClick={() => onFiltersChange({ ...filters, page: pageNum })}
                    >
                      {pageNum}
                    </Button>
                  );
                }
                if (
                  pageNum === 2 &&
                  currentPage > 3
                ) {
                  return (
                    <span key="dots-start" className="text-xs text-muted-foreground px-1">
                      …
                    </span>
                  );
                }
                if (
                  pageNum === pageCount - 1 &&
                  currentPage < pageCount - 2
                ) {
                  return (
                    <span key="dots-end" className="text-xs text-muted-foreground px-1">
                      …
                    </span>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="xs"
              disabled={currentPage >= pageCount}
              onClick={() => onFiltersChange({ ...filters, page: currentPage + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
