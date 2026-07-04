"use server";

import { createActionClient } from "@/lib/supabase/action-client";
import { requireAuth } from "@/app/(dashboard)/investments/actions";
import {
  timelineFiltersSchema,
  type TimelineFilters,
} from "@/lib/validations/note.schemas";
import type { ActionResult } from "@/types";
import type {
  TimelineEvent,
  PaginatedResult,
} from "@/types/database";

// ═══════════════════════════════════════════════
// TIMELINE SERVER ACTIONS
// ═══════════════════════════════════════════════

export async function getTimeline(
  rawFilters: Partial<TimelineFilters>
): Promise<ActionResult<PaginatedResult<TimelineEvent>>> {
  try {
    const { supabase, userId } = await requireAuth();
    const filters = timelineFiltersSchema.parse(rawFilters);

    // Query from the timeline_events database view
    let query = (supabase as any)
      .from("timeline_events")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // Apply search filter if provided
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply event types filter if provided
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      query = query.in("event_type", filters.eventTypes);
    }

    // Apply date range filters if provided
    if (filters.startDate) {
      query = query.gte("event_date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("event_date", filters.endDate);
    }

    // Apply sorting & pagination
    const start = (filters.page - 1) * filters.pageSize;
    const end = start + filters.pageSize - 1;

    const { data: events, error, count } = await query
      .order(filters.sortBy, { ascending: filters.sortOrder === "asc" })
      .range(start, end);

    if (error) throw error;

    const totalCount = count ?? 0;
    const pageCount = Math.ceil(totalCount / filters.pageSize);

    return {
      ok: true,
      data: {
        data: (events || []) as TimelineEvent[],
        count: totalCount,
        page: filters.page,
        pageSize: filters.pageSize,
        pageCount,
      },
    };
  } catch (err: any) {
    console.error("Error in getTimeline server action:", err);
    return { ok: false, error: err.message || "Failed to fetch timeline events" };
  }
}
