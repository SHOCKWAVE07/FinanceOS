"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  Search,
  SlidersHorizontal,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  TrendingUp,
  StickyNote,
  Trophy,
  Target,
  Loader2,
  ChevronRight,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { clientGetTimeline } from "@/lib/queries/client-queries";
import { formatCurrency } from "@/lib/utils";
import type { TimelineEvent } from "@/types/database";

export default function TimelinePage() {
  // ── States ──────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Selected event for detail dialog
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<TimelineEvent | null>(null);

  // Debounced search to prevent heavy queries
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [selectedTypes, startDate, endDate]);

  // ── Queries ─────────────────────────────────────
  const { data: timelineRes, isLoading } = useQuery({
    queryKey: ["timeline", debouncedSearch, selectedTypes, startDate, endDate, page],
    queryFn: () =>
      clientGetTimeline({
        search: debouncedSearch || undefined,
        eventTypes: selectedTypes.length > 0 ? (selectedTypes as any) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        pageSize: 30,
      }),
  });

  const events = timelineRes?.data || [];
  const count = timelineRes?.count || 0;
  const pageCount = timelineRes?.pageCount || 0;

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setStartDate("");
    setEndDate("");
    setSearch("");
  };

  // Render type-specific badges/icons/colors
  const getEventMeta = (type: string) => {
    switch (type) {
      case "expense":
        return {
          icon: <ArrowUpRight className="h-4 w-4" />,
          colorClass: "text-rose-500 bg-rose-500/10 border-rose-500/20",
          dotClass: "bg-rose-500 ring-rose-500/20",
          label: "Expense",
        };
      case "income":
        return {
          icon: <ArrowDownLeft className="h-4 w-4" />,
          colorClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
          dotClass: "bg-emerald-500 ring-emerald-500/20",
          label: "Income",
        };
      case "salary":
        return {
          icon: <Briefcase className="h-4 w-4" />,
          colorClass: "text-teal-500 bg-teal-500/10 border-teal-500/20",
          dotClass: "bg-teal-500 ring-teal-500/20",
          label: "Salary",
        };
      case "investment_purchase":
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
          dotClass: "bg-blue-500 ring-blue-500/20",
          label: "Asset Purchase",
        };
      case "note":
        return {
          icon: <StickyNote className="h-4 w-4" />,
          colorClass: "text-purple-500 bg-purple-500/10 border-purple-500/20",
          dotClass: "bg-purple-500 ring-purple-500/20",
          label: "Note",
        };
      case "milestone_achieved":
        return {
          icon: <Trophy className="h-4 w-4" />,
          colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
          dotClass: "bg-amber-500 ring-amber-500/20",
          label: "Milestone Done",
        };
      case "milestone_pending":
        return {
          icon: <Target className="h-4 w-4" />,
          colorClass: "text-muted-foreground bg-muted/20 border-border",
          dotClass: "bg-muted-foreground ring-muted-foreground/20",
          label: "Milestone Target",
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          colorClass: "text-primary bg-primary/10 border-primary/20",
          dotClass: "bg-primary ring-primary/20",
          label: "Event",
        };
    }
  };

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Financial Timeline
          </h1>
          <p className="text-sm text-muted-foreground">
            A chronological summary ledger of all income, expenditures, note updates, and achievements.
          </p>
        </div>
        {/* Reset button */}
        {(selectedTypes.length > 0 || startDate || endDate || search) && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Options Bar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search timeline events..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="date"
              className="h-9 text-xs w-36"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-9 text-xs w-36"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>
        </div>

        {/* Filter Badges selection */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1.5 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" /> Filter Types:
          </span>
          {[
            { key: "expense", label: "Expenses" },
            { key: "income", label: "Incomes" },
            { key: "salary", label: "Salary Records" },
            { key: "investment_purchase", label: "Asset Purchases" },
            { key: "note", label: "Notes" },
            { key: "milestone_achieved", label: "Milestones Done" },
            { key: "milestone_pending", label: "Milestones Target" },
          ].map((type) => {
            const isSelected = selectedTypes.includes(type.key);
            return (
              <Badge
                key={type.key}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer text-[10px] px-2.5 py-0.5 rounded-full select-none font-semibold transition-all ${
                  isSelected ? "bg-primary text-primary-foreground border-transparent" : "hover:bg-muted/40"
                }`}
                onClick={() => toggleTypeFilter(type.key)}
              >
                {type.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Timeline Event Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Reconstructing chronological feed...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-card/25">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-sm text-foreground">No Events Recorded</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1.5 leading-relaxed">
            {search || selectedTypes.length > 0 || startDate || endDate
              ? "No financial events match your filters. Try broadening your criteria."
              : "No activities registered yet. Try creating expenses, notes, or investments to start populating the feed."}
          </p>
        </div>
      ) : (
        <div className="relative border-l border-border/80 ml-4 md:ml-6 space-y-6 pb-6">
          {events.map((event, idx) => {
            const meta = getEventMeta(event.event_type);
            const dateStr = format(new Date(event.event_date), "PPP");
            const isAmountApplicable = event.amount !== null && event.amount !== undefined;

            return (
              <div key={`${event.event_id}-${idx}`} className="relative pl-6 md:pl-8 group">
                {/* Visual marker dot */}
                <div
                  className={`absolute -left-[9px] top-1.5 rounded-full h-4 w-4 ring-4 border-2 border-background transition-all group-hover:scale-110 ${meta.dotClass}`}
                />

                {/* Event Card wrapper */}
                <div
                  className="rounded-xl border border-border/70 bg-card hover:bg-muted/10 hover:border-border transition-all p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer shadow-sm hover:shadow"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {dateStr}
                      </span>
                      <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.colorClass}`}>
                        {meta.label}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 truncate max-w-2xl leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    {/* Amount value */}
                    {isAmountApplicable ? (
                      <span
                        className={`text-sm font-mono font-bold ${
                          event.event_type === "expense" || event.event_type === "investment_purchase"
                            ? "text-rose-400"
                            : event.event_type === "income" || event.event_type === "salary"
                            ? "text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {event.event_type === "expense" || event.event_type === "investment_purchase" ? "-" : "+"}
                        {formatCurrency(Number(event.amount), event.currency ?? "INR")}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic select-none">No value</span>
                    )}

                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground font-mono">
            Page {page} of {pageCount} ({count} total events)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* Timeline Event Details Sheet Drawer */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md border-l border-border bg-card/95 backdrop-blur-md">
          {selectedEvent && (
            <>
              {/* Header */}
              <SheetHeader className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${getEventMeta(selectedEvent.event_type).colorClass}`}>
                    {getEventMeta(selectedEvent.event_type).label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {format(new Date(selectedEvent.event_date), "PPP p")}
                  </span>
                </div>
                <SheetTitle className="text-lg font-bold text-foreground leading-tight">
                  {selectedEvent.title}
                </SheetTitle>
                <SheetDescription>
                  Detailed chronological event record parameters.
                </SheetDescription>
              </SheetHeader>

              <Separator />

              {/* Sheet content area */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                {/* Amount Detail Card */}
                {selectedEvent.amount !== null && (
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaction Value</span>
                    <div className="font-mono text-xl font-bold flex items-center gap-1">
                      <DollarSign className={`h-5 w-5 ${
                        selectedEvent.event_type === "expense" || selectedEvent.event_type === "investment_purchase"
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`} />
                      <span className={
                        selectedEvent.event_type === "expense" || selectedEvent.event_type === "investment_purchase"
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }>
                        {formatCurrency(Number(selectedEvent.amount), selectedEvent.currency ?? "INR")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.description ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Event Notes & Description</h4>
                    <p className="text-xs leading-relaxed text-foreground/80 bg-muted/10 p-3 rounded-lg border border-border/40 whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No details/notes logged for this event.</div>
                )}
              </div>

              <Separator />

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                  Close Details
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
