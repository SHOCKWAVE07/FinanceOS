"use client";

// ==============================================
// ValuationForm — Phase 4
// Sheet to quickly log current valuation snapshots.
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
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { valuationSchema, type ValuationFormValues } from "@/lib/validations/investment.schemas";
import { addValuationSnapshot } from "@/app/(dashboard)/investments/actions";
import type { Investment } from "@/types/database";

interface ValuationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
  onSuccess?: () => void;
}

export function ValuationForm({
  open,
  onOpenChange,
  investment,
  onSuccess,
}: ValuationFormProps) {
  const form = useForm<ValuationFormValues>({
    resolver: zodResolver(valuationSchema) as any,
    defaultValues: {
      valuation_date: format(new Date(), "yyyy-MM-dd"),
      value: 0,
      invested_amount: 0,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  React.useEffect(() => {
    if (investment) {
      form.reset({
        valuation_date: format(new Date(), "yyyy-MM-dd"),
        value: Number(investment.current_value),
        invested_amount: Number(investment.invested_amount),
      });
    }
  }, [investment, form]);

  const onSubmit = async (values: ValuationFormValues) => {
    if (!investment) return;
    const result = await addValuationSnapshot(investment.id, values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success("Valuation updated successfully");
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>Update Valuation</SheetTitle>
          <SheetDescription>
            Record today's valuation or update historical snapshots for{" "}
            <span className="font-semibold text-foreground">{investment?.name}</span>.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="valuation-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Valuation Date */}
              <FormField
                control={form.control}
                name="valuation_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valuation Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invested Amount (Cumulative) */}
              <FormField
                control={form.control}
                name="invested_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Invested Capital (Principal)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Current Value */}
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Asset Value</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="valuation-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Update Value"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
