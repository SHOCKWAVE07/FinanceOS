"use client";

// ==============================================
// SalaryAppraisalForm — Add / Edit Hike Details
// React Hook Form + Zod
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { salaryAppraisalSchema, type SalaryAppraisalFormValues } from "@/lib/validations/salary.schemas";
import { formatCurrency } from "@/lib/utils";
import { createSalaryAppraisal, updateSalaryAppraisal } from "@/app/(dashboard)/salary/actions";
import type { SalaryAppraisal } from "@/types/database";

interface SalaryAppraisalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appraisal?: SalaryAppraisal;
  onSuccess?: () => void;
}

function buildDefaults(appraisal?: SalaryAppraisal): SalaryAppraisalFormValues {
  if (appraisal) {
    return {
      company: appraisal.company,
      designation: appraisal.designation,
      effective_date: appraisal.effective_date,
      previous_gross_salary: appraisal.previous_gross_salary,
      new_gross_salary: appraisal.new_gross_salary,
      notes: appraisal.notes ?? "",
    };
  }
  return {
    company: "",
    designation: "",
    effective_date: format(new Date(), "yyyy-MM-dd"),
    previous_gross_salary: 0,
    new_gross_salary: 0,
    notes: "",
  };
}

export function SalaryAppraisalForm({
  open,
  onOpenChange,
  appraisal,
  onSuccess,
}: SalaryAppraisalFormProps) {
  const isEdit = !!appraisal;

  const form = useForm<SalaryAppraisalFormValues>({
    resolver: zodResolver(salaryAppraisalSchema) as any,
    defaultValues: buildDefaults(appraisal),
  });

  const isSubmitting = form.formState.isSubmitting;

  const watchPrev = form.watch("previous_gross_salary") || 0;
  const watchNew = form.watch("new_gross_salary") || 0;

  const hikePercent = watchPrev > 0 ? ((watchNew - watchPrev) / watchPrev) * 100 : 0;

  React.useEffect(() => {
    form.reset(buildDefaults(appraisal));
  }, [appraisal, form]);

  const onSubmit = async (values: SalaryAppraisalFormValues) => {
    const result = isEdit
      ? await updateSalaryAppraisal(appraisal!.id, values)
      : await createSalaryAppraisal(values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Appraisal details updated" : "Salary appraisal recorded");
    form.reset(buildDefaults(undefined));
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(appraisal));
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Edit Appraisal Record" : "Record Appraisal / Hike"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update details of this promotion or salary hike."
              : "Track your career milestones, designation changes, and salary hikes."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="salary-appraisal-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Effective Date */}
              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company / Employer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Senior Software Engineer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Salaries */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="previous_gross_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Previous Gross (Monthly)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="new_gross_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Gross (Monthly)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Live hike % calculator */}
              {watchPrev > 0 && watchNew > 0 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 mt-2 flex justify-between items-center text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Salary Hike Amount</span>
                    <span className="font-semibold text-emerald-500">+{formatCurrency(watchNew - watchPrev, "INR")} / month</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Hike Percentage</span>
                    <span className="font-bold text-emerald-500 text-lg">+{hikePercent.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add review feedback, details about variable pay changes, performance remarks, etc." className="resize-none" rows={3} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </form>
          </Form>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="salary-appraisal-form" disabled={isSubmitting} className="min-w-28 bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Recording…"}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Record Hike"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
