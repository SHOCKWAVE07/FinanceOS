"use client";

// ==============================================
// CSVHandler — Phase 3
// Import and Export UI handler for incomes CSV files
// ==============================================

import * as React from "react";
import { Download, Upload, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { exportIncomesCSV, importIncomesCSV } from "@/app/(dashboard)/income/actions";
import type { IncomeFiltersFormValues } from "@/lib/validations/income.schemas";

interface CSVHandlerProps {
  filters: Partial<IncomeFiltersFormValues>;
  onSuccess: () => void;
}

export function CSVHandler({ filters, onSuccess }: CSVHandlerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);

  // ── Export Handler ─────────────────────────────
  const handleExport = async () => {
    toast.loading("Generating CSV export...", { id: "export-csv" });
    try {
      const result = await exportIncomesCSV(filters);
      if (!result.ok) {
        throw new Error(result.error);
      }

      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `incomes_export_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV exported successfully", { id: "export-csv" });
    } catch (err) {
      toast.error((err as Error).message, { id: "export-csv" });
    }
  };

  // ── Simple CSV Parser ──────────────────────────
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const results: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
        v.trim().replace(/^["']|["']$/g, "")
      );

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      results.push(row);
    }
    return results;
  };

  // ── Import Handler ─────────────────────────────
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setImporting(true);
    const toastId = toast.loading("Uploading and importing CSV...");

    try {
      const text = await file.text();
      const parsedRows = parseCSV(text);

      if (parsedRows.length === 0) {
        throw new Error("No data rows found in CSV file.");
      }

      const mappedRows = parsedRows.map((row) => {
        const findVal = (...keys: string[]) => {
          const matchedKey = Object.keys(row).find((k) =>
            keys.some((key) => k.toLowerCase() === key.toLowerCase())
          );
          return matchedKey ? row[matchedKey] : undefined;
        };

        return {
          Title: findVal("title", "name", "description") ?? "",
          Amount: findVal("amount", "value", "revenue") ?? "0",
          Date: findVal("date", "time", "received") ?? "",
          Currency: findVal("currency", "curr") ?? "INR",
          Category: findVal("category", "type") ?? "",
          Tags: findVal("tags", "tag", "labels") ?? "",
          Notes: findVal("notes", "note", "comment") ?? "",
          Source: findVal("source", "employer", "client") ?? "",
          Recurring: findVal("recurring", "repeat") ?? "false",
        };
      });

      const result = await importIncomesCSV(mappedRows);

      if (!result.ok) {
        throw new Error(result.error ?? "Failed to import rows");
      }

      toast.success(
        `Imported ${result.data?.imported ?? 0} incomes successfully.`,
        { id: toastId }
      );
      setIsOpen(false);
      setFile(null);
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleImport}>
            <DialogHeader>
              <DialogTitle>Import Incomes CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file containing your incomes. Columns should ideally include:
                <code className="block mt-1.5 p-1.5 rounded bg-muted font-mono text-[10px] text-foreground">
                  Date, Title, Amount, Currency, Category, Tags, Notes, Source, Recurring
                </code>
              </DialogDescription>
            </DialogHeader>

            <div className="my-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="csv-file" className="text-xs">
                  Choose CSV File
                </Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={importing}
                />
              </div>

              <div className="flex gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                <p>
                  Dates will be parsed automatically. Amount must be positive. Duplicates with the
                  same Date, Title, and Amount will be skipped.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!file || importing} className="min-w-24">
                {importing ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Upload & Parse"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
