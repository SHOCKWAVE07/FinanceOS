"use client";

// ==============================================
// GoalForm — Add / Edit Financial Goal
// React Hook Form + Zod validation
// Supports linking investments with allocated shares
// ==============================================

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Plus, Trash, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

import { goalFormSchema, type GoalFormValues } from "@/lib/validations/goal.schemas";
import { createGoal, updateGoal, type GoalWithStats } from "@/app/(dashboard)/goals/actions";
import { getInvestments } from "@/app/(dashboard)/investments/actions";
import { formatCurrency } from "@/lib/utils";

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalWithStats;
  onSuccess?: () => void;
}

function buildDefaults(item?: GoalWithStats): GoalFormValues {
  if (item) {
    return {
      name: item.name,
      description: item.description ?? "",
      target_amount: Number(item.target_amount),
      target_date: item.target_date,
      category: item.category,
      status: item.status,
      priority: item.priority,
      manual_savings: Number(item.manual_savings || 0),
      linkedInvestments: item.linked_investments.map((li) => ({
        investmentId: li.id,
        allocatedShare: Number(li.allocated_share),
      })),
    };
  }
  return {
    name: "",
    description: "",
    target_amount: 0,
    target_date: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM-dd"), // 1 year from now
    category: "other",
    status: "active",
    priority: "medium",
    manual_savings: 0,
    linkedInvestments: [],
  };
}

export function GoalForm({ open, onOpenChange, goal, onSuccess }: GoalFormProps) {
  const isEdit = !!goal;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema) as any,
    defaultValues: buildDefaults(goal),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "linkedInvestments",
  });

  const isSubmitting = form.formState.isSubmitting;

  // Query active investments for selection
  const { data: investmentsResult } = useQuery({
    queryKey: ["investments-all-active"],
    queryFn: () => getInvestments({ pageSize: 100 }),
    enabled: open,
  });

  const activeInvestments = investmentsResult?.ok ? investmentsResult.data.data : [];

  React.useEffect(() => {
    form.reset(buildDefaults(goal));
  }, [goal, form, open]);

  const onSubmit = async (values: GoalFormValues) => {
    const result = isEdit ? await updateGoal(goal!.id, values) : await createGoal(values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Financial goal updated" : "Financial goal created");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(goal));
    onOpenChange(next);
  };

  // Watch manual savings and linked investments for real-time progress preview
  const watchedManualSavings = form.watch("manual_savings") || 0;
  const watchedLinked = form.watch("linkedInvestments") || [];
  const watchedTarget = form.watch("target_amount") || 0;

  const totalSavedPreview = React.useMemo(() => {
    let sum = Number(watchedManualSavings);
    watchedLinked.forEach((link) => {
      const inv = activeInvestments.find((i) => i.id === link.investmentId);
      if (inv) {
        const val = Number(inv.current_value || 0);
        sum += (val * Number(link.allocatedShare || 0)) / 100;
      }
    });
    return sum;
  }, [watchedManualSavings, watchedLinked, activeInvestments]);

  const progressPercent = watchedTarget > 0 ? Math.min(100, (totalSavedPreview / watchedTarget) * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl border-l border-border bg-card/95 backdrop-blur-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Edit Financial Goal" : "Create Financial Goal"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update your financial objective, target milestones, and asset link allocations."
              : "Define a new financial target and map investments to power its progress."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="goal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Live Progress Card */}
              <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Estimated Progress Preview</span>
                <div className="flex items-end justify-between font-mono">
                  <span className="text-xl font-bold text-emerald-500">{formatCurrency(totalSavedPreview, "INR")}</span>
                  <span className="text-xs text-muted-foreground">
                    of <span className="font-semibold text-foreground">{formatCurrency(watchedTarget, "INR")}</span> ({progressPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted-foreground/15">
                  <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Goal Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Buy a Tesla Model Y, Retirement Corpus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Amount & Target Date */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="target_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount (INR) <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="1" placeholder="500000" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="retirement">Retirement</SelectItem>
                          <SelectItem value="house">House / Real Estate</SelectItem>
                          <SelectItem value="car">Car / Vehicle</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="vacation">Vacation / Travel</SelectItem>
                          <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                          <SelectItem value="other">Other / General</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status and Manual Savings */}
              <div className="grid grid-cols-2 gap-4">
                {isEdit ? (
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="abandoned">Abandoned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div />
                )}

                <FormField
                  control={form.control}
                  name="manual_savings"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manual Savings / Cash Allocated</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Cash or direct savings set aside for this goal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Objective Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is the details of this financial target?" className="resize-none" rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Linked Investments Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                    <Link2 className="h-4 w-4 text-primary" /> Linked Investments & Assets
                  </h4>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                    {watchedLinked.length} Linked
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Allocate percentages of your investment portfolios directly to fund this goal's target.
                </p>

                {activeInvestments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No active investments found to link. Create investments first.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {activeInvestments.map((inv) => {
                      const linkIdx = watchedLinked.findIndex((li) => li.investmentId === inv.id);
                      const isLinked = linkIdx !== -1;

                      return (
                        <div key={inv.id} className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 hover:bg-muted/20 transition-all">
                          <div className="flex items-center justify-between">
                            <label htmlFor={`link-${inv.id}`} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                              <Checkbox
                                id={`link-${inv.id}`}
                                checked={isLinked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    append({ investmentId: inv.id, allocatedShare: 100 });
                                  } else {
                                    remove(linkIdx);
                                  }
                                }}
                              />
                              {inv.name}
                            </label>
                            <span className="text-xs font-mono font-bold text-muted-foreground">
                              {formatCurrency(inv.current_value, "INR")}
                            </span>
                          </div>

                          {isLinked && (
                            <div className="flex items-center justify-between gap-4 pl-6 pt-1 border-t border-dashed border-border/40 mt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">Allocated:</span>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  className="h-7 w-16 text-center text-xs font-mono p-1"
                                  value={watchedLinked[linkIdx]?.allocatedShare || ""}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                                    form.setValue(`linkedInvestments.${linkIdx}.allocatedShare`, val);
                                  }}
                                />
                                <span className="text-xs font-mono text-muted-foreground">%</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-emerald-500">
                                + {formatCurrency(
                                  (Number(inv.current_value) * (watchedLinked[linkIdx]?.allocatedShare || 0)) / 100,
                                  "INR"
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </form>
          </Form>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="goal-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Creating…"}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Goal"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
