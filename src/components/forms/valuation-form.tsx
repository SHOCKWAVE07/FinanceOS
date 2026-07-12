"use client";

// ==============================================
// ValuationForm (Repurposed as InvestmentAdjustmentForm)
// Sheet to add or withdraw principal to/from an investment asset.
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

import { adjustmentSchema, type AdjustmentFormValues } from "@/lib/validations/investment.schemas";
import { adjustInvestmentPrincipal } from "@/app/(dashboard)/investments/actions";
import { formatCurrency } from "@/lib/utils";
import type { Investment, Account } from "@/types/database";

interface ValuationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment;
  accounts: Account[];
  onSuccess?: () => void;
}

export function ValuationForm({
  open,
  onOpenChange,
  investment,
  accounts,
  onSuccess,
}: ValuationFormProps) {
  const defaultAcc = accounts.find((a) => (a as any).is_default) || accounts[0];

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema) as any,
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      type: "add",
      amount: 0,
      account_id: "",
      sync_ledger: true,
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const watchType = form.watch("type");
  const watchAmount = form.watch("amount") || 0;

  React.useEffect(() => {
    if (investment && open) {
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
        type: "add",
        amount: 0,
        account_id: investment.account_id || defaultAcc?.id || "",
        sync_ledger: true,
      });
    }
  }, [investment, open, form, defaultAcc]);

  const onSubmit = async (values: AdjustmentFormValues) => {
    if (!investment) return;
    
    // Ensure amount is positive
    if (values.amount <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    const result = await adjustInvestmentPrincipal(investment.id, values);

    if (!result.ok) {
      toast.error(result.error ?? "Failed to adjust investment principal");
      return;
    }

    toast.success(
      values.type === "add"
        ? `Successfully added ${formatCurrency(values.amount, "INR")} to ${investment.name}`
        : `Successfully withdrew ${formatCurrency(values.amount, "INR")} from ${investment.name}`
    );
    onOpenChange(false);
    onSuccess?.();
  };

  const currentPrincipal = investment ? Number(investment.invested_amount) : 0;
  const newPrincipal = watchType === "add" 
    ? currentPrincipal + watchAmount 
    : Math.max(0, currentPrincipal - watchAmount);

  const selectedAccountId = form.watch("account_id");
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md bg-background">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>Adjust Capital</SheetTitle>
          <SheetDescription>
            Add new capital investments or record withdrawals for{" "}
            <span className="font-semibold text-foreground">{investment?.name}</span>.
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Live Preview Card */}
          {investment && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 shadow-inner">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Holding Balance Preview</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs text-muted-foreground">Current Principal</span>
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {formatCurrency(currentPrincipal, "INR")}
                  </p>
                </div>
                <div className="space-y-0.5 text-right">
                  <span className="text-xs text-muted-foreground">Adjustment</span>
                  <p className={`font-mono text-sm font-semibold flex items-center justify-end gap-0.5 ${
                    watchAmount === 0 
                      ? "text-muted-foreground" 
                      : watchType === "add" 
                        ? "text-emerald-500" 
                        : "text-destructive"
                  }`}>
                    {watchAmount > 0 && (watchType === "add" ? "+" : "-")}
                    {formatCurrency(watchAmount, "INR")}
                  </p>
                </div>
              </div>
              <Separator className="bg-border/60" />
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-semibold text-foreground">New Estimated Principal</span>
                <span className="font-mono text-base font-bold text-primary">
                  {formatCurrency(newPrincipal, "INR")}
                </span>
              </div>
              {watchAmount > 0 && selectedAccount && (
                <div className="text-[11px] text-muted-foreground leading-normal mt-1 border-t border-dashed border-border/80 pt-2 flex items-start gap-1">
                  <span>ℹ️</span>
                  <span>
                    This action will automatically {watchType === "add" ? "debit (subtract)" : "credit (add)"}{" "}
                    <strong className="text-foreground font-semibold">{formatCurrency(watchAmount, "INR")}</strong>{" "}
                    {watchType === "add" ? "from" : "to"} your account{" "}
                    <strong className="text-foreground font-semibold">{selectedAccount.name}</strong> to balance the ledger.
                  </span>
                </div>
              )}
            </div>
          )}

          <Form {...form}>
            <form id="adjustment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Adjustment Type (Add or Subtract) */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Transaction Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div>
                          <RadioGroupItem
                            value="add"
                            id="type-add"
                            className="peer sr-only"
                          />
                          <label
                            htmlFor="type-add"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-500/5 [&:has([data-state=checked])]:border-emerald-500 cursor-pointer transition-all"
                          >
                            <ArrowUpRight className="h-5 w-5 mb-1 text-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Add Capital</span>
                          </label>
                        </div>
                        <div>
                          <RadioGroupItem
                            value="subtract"
                            id="type-subtract"
                            className="peer sr-only"
                          />
                          <label
                            htmlFor="type-subtract"
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:bg-destructive/5 [&:has([data-state=checked])]:border-destructive cursor-pointer transition-all"
                          >
                            <ArrowDownRight className="h-5 w-5 mb-1 text-destructive" />
                            <span className="text-xs font-semibold text-destructive">Withdraw Capital</span>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                          ₹
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="pl-7 font-mono font-medium"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the principal amount to {watchType === "add" ? "invest" : "withdraw"}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Account Selector */}
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchType === "add" ? "Source Account (Debit)" : "Destination Account (Credit)"}</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank/cash account">
                            {field.value ? accounts.find((acc) => acc.id === field.value)?.name : undefined}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(Number(acc.balance), "INR")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This account balance will be updated automatically.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sync Ledger Option */}
              <FormField
                control={form.control}
                name="sync_ledger"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-3 shadow-sm bg-card/40">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">Ledger Integration</FormLabel>
                      <FormDescription className="text-xs text-muted-foreground max-w-[280px]">
                        Log this {watchType === "add" ? "outflow as an expense" : "inflow as an income"} in your transaction history automatically.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
        <div className="flex items-center justify-between px-6 py-4 bg-muted/20">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="adjustment-form" 
            disabled={isSubmitting} 
            className={`min-w-28 text-white ${
              watchType === "add" 
                ? "bg-emerald-600 hover:bg-emerald-700" 
                : "bg-destructive hover:bg-destructive/90"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : watchType === "add" ? (
              "Invest Capital"
            ) : (
              "Withdraw Capital"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
