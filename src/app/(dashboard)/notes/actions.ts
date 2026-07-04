"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/action-client";
import { requireAuth } from "@/app/(dashboard)/investments/actions";
import {
  noteFormSchema,
  noteFiltersSchema,
  type NoteFormValues,
  type NoteFilters,
} from "@/lib/validations/note.schemas";
import type { ActionResult } from "@/types";
import type {
  Note,
  NoteWithRelations,
  PaginatedResult,
  Tag,
  NoteLink,
  Attachment,
} from "@/types/database";

// ═══════════════════════════════════════════════
// NOTES CRUD ACTIONS
// ═══════════════════════════════════════════════

export async function getNotes(
  rawFilters: Partial<NoteFilters>
): Promise<ActionResult<PaginatedResult<NoteWithRelations>>> {
  try {
    const { supabase, userId } = await requireAuth();
    const filters = noteFiltersSchema.parse(rawFilters);

    // Build the base query for active notes
    let query = (supabase as any)
      .from("notes")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);

    // Apply search filter if provided
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Apply tag filter if provided
    if (filters.tagIds && filters.tagIds.length > 0) {
      const { data: noteTagsData } = await (supabase as any)
        .from("note_tags")
        .select("note_id")
        .in("tag_id", filters.tagIds);

      const noteIds = (noteTagsData || []).map((nt: any) => nt.note_id);
      if (noteIds.length === 0) {
        return {
          ok: true,
          data: {
            data: [],
            count: 0,
            page: filters.page,
            pageSize: filters.pageSize,
            pageCount: 0,
          },
        };
      }
      query = query.in("id", noteIds);
    }

    // Apply entity links filter if provided
    if (filters.linkType && filters.linkId) {
      const { data: noteLinksData } = await (supabase as any)
        .from("note_links")
        .select("note_id")
        .eq("link_type", filters.linkType)
        .eq("link_id", filters.linkId);

      const noteIds = (noteLinksData || []).map((nl: any) => nl.note_id);
      if (noteIds.length === 0) {
        return {
          ok: true,
          data: {
            data: [],
            count: 0,
            page: filters.page,
            pageSize: filters.pageSize,
            pageCount: 0,
          },
        };
      }
      query = query.in("id", noteIds);
    }

    // Apply sorting & pagination
    const start = (filters.page - 1) * filters.pageSize;
    const end = start + filters.pageSize - 1;

    const { data: notes, error, count } = await query
      .order(filters.sortBy, { ascending: filters.sortOrder === "asc" })
      .range(start, end);

    if (error) throw error;

    const totalCount = count ?? 0;
    const pageCount = Math.ceil(totalCount / filters.pageSize);

    // If no notes, return empty paginated result
    if (!notes || notes.length === 0) {
      return {
        ok: true,
        data: {
          data: [],
          count: totalCount,
          page: filters.page,
          pageSize: filters.pageSize,
          pageCount,
        },
      };
    }

    // Fetch tags, links, and attachments for all retrieved notes in batch
    const noteIds = notes.map((n: Note) => n.id);

    // Fetch Tags
    const { data: tagsData } = await (supabase as any)
      .from("note_tags")
      .select("note_id, tags(*)")
      .in("note_id", noteIds);

    // Fetch Links
    const { data: linksData } = await (supabase as any)
      .from("note_links")
      .select("*")
      .in("note_id", noteIds);

    // Fetch Attachments
    const { data: attachData } = await (supabase as any)
      .from("attachments")
      .select("*")
      .in("note_id", noteIds);

    // Combine notes with their relations
    const notesWithRelations: NoteWithRelations[] = notes.map((note: Note) => {
      const associatedTags = (tagsData || [])
        .filter((t: any) => t.note_id === note.id && t.tags)
        .map((t: any) => t.tags as Tag);

      const associatedLinks = (linksData || [])
        .filter((l: any) => l.note_id === note.id) as NoteLink[];

      const associatedAttachments = (attachData || [])
        .filter((a: any) => a.note_id === note.id) as Attachment[];

      return {
        ...note,
        tags: associatedTags,
        links: associatedLinks,
        attachments: associatedAttachments,
      };
    });

    return {
      ok: true,
      data: {
        data: notesWithRelations,
        count: totalCount,
        page: filters.page,
        pageSize: filters.pageSize,
        pageCount,
      },
    };
  } catch (err: any) {
    console.error("Error in getNotes server action:", err);
    return { ok: false, error: err.message || "Failed to fetch notes" };
  }
}

