"use client";

// ==============================================
// IncomeDetailSheet — Phase 3
// Slide-over detail panel showing income metadata.
// ==============================================

import * as React from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  Edit2,
  FileText,
  History,
  TagIcon,
  Trash2,
  Briefcase,
  User,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { IncomeWithRelations } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

interface IncomeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: IncomeWithRelations | null;
  onEdit: (income: IncomeWithRelations) => void;
  onDelete: (id: string) => void;
}

export function IncomeDetailSheet({
  open,
  onOpenChange,
  income,
  onEdit,
  onDelete,
}: IncomeDetailSheetProps) {
  if (!income) return null;

  const formattedDate = format(new Date(income.date), "EEEE, dd MMMM yyyy");
  const formattedCreated = format(new Date(income.created_at), "dd MMM yyyy 'at' hh:mm a");
  const formattedUpdated = format(new Date(income.updated_at), "dd MMM yyyy 'at' hh:mm a");

  const handleDelete = () => {
    onDelete(income.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Income details
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  onEdit(income);
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
          <SheetTitle className="text-xl font-bold mt-2 truncate">{income.title}</SheetTitle>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold tracking-tight text-emerald-500">
              +{formatCurrency(income.amount, income.currency)}
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
                <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground opacity-70" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">Category</span>
                  <div>
                    {income.category ? (
                      <Badge
                        variant="outline"
                        className="gap-1 px-2.5 py-0.5 text-xs font-normal"
                        style={
                          income.category.color
                            ? { borderColor: income.category.color, color: income.category.color }
                            : undefined
                        }
                      >
                        <span>{income.category.icon}</span>
                        <span>{income.category.name}</span>
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No Category</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Source */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground opacity-70" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">Source / Payer</span>
                  <p className="text-sm font-medium">{income.source || <span className="text-muted-foreground italic">—</span>}</p>
                </div>
              </div>

              {/* Status Flags */}
              <div className="flex items-start gap-3">
                <History className="h-4 w-4 mt-0.5 text-muted-foreground opacity-70" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-muted-foreground">Flags</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {income.is_recurring && (
                      <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-500/10">
                        Recurring Income
                      </Badge>
                    )}
                    {!income.is_recurring && (
                      <span className="text-xs text-muted-foreground">None</span>
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
              {income.tags && income.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {income.tags.map((t) => (
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
              {income.notes ? (
                <div className="rounded-lg bg-muted/40 border border-border/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {income.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No notes added.</p>
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
