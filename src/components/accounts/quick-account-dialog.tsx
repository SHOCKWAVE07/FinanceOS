"use client";

// ==============================================
// QuickAccountDialog — Inline Account Creation
// Beautiful dialog to create cash/bank accounts on the fly.
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAccount } from "@/app/(dashboard)/expenses/actions";
import type { Account, AccountType } from "@/types/database";

const accountFormSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["savings", "current", "credit_card", "wallet", "cash", "loan", "other"]),
  institution: z.string().optional().nullable(),
  balance: z.number().default(0),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface QuickAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (account: Account) => void;
}

export function QuickAccountDialog({ open, onOpenChange, onSuccess }: QuickAccountDialogProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema) as any,
    defaultValues: {
      name: "",
      type: "savings",
      institution: "",
      balance: 0,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        type: "savings",
        institution: "",
        balance: 0,
      });
    }
  }, [open, form]);

  const onSubmit = async (values: AccountFormValues) => {
    const result = await createAccount({
      name: values.name,
      type: values.type as AccountType,
      institution: values.institution || null,
      balance: Number(values.balance || 0),
    });

    if (!result.ok) {
      toast.error(result.error ?? "Failed to create account");
      return;
    }

    toast.success(`Account "${values.name}" created successfully`);
    onOpenChange(false);
    onSuccess?.(result.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>New Financial Account</DialogTitle>
          <DialogDescription>
            Add a savings, current, wallet, or credit card account to track transactions and balances.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="quick-account-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            
            {/* Account Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC Savings, Cash Wallet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="current">Current Account</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="wallet">Digital Wallet</SelectItem>
                      <SelectItem value="cash">Cash / Physical</SelectItem>
                      <SelectItem value="loan">Loan Account</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Institution */}
            <FormField
              control={form.control}
              name="institution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC Bank, SBI" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Balance */}
            <FormField
              control={form.control}
              name="balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Balance (INR)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </form>
        </Form>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="quick-account-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