export async function getNoteById(id: string): Promise<ActionResult<NoteWithRelations>> {
  try {
    const { supabase, userId } = await requireAuth();

    // 1. Fetch note
    const { data: note, error } = await (supabase as any)
      .from("notes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) throw error;
    if (!note) throw new Error("Note not found");

    // 2. Fetch tags
    const { data: tagsData } = await (supabase as any)
      .from("note_tags")
      .select("tags(*)")
      .eq("note_id", note.id);

    const tags = (tagsData || []).map((t: any) => t.tags).filter(Boolean) as Tag[];

    // 3. Fetch links
    const { data: links } = await (supabase as any)
      .from("note_links")
      .select("*")
      .eq("note_id", note.id);

    // 4. Fetch attachments
    const { data: attachments } = await (supabase as any)
      .from("attachments")
      .select("*")
      .eq("note_id", note.id);

    return {
      ok: true,
      data: {
        ...note,
        tags,
        links: (links || []) as NoteLink[],
        attachments: (attachments || []) as Attachment[],
      },
    };
  } catch (err: any) {
    console.error("Error in getNoteById server action:", err);
    return { ok: false, error: err.message || "Failed to fetch note details" };
  }
}

export async function createNote(
  rawData: NoteFormValues
): Promise<ActionResult<Note>> {
  try {
    const { supabase, userId } = await requireAuth();
    const data = noteFormSchema.parse(rawData);

    // 1. Insert Note
    const { data: note, error } = await (supabase as any)
      .from("notes")
      .insert({
        user_id: userId,
        title: data.title,
        content: data.content,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Insert Tags if any
    if (data.tag_ids && data.tag_ids.length > 0) {
      const noteTags = data.tag_ids.map((tagId) => ({
        note_id: note.id,
        tag_id: tagId,
      }));
      const { error: tagErr } = await (supabase as any)
        .from("note_tags")
        .insert(noteTags);

      if (tagErr) throw tagErr;
    }

    // 3. Insert Links if any
    if (data.links && data.links.length > 0) {
      const noteLinks = data.links.map((link) => ({
        note_id: note.id,
        link_type: link.link_type,
        link_id: link.link_id,
      }));
      const { error: linkErr } = await (supabase as any)
        .from("note_links")
        .insert(noteLinks);

      if (linkErr) throw linkErr;
    }

    revalidatePath("/notes");
    revalidatePath("/timeline");
    return { ok: true, data: note as Note };
  } catch (err: any) {
    console.error("Error in createNote server action:", err);
    return { ok: false, error: err.message || "Failed to create note" };
  }
}

export async function updateNote(
  id: string,
  rawData: NoteFormValues
): Promise<ActionResult<Note>> {
  try {
    const { supabase, userId } = await requireAuth();
    const data = noteFormSchema.parse(rawData);

    // 1. Update note content
    const { data: note, error } = await (supabase as any)
      .from("notes")
      .update({
        title: data.title,
        content: data.content,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    // 2. Sync Tags (Delete then Insert)
    const { error: delTagsErr } = await (supabase as any)
      .from("note_tags")
      .delete()
      .eq("note_id", id);

    if (delTagsErr) throw delTagsErr;

    if (data.tag_ids && data.tag_ids.length > 0) {
      const noteTags = data.tag_ids.map((tagId) => ({
        note_id: id,
        tag_id: tagId,
      }));
      const { error: tagErr } = await (supabase as any)
        .from("note_tags")
        .insert(noteTags);

      if (tagErr) throw tagErr;
    }

    // 3. Sync Links (Delete then Insert)
    const { error: delLinksErr } = await (supabase as any)
      .from("note_links")
      .delete()
      .eq("note_id", id);

    if (delLinksErr) throw delLinksErr;

    if (data.links && data.links.length > 0) {
      const noteLinks = data.links.map((link) => ({
        note_id: id,
        link_type: link.link_type,
        link_id: link.link_id,
      }));
      const { error: linkErr } = await (supabase as any)
        .from("note_links")
        .insert(noteLinks);

      if (linkErr) throw linkErr;
    }

    revalidatePath("/notes");
    revalidatePath("/timeline");
    return { ok: true, data: note as Note };
  } catch (err: any) {
    console.error("Error in updateNote server action:", err);
    return { ok: false, error: err.message || "Failed to update note" };
  }
}

export async function deleteNote(id: string): Promise<ActionResult<void>> {
  try {
    const { supabase, userId } = await requireAuth();

    // Soft delete
    const { error } = await (supabase as any)
      .from("notes")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    revalidatePath("/notes");
    revalidatePath("/timeline");
    return { ok: true, data: undefined };
  } catch (err: any) {
    console.error("Error in deleteNote server action:", err);
    return { ok: false, error: err.message || "Failed to delete note" };
  }
}
