"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash, Link2, StickyNote, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { TagInput } from "@/components/forms/tag-input";

import { noteFormSchema, type NoteFormValues } from "@/lib/validations/note.schemas";
import { createNote, updateNote } from "@/app/(dashboard)/notes/actions";
import { getGoals } from "@/app/(dashboard)/goals/actions";
import { getInvestments } from "@/app/(dashboard)/investments/actions";
import { clientGetExpenses, clientGetIncomes } from "@/lib/queries/client-queries";
import type { NoteWithRelations, Tag } from "@/types/database";

interface NoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: NoteWithRelations;
  tags: Tag[];
  onTagCreated?: (name: string) => Promise<string | null>;
  onSuccess?: () => void;
}

function buildDefaults(item?: NoteWithRelations): NoteFormValues {
  if (item) {
    return {
      title: item.title,
      content: item.content,
      tag_ids: item.tags.map((t) => t.id),
      links: item.links.map((l) => ({
        link_type: l.link_type,
        link_id: l.link_id,
      })),
    };
  }
  return {
    title: "",
    content: "",
    tag_ids: [],
    links: [],
  };
}

export function NoteForm({ open, onOpenChange, note, tags, onTagCreated, onSuccess }: NoteFormProps) {
  const isEdit = !!note;
  const [activeTab, setActiveTab] = React.useState<"write" | "preview">("write");

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema) as any,
    defaultValues: buildDefaults(note),
  });

  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
    control: form.control,
    name: "links",
  });

  const isSubmitting = form.formState.isSubmitting;

  React.useEffect(() => {
    form.reset(buildDefaults(note));
    setActiveTab("write");
  }, [note, form, open]);

  // Query linked resources in parallel
  const { data: goalsRes } = useQuery({
    queryKey: ["goals-list-notes"],
    queryFn: () => getGoals(),
    enabled: open,
  });

  const { data: investmentsRes } = useQuery({
    queryKey: ["investments-list-notes"],
    queryFn: () => getInvestments({ pageSize: 100 }),
    enabled: open,
  });

  const { data: expensesRes } = useQuery({
    queryKey: ["expenses-list-notes"],
    queryFn: () => clientGetExpenses({ pageSize: 100 }),
    enabled: open,
  });

  const { data: incomesRes } = useQuery({
    queryKey: ["incomes-list-notes"],
    queryFn: () => clientGetIncomes({ pageSize: 100 }),
    enabled: open,
  });

  const goals = goalsRes?.ok ? goalsRes.data : [];
  const investments = investmentsRes?.ok ? investmentsRes.data.data : [];
  const expenses = expensesRes?.data || [];
  const incomes = incomesRes?.data || [];

  const getLinkOptions = (type: string) => {
    switch (type) {
      case "goal":
        return goals.map((g) => ({ id: g.id, label: `Goal: ${g.name}` }));
      case "investment":
        return investments.map((i) => ({ id: i.id, label: `Asset: ${i.name} (${i.type})` }));
      case "expense":
        return expenses.map((e) => ({ id: e.id, label: `Expense: ${e.title} (INR ${Number(e.amount)})` }));
      case "income":
        return incomes.map((i) => ({ id: i.id, label: `Income: ${i.title} (INR ${Number(i.amount)})` }));
      default:
        return [];
    }
  };

  const onSubmit = async (values: NoteFormValues) => {
    const result = isEdit ? await updateNote(note!.id, values) : await createNote(values);

    if (!result.ok) {
      toast.error(result.error ?? "Something went wrong");
      return;
    }

    toast.success(isEdit ? "Financial note updated" : "Financial note created");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) form.reset(buildDefaults(note));
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl border-l border-border bg-card/95 backdrop-blur-md">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            {isEdit ? "Edit Financial Note" : "Create Financial Note"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update your markdown-enabled financial notes and linkages."
              : "Capture thoughts, research, journal entries, or link transactions together."}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="note-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Note Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note Title <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Analysis of Q3 Stock Allocations, PPF Sync Logic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags Section */}
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
                    <FormDescription className="text-[10px]">
                      Label this note for filtering and organization.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note Content (Markdown Editor with Write/Preview tabs) */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <FormLabel>Markdown Content</FormLabel>
                      <div className="flex rounded-lg bg-muted/60 p-0.5 border border-border/40">
                        <button
                          type="button"
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            activeTab === "write" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => setActiveTab("write")}
                        >
                          Write
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            activeTab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => setActiveTab("preview")}
                        >
                          Preview
                        </button>
                      </div>
                    </div>

                    <FormControl>
                      {activeTab === "write" ? (
                        <Textarea
                          placeholder="Write note content in Markdown format... Supports headers, lists, code, and bold text."
                          className="font-mono text-sm min-h-[180px] resize-y bg-background"
                          {...field}
                        />
                      ) : (
                        <div className="prose prose-sm prose-invert max-w-none min-h-[180px] rounded-md border border-border bg-background/50 p-3 overflow-y-auto text-foreground/90 leading-relaxed font-sans">
                          {field.value ? (
                            <div className="space-y-2 whitespace-pre-wrap">
                              {field.value}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Nothing to preview. Write something first!</span>
                          )}
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Linked items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Link2 className="h-4 w-4 text-primary" /> Associated Entities
                  </FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[10px] gap-1"
                    onClick={() => appendLink({ link_type: "goal", link_id: "" })}
                  >
                    <Plus className="h-3 w-3" /> Add Link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reference specific goals, transactions, or investments to keep your files organized together.
                </p>

                {linkFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    No active linkages. Use the "Add Link" button to link to a transaction or goal.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {linkFields.map((fieldItem, idx) => {
                      const watchedType = form.watch(`links.${idx}.link_type`);
                      const options = getLinkOptions(watchedType);

                      return (
                        <div key={fieldItem.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/15 p-2 transition-all">
                          <Select
                            value={watchedType}
                            onValueChange={(val) => {
                              form.setValue(`links.${idx}.link_type`, val as any);
                              form.setValue(`links.${idx}.link_id`, ""); // Reset selected ID
                            }}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs">
                              <SelectValue placeholder="Link Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="goal">Goal</SelectItem>
                              <SelectItem value="investment">Asset</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={form.watch(`links.${idx}.link_id`) ?? ""}
                            onValueChange={(val) => form.setValue(`links.${idx}.link_id`, val as any)}
                          >
                            <SelectTrigger className="h-8 flex-1 text-xs">
                              <SelectValue placeholder="Choose Resource..." />
                            </SelectTrigger>
                            <SelectContent>
                              {options.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No items found
                                </SelectItem>
                              ) : (
                                options.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => removeLink(idx)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
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
          <Button type="submit" form="note-form" disabled={isSubmitting} className="min-w-28 bg-primary text-primary-foreground">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Saving…" : "Creating…"}
              </>
            ) : isEdit ? (
              "Save Note"
            ) : (
              "Create Note"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
