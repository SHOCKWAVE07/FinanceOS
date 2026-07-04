"use client";

// ==============================================
// GoalFilters — Filter and search goals
// ==============================================

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface GoalFiltersProps {
  search: string;
  onSearchChange: (search: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  onClear: () => void;
}

export function GoalFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  onClear,
}: GoalFiltersProps) {
  const hasActiveFilters = search !== "" || category !== "all" || status !== "all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card/20 border border-border p-4 rounded-xl">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search goals by name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Category */}
        <Select value={category} onValueChange={(val) => onCategoryChange(val ?? "all")}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="retirement">Retirement</SelectItem>
            <SelectItem value="house">House / Property</SelectItem>
            <SelectItem value="car">Car / Vehicle</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="vacation">Vacation</SelectItem>
            <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
            <SelectItem value="other">Other / General</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={status} onValueChange={(val) => onStatusChange(val ?? "all")}>
          <SelectTrigger className="w-full sm:w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={onClear} className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
