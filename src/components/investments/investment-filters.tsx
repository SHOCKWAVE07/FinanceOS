"use client";

// ==============================================
// InvestmentFilters — Phase 4
// Search input and Category dropdown filter.
// ==============================================

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InvestmentFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  type: string;
  onTypeChange: (val: string) => void;
  onClear: () => void;
}

export function InvestmentFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  onClear,
}: InvestmentFiltersProps) {
  const hasFilters = search || (type && type !== "all");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investments..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type Select */}
        <Select value={type} onValueChange={(val) => onTypeChange(val ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Asset Classes</SelectItem>
            <SelectItem value="mutual_fund">Mutual Funds</SelectItem>
            <SelectItem value="stock">Equities/Stocks</SelectItem>
            <SelectItem value="crypto">Crypto Assets</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="fixed_deposit">Fixed Deposits</SelectItem>
            <SelectItem value="ppf">PPF</SelectItem>
            <SelectItem value="nps">NPS</SelectItem>
            <SelectItem value="real_estate">Real Estate</SelectItem>
            <SelectItem value="other">Others</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Button */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-9 gap-1.5 px-3">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
