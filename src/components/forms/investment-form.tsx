"use client";

// ==============================================
// InvestmentForm — Add / Edit Investment Asset
// React Hook Form + Zod validation
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { investmentSchema, type InvestmentFormValues } from "@/lib/validations/investment.schemas";
import { createInvestment, updateInvestment } from "@/app/(dashboard)/investments/actions";
import type { Investment } from "@/types/database";

interface InvestmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
  onSuccess?: () => void;
}

function buildDefaults(item?: Investment): InvestmentFormValues {
  if (item) {
    return {
      name: item.name,
      type: item.type,
      institution: item.institution,
      invested_amount: Number(item.invested_amount),
      current_value: Number(item.current_value),
      quantity: item.quantity !== null && item.quantity !== undefined ? Number(item.quantity) : null,
      avg_buy_price: item.avg_buy_price !== null && item.avg_buy_price !== undefined ? Number(item.avg_buy_price) : null,
      currency: item.currency || "INR",
      start_date: item.start_date,
      notes: item.notes ?? "",
    };
  }
  return {
    name: "",
    type: "mutual_fund",
    institution: "",
    invested_amount: 0,
    current_value: 0,
    quantity: null,
    avg_buy_price: null,
    currency: "INR",
    start_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  };
}

export function InvestmentForm({
  open,
  onOpenChange,
  investment,
  onSuccess,
}: InvestmentFormProps) {
  const isEdit = !!investment;

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema) as any,
    defaultValues: buildDefaults(investment),
  });

  const isSubmitting = form.formState.isSubmitting;

  React.useEffect(() => {
    form.reset(buildDefaults(investment));
  }, [investment, form]);

  const onSubmit = async (values: InvestmentFormValues) => {
    const result = isEdit
      ? await updateInvestment(investment!.id, values)
      : await createInvestment(values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Investment asset updated" : "Investment asset recorded");
    form.reset(buildDefaults(undefined));
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(investment));
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Edit Investment Asset" : "Add Investment Asset"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update details of this portfolio holding."
              : "Enter details for your new investment asset."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="investment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Asset Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Asset Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Parag Parikh Flexi Cap Fund" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type & Institution */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Asset Type <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val as any)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                          <SelectItem value="stock">Equity/Stock</SelectItem>
                          <SelectItem value="crypto">Crypto Asset</SelectItem>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                          <SelectItem value="ppf">PPF</SelectItem>
                          <SelectItem value="nps">NPS</SelectItem>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Institution / Broker <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Zerodha, SBI, Groww" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Invested Amount & Current Value */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="invested_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invested Value (Principal)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Quantity & Avg Buy Price (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity (Units/Shares)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.000001" 
                          placeholder="Optional" 
                          {...field} 
                          value={field.value ?? ""} 
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avg_buy_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avg Buy Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001" 
                          placeholder="Optional" 
                          {...field} 
                          value={field.value ?? ""} 
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Purchase Date */}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Investment Start Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Holding details, specific goals linked, maturity date, policy numbers, etc." className="resize-none" rows={3} {...field} value={field.value ?? ""} />
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
          <Button type="submit" form="investment-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Adding…"}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Asset"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
