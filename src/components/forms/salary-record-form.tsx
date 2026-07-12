"use client";

// ==============================================
// SalaryRecordForm — Add / Edit Monthly Payslip
// React Hook Form + Zod
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QuickAccountDialog } from "@/components/accounts/quick-account-dialog";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { salaryRecordSchema, type SalaryRecordFormValues } from "@/lib/validations/salary.schemas";
import { formatCurrency } from "@/lib/utils";
import { createSalaryRecord, updateSalaryRecord } from "@/app/(dashboard)/salary/actions";
import type { Account, SalaryRecord } from "@/types/database";

interface SalaryRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: any;
  accounts: Account[];
  onSuccess?: () => void;
}

function buildDefaults(record?: any, defaultAccountId?: string | null): SalaryRecordFormValues {
  if (record) {
    return {
      month: record.month,
      company: record.company,
      designation: record.designation,
      basic: Number(record.basic),
      hra: Number(record.hra),
      special_allowance: Number(record.special_allowance),
      lta: Number(record.lta),
      pf_deduction: Number(record.pf_deduction),
      nps_deduction: Number(record.nps_deduction),
      tax_deduction: Number(record.tax_deduction),
      other_deductions: Number(record.other_deductions),
      notes: record.notes ?? "",
      create_income_transaction: !!record.income_id,
      account_id: record.income?.account_id || null,
    };
  }
  return {
    month: format(new Date(), "yyyy-MM"),
    company: "",
    designation: "",
    basic: 0,
    hra: 0,
    special_allowance: 0,
    lta: 0,
    pf_deduction: 0,
    nps_deduction: 0,
    tax_deduction: 0,
    other_deductions: 0,
    notes: "",
    create_income_transaction: true,
    account_id: defaultAccountId || null,
  };
}

export function SalaryRecordForm({
  open,
  onOpenChange,
  record,
  accounts,
  onSuccess,
}: SalaryRecordFormProps) {
  const defaultAcc = accounts.find((a) => (a as any).is_default) || accounts[0];
  const defaultAccId = defaultAcc?.id || null;
  const queryClient = useQueryClient();
  const [quickAccountOpen, setQuickAccountOpen] = React.useState(false);
  const isEdit = !!record;

  const form = useForm<SalaryRecordFormValues>({
    resolver: zodResolver(salaryRecordSchema) as any,
    defaultValues: buildDefaults(record, defaultAccId),
  });

  const isSubmitting = form.formState.isSubmitting;

  const watchBasic = form.watch("basic") || 0;
  const watchHra = form.watch("hra") || 0;
  const watchAllowance = form.watch("special_allowance") || 0;
  const watchLta = form.watch("lta") || 0;
  const watchPf = form.watch("pf_deduction") || 0;
  const watchNps = form.watch("nps_deduction") || 0;
  const watchTax = form.watch("tax_deduction") || 0;
  const watchOther = form.watch("other_deductions") || 0;
  const watchCreateTx = form.watch("create_income_transaction");

  const grossSalary = watchBasic + watchHra + watchAllowance + watchLta;
  const netSalary = grossSalary - watchPf - watchNps - watchTax - watchOther;

  React.useEffect(() => {
    form.reset(buildDefaults(record, defaultAccId));
  }, [record, form, defaultAccId]);

  const onSubmit = async (values: SalaryRecordFormValues) => {
    const result = isEdit
      ? await updateSalaryRecord(record!.id, values)
      : await createSalaryRecord(values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Salary record updated" : "Salary record saved");
    form.reset(buildDefaults(undefined, defaultAccId));
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(record, defaultAccId));
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Edit Payslip" : "Record Payslip"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update details of this month's salary credit."
              : "Enter your earnings and deductions breakdown for this month."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="salary-record-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Month */}
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Pay Month <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="month" {...field} />
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
                      <FormLabel>
                        Employer / Company <span className="text-destructive">*</span>
                      </FormLabel>
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
                      <FormLabel>
                        Designation <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Senior Developer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Earnings</h4>

              {/* Basic & HRA */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="basic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Basic Salary</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HRA (Rent Allowance)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Allowance & LTA */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="special_allowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Allowance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LTA (Travel Allowance)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-destructive">Deductions</h4>

              {/* Tax, PF & NPS */}
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="tax_deduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax (TDS)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pf_deduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provident Fund</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nps_deduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NPS (Pension)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Other deductions */}
              <FormField
                control={form.control}
                name="other_deductions"
                render={({ field }) => (
                  <FormItem className="w-1/2">
                    <FormLabel>Other Deductions</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-3 mt-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Gross Salary</span>
                  <span className="text-lg font-mono font-semibold">{formatCurrency(grossSalary, "INR")}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-500 block font-medium">Net Take-Home Pay</span>
                  <span className="text-lg font-mono font-bold text-emerald-500">{formatCurrency(netSalary, "INR")}</span>
                </div>
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Payslip references, extra allowances, tax notes, etc." className="resize-none" rows={2} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Accounts sync option */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Ledger Entry Integration</p>

                <FormField
                  control={form.control}
                  name="create_income_transaction"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer font-normal">Auto-post to Incomes Ledger</FormLabel>
                        <FormDescription>Create a corresponding entry in your transaction history</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchCreateTx && (
                  <FormField
                    control={form.control}
                    name="account_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Account (Optional)</FormLabel>
                        <div className="flex gap-2">
                          <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                            <FormControl className="flex-1">
                              <SelectTrigger>
                                <SelectValue placeholder="Select bank account for credit">
                                  {field.value ? accounts.find((acc) => acc.id === field.value)?.name : undefined}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts.map((acc) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="shrink-0 border-dashed hover:border-primary hover:text-primary"
                            onClick={() => setQuickAccountOpen(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
          <Button type="submit" form="salary-record-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Adding…"}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Save Payslip"
            )}
          </Button>
        </div>
      </SheetContent>

      <QuickAccountDialog
        open={quickAccountOpen}
        onOpenChange={setQuickAccountOpen}
        onSuccess={(newAcc) => {
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
          form.setValue("account_id", newAcc.id);
        }}
      />
    </Sheet>
  );
}
