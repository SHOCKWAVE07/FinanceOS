"use client";

// ==============================================
// IncomeFilters Component — Phase 3
// Filters panel for incomes.
// ==============================================

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { CalendarIcon, Filter, RefreshCw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { CategoryCombobox } from "@/components/forms/category-combobox";
import type { Account, Category } from "@/types/database";
import type { IncomeFiltersFormValues } from "@/lib/validations/income.schemas";
import { cn } from "@/lib/utils";

interface IncomeFiltersProps {
  filters: Partial<IncomeFiltersFormValues>;
  onFiltersChange: (filters: Partial<IncomeFiltersFormValues>) => void;
  categories: Category[];
  accounts: Account[];
}

export function IncomeFilters({
  filters,
  onFiltersChange,
  categories,
  accounts,
}: IncomeFiltersProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [searchVal, setSearchVal] = React.useState(filters.search ?? "");

  React.useEffect(() => {
    setSearchVal(filters.search ?? "");
  }, [filters.search]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchVal !== (filters.search ?? "")) {
        onFiltersChange({ ...filters, search: searchVal || undefined, page: 1 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchVal, filters, onFiltersChange]);

  const handleClearFilters = () => {
    setSearchVal("");
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });
  };

  const setPresetDateRange = (preset: string) => {
    const today = new Date();
    let start: Date | undefined;
    let end: Date | undefined = today;

    switch (preset) {
      case "today":
        start = today;
        break;
      case "yesterday":
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case "last_7_days":
        start = subDays(today, 7);
        break;
      case "last_30_days":
        start = subDays(today, 30);
        break;
      case "this_month":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "last_month":
        start = startOfMonth(subDays(startOfMonth(today), 1));
        end = endOfMonth(subDays(startOfMonth(today), 1));
        break;
      case "this_year":
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      default:
        start = undefined;
        end = undefined;
    }

    onFiltersChange({
      ...filters,
      startDate: start ? format(start, "yyyy-MM-dd") : undefined,
      endDate: end ? format(end, "yyyy-MM-dd") : undefined,
      page: 1,
    });
  };

  const hasActiveFilters =
    !!filters.search ||
    !!filters.categoryId ||
    !!filters.startDate ||
    !!filters.endDate ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.isRecurring !== undefined;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-md">
      {/* Primary filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-70" />
          <Input
            placeholder="Search incomes by title…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchVal && (
            <button
              onClick={() => setSearchVal("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Date Range Popover */}
        <Popover>
          <PopoverTrigger
            className={cn(
              "flex h-8 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-normal",
              "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <CalendarIcon className="h-4 w-4 opacity-50" />
            {filters.startDate ? (
              filters.endDate ? (
                <>
                  {format(new Date(filters.startDate), "dd MMM yy")} -{" "}
                  {format(new Date(filters.endDate), "dd MMM yy")}
                </>
              ) : (
                `From ${format(new Date(filters.startDate), "dd MMM yy")}`
              )
            ) : (
              <span className="text-muted-foreground">Select date range</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Presets</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Today", value: "today" },
                  { label: "Yesterday", value: "yesterday" },
                  { label: "Last 7 Days", value: "last_7_days" },
                  { label: "Last 30 Days", value: "last_30_days" },
                  { label: "This Month", value: "this_month" },
                  { label: "Last Month", value: "last_month" },
                  { label: "This Year", value: "this_year" },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="xs"
                    onClick={() => setPresetDateRange(preset.value)}
                    className="justify-start text-xs font-normal"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <div className="border-t border-border/60 pt-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Custom Range</p>
                <div className="flex gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="start-date" className="text-[10px] text-muted-foreground">Start</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.startDate ?? ""}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          startDate: e.target.value || undefined,
                          page: 1,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="end-date" className="text-[10px] text-muted-foreground">End</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.endDate ?? ""}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          endDate: e.target.value || undefined,
                          page: 1,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Category Combobox */}
        <div className="w-full sm:w-48">
          <CategoryCombobox
            categories={categories}
            value={filters.categoryId}
            onChange={(val) => onFiltersChange({ ...filters, categoryId: val || undefined, page: 1 })}
            placeholder="All Categories"
          />
        </div>

        {/* Advanced trigger & clear */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn("gap-1.5 sm:w-auto", showAdvanced && "bg-accent")}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Advanced</span>
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-1 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Amount range */}
          <div className="space-y-1.5">
            <Label className="text-xs">Amount Range</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minAmount ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                    page: 1,
                  })
                }
                className="h-8 text-xs"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxAmount ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                    page: 1,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-1.5">
            <Label className="text-xs">Sort By</Label>
            <Select
              value={`${filters.sortBy ?? "date"}-${filters.sortOrder ?? "desc"}`}
              onValueChange={(val) => {
                if (!val) return;
                const [by, order] = val.split("-") as [any, any];
                onFiltersChange({
                  ...filters,
                  sortBy: by,
                  sortOrder: order,
                });
              }}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest Date</SelectItem>
                <SelectItem value="date-asc">Oldest Date</SelectItem>
                <SelectItem value="amount-desc">Highest Amount</SelectItem>
                <SelectItem value="amount-asc">Lowest Amount</SelectItem>
                <SelectItem value="title-asc">Title A-Z</SelectItem>
                <SelectItem value="created_at-desc">Recently Created</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-col justify-end gap-3 pb-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-recurring"
                checked={filters.isRecurring ?? false}
                onCheckedChange={(checked) =>
                  onFiltersChange({
                    ...filters,
                    isRecurring: checked === true ? true : undefined,
                    page: 1,
                  })
                }
              />
              <Label htmlFor="filter-recurring" className="text-xs font-normal cursor-pointer">
                Recurring only
              </Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
