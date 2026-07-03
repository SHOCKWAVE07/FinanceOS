"use client";

// ==============================================
// ExpenseDetailSheet — Phase 2
// Slide-over detail panel showing receipt preview, metadata,
// category badge, tags, and timeline.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Download,
  Edit2,
  FileIcon,
  FileText,
  History,
  Link,
  Receipt,
  TagIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { ExpenseWithRelations } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

interface ExpenseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseWithRelations | null;
  onEdit: (expense: ExpenseWithRelations) => void;
  onDelete: (id: string) => void;
}

export function ExpenseDetailSheet({
  open,
  onOpenChange,
  expense,
  onEdit,
  onDelete,
}: ExpenseDetailSheetProps) {
  if (!expense) return null;

  const formattedDate = format(new Date(expense.date), "EEEE, dd MMMM yyyy");
  const formattedCreated = format(new Date(expense.created_at), "dd MMM yyyy 'at' hh:mm a");
  const formattedUpdated = format(new Date(expense.updated_at), "dd MMM yyyy 'at' hh:mm a");

  const handleDelete = () => {
    onDelete(expense.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Expense details
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  onEdit(expense);
                  onOpenChange(false);
                }}
                className="h-7 gap-1"
              >
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="xs"
                onClick={handleDelete}
                className="h-7 gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
          <SheetTitle className="text-xl font-bold mt-2 truncate">{expense.title}</SheetTitle>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold tracking-tight">
              {formatCurrency(expense.amount, expense.currency)}
            </span>
          </div>
        </SheetHeader>

        <Separator />

        {/* Scrollable details content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Core details list */}
            <div className="space-y-4">
              {/* Date */}
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground opacity-70" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">Date</span>
                  <p className="text-sm font-medium">{formattedDate}</p>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-start gap-3">
                <Receipt className="h-4 w-4 mt-0.5 text-muted-foreground opacity-70" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">Category</span>
                  <div>
                    {expense.category ? (
                      <Badge
                        variant="outline"
                        className="gap-1 px-2.5 py-0.5 text-xs font-normal"
                        style={
                          expense.category.color
                            ? { borderColor: expense.category.color, color: expense.category.color }
                            : undefined
                        }
                      >
                        <span>{expense.category.icon}</span>
                        <span>{expense.category.name}</span>
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No Category</span>
                    )}
                  </div>
                </div>
              </div>



              {/* Status Flags */}
              <div className="flex items-start gap-3">
                <History className="h-4 w-4 mt-0.5 text-muted-foreground opacity-70" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">Flags</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {expense.is_recurring && (
                      <Badge variant="secondary" className="text-[10px]">
                        Recurring Rule
                      </Badge>
                    )}
                    {expense.is_reimbursable && (
                      <Badge
                        variant={expense.is_reimbursed ? "outline" : "default"}
                        className={
                          expense.is_reimbursed
                            ? "text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600"
                        }
                      >
                        {expense.is_reimbursed ? "Reimbursed" : "Reimbursable (Pending)"}
                      </Badge>
                    )}
                    {!expense.is_recurring && !expense.is_reimbursable && (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags section */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5" />
                Tags
              </span>
              {expense.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {expense.tags.map((t) => (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className="text-xs"
                      style={t.color ? { borderColor: t.color, color: t.color } : undefined}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No tags attached.</p>
              )}
            </div>

            <Separator />

            {/* Notes Section */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Notes
              </span>
              {expense.notes ? (
                <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {expense.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No notes added.</p>
              )}
            </div>

            <Separator />

            {/* Attachments Section */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Link className="h-3.5 w-3.5" />
                Attachments
              </span>
              {expense.attachments && expense.attachments.length > 0 ? (
                <div className="space-y-2">
                  {expense.attachments.map((file) => {
                    const isImg = file.mime_type.startsWith("image/");
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {isImg ? (
                            <Receipt className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="font-medium truncate">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0"
                          title="Download attachment"
                          onClick={() => toast.info("Download would begin here")}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No attachments uploaded.</p>
              )}
            </div>

            <Separator />

            {/* Timeline info */}
            <div className="space-y-2 text-[10px] text-muted-foreground font-mono">
              <p>Created: {formattedCreated}</p>
              <p>Last Updated: {formattedUpdated}</p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
