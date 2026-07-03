"use client";

// ==============================================
// ExpenseForm — Add / Edit Expense
// React Hook Form + Zod + shadcn/ui (base-nova style)
// Rendered inside a Sheet (slide-over panel)
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { CategoryCombobox } from "@/components/forms/category-combobox";
import { TagInput } from "@/components/forms/tag-input";

import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense.schemas";
import { cn, formatCurrency } from "@/lib/utils";
import { createExpense, updateExpense } from "@/app/(dashboard)/expenses/actions";
import type { Account, Category, ExpenseWithRelations, Tag } from "@/types/database";

// ── Props ────────────────────────────────────────

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseWithRelations;
  categories: Category[];
  accounts: Account[];
  tags: Tag[];
  onSuccess?: () => void;
  onTagCreated?: (name: string) => Promise<string | null>;
  onCategoryCreated?: (name: string) => Promise<string | null>;
  currency?: string;
}

// ── Default values ───────────────────────────────

function buildDefaults(expense?: ExpenseWithRelations): ExpenseFormValues {
  if (expense) {
    return {
      title: expense.title,
      amount: expense.amount,
      date: expense.date,
      currency: expense.currency,
      category_id: expense.category_id,
      account_id: expense.account_id,
      merchant: expense.merchant ?? "",
      notes: expense.notes ?? "",
      tag_ids: expense.tags.map((t) => t.id),
      is_reimbursable: expense.is_reimbursable,
      is_reimbursed: expense.is_reimbursed,
      is_recurring: expense.is_recurring,
    };
  }
  return {
    title: "",
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    currency: "INR",
    category_id: null,
    account_id: null,
    merchant: "",
    notes: "",
    tag_ids: [],
    is_reimbursable: false,
    is_reimbursed: false,
    is_recurring: false,
  };
}

// ── Component ─────────────────────────────────────

export function ExpenseForm({
  open,
  onOpenChange,
  expense,
  categories,
  accounts,
  tags,
  onSuccess,
  onTagCreated,
  onCategoryCreated,
  currency = "INR",
}: ExpenseFormProps) {
  const isEdit = !!expense;

  // zodResolver type compat: cast resolver to avoid RHF v7.80 / resolvers v5.4 dual-type issue
  const form = useForm<ExpenseFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: buildDefaults(expense),
  });

  const isSubmitting = form.formState.isSubmitting;
  const watchAmount = form.watch("amount");
  const watchDate = form.watch("date");

  React.useEffect(() => {
    form.reset(buildDefaults(expense));
  }, [expense, form]);

  // ── Submit ─────────────────────────────────────
  const onSubmit = async (values: ExpenseFormValues) => {
    const result = isEdit
      ? await updateExpense(expense!.id, values)
      : await createExpense(values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Expense updated" : "Expense added");
    form.reset(buildDefaults(undefined));
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(expense));
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Edit Expense" : "Add Expense"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the details of this expense."
              : "Record a new expense with all its details."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form
              id="expense-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              {/* ── Title ── */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Swiggy Order" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Amount + Currency ── */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>
                        Amount <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            {currency === "INR" ? "₹" : currency}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-7"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Live preview */}
              {Number(watchAmount) > 0 && (
                <p className="-mt-2 text-sm text-muted-foreground">
                  {formatCurrency(Number(watchAmount), form.getValues("currency"))}
                </p>
              )}

              {/* ── Date ── */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      {/* PopoverTrigger renders its own button in base-nova; no asChild needed */}
                      <PopoverTrigger
                        className={cn(
                          "flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-normal",
                          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          !field.value && "text-muted-foreground"
                        )}
                        aria-label="Pick date"
                      >
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                        {field.value
                          ? format(new Date(field.value), "dd MMM yyyy")
                          : "Pick a date"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) =>
                            field.onChange(
                              date ? format(date, "yyyy-MM-dd") : ""
                            )
                          }
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Category ── */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <CategoryCombobox
                        categories={categories.filter(
                          (c) => c.type === "expense" || c.type === "both"
                        )}
                        value={field.value}
                        onChange={field.onChange}
                        onCreateCategory={onCategoryCreated}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Tags ── */}
              <FormField
                control={form.control}
                name="tag_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        availableTags={tags}
                        value={field.value}
                        onChange={field.onChange}
                        onCreateTag={onTagCreated}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Notes ── */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional details…"
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* ── Flags ── */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Options</p>

                <FormField
                  control={form.control}
                  name="is_reimbursable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer font-normal">
                          Reimbursable
                        </FormLabel>
                        <FormDescription>
                          This expense will be reimbursed
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {isEdit && (
                  <FormField
                    control={form.control}
                    name="is_reimbursed"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="cursor-pointer font-normal">
                            Reimbursed
                          </FormLabel>
                          <FormDescription>
                            Reimbursement has been received
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer font-normal">
                          Recurring expense
                        </FormLabel>
                        <FormDescription>
                          Mark if this repeats on a schedule
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="expense-form"
            disabled={isSubmitting}
            className="min-w-28"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Adding…"}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Expense"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
