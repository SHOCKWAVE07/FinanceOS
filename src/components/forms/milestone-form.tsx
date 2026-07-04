"use client";

// ==============================================
// MilestoneForm — Add / Edit Goal Milestone
// React Hook Form + Zod validation
// ==============================================

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

import { milestoneFormSchema, type MilestoneFormValues } from "@/lib/validations/goal.schemas";
import { createMilestone, updateMilestone } from "@/app/(dashboard)/goals/actions";
import type { Milestone } from "@/types/database";

interface MilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  milestone?: Milestone;
  onSuccess?: () => void;
}

function buildDefaults(item?: Milestone): MilestoneFormValues {
  if (item) {
    return {
      name: item.name,
      target_amount: item.target_amount !== null && item.target_amount !== undefined ? Number(item.target_amount) : null,
      target_date: item.target_date ?? "",
      is_completed: !!item.is_completed,
    };
  }
  return {
    name: "",
    target_amount: null,
    target_date: "",
    is_completed: false,
  };
}

export function MilestoneForm({ open, onOpenChange, goalId, milestone, onSuccess }: MilestoneFormProps) {
  const isEdit = !!milestone;

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema) as any,
    defaultValues: buildDefaults(milestone),
  });

  const isSubmitting = form.formState.isSubmitting;

  React.useEffect(() => {
    form.reset(buildDefaults(milestone));
  }, [milestone, form, open]);

  const onSubmit = async (values: MilestoneFormValues) => {
    const result = isEdit
      ? await updateMilestone(milestone!.id, values)
      : await createMilestone(goalId, values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Milestone updated" : "Milestone created");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(milestone));
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md border-l border-border bg-card/95 backdrop-blur-md">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Edit Milestone" : "Add Milestone"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update details of this milestone target."
              : "Define an intermediate target step to track this goal's roadmap."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="milestone-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Milestone Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Milestone Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Save ₹1,00,000, Complete documentation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Amount */}
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 50000"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-[10px]">
                      Specify a target financial value for this specific milestone if applicable.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Date */}
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Is Completed */}
              <FormField
                control={form.control}
                name="is_completed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/10">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">Mark as Completed</FormLabel>
                      <FormDescription className="text-[10px]">
                        Check this if you have achieved this milestone.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <Separator />

        <div className="flex items-center justify-between px-6 py-4">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="milestone-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Adding…"}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Milestone"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
