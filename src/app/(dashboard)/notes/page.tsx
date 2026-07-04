"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Search, Plus, Loader2, Tag as TagIcon, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NoteDetail } from "@/components/notes/note-detail";
import { NoteForm } from "@/components/forms/note-form";

import { clientGetNotes, clientGetTags } from "@/lib/queries/client-queries";
import { createTag } from "@/app/(dashboard)/expenses/actions";
import type { NoteWithRelations, Tag } from "@/types/database";

export default function NotesPage() {
  const queryClient = useQueryClient();

  // ── States ──────────────────────────────────────
  const [search, setSearch] = React.useState("");
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingNote, setEditingNote] = React.useState<NoteWithRelations | undefined>(undefined);

  // Debounced search to prevent heavy queries
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Queries ─────────────────────────────────────
  const { data: notesRes, isLoading: listLoading, refetch: refetchNotes } = useQuery({
    queryKey: ["notes", debouncedSearch, selectedTagIds],
    queryFn: () =>
      clientGetNotes({
        search: debouncedSearch || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        pageSize: 100,
      }),
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () => clientGetTags(),
  });

  const activeNotes = notesRes?.data || [];

  // Find currently selected note details
  const selectedNote = React.useMemo(() => {
    if (!selectedNoteId) return null;
    return activeNotes.find((n) => n.id === selectedNoteId) || null;
  }, [selectedNoteId, activeNotes]);

  // If selectedNoteId is not in notes list (e.g. filtered out), deselect it
  React.useEffect(() => {
    if (selectedNoteId && activeNotes.length > 0) {
      const exists = activeNotes.some((n) => n.id === selectedNoteId);
      if (!exists) {
        // Find if it was just loaded or set it to the first item
        setSelectedNoteId(activeNotes[0]?.id || null);
      }
    } else if (!selectedNoteId && activeNotes.length > 0) {
      setSelectedNoteId(activeNotes[0]?.id);
    }
  }, [activeNotes, selectedNoteId]);

  // ── Mutations ──────────────────────────────────
  const inlineTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await createTag(name);
      if (!res.ok) throw new Error(res.error);
      return res.data.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  // ── Handlers ────────────────────────────────────
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const handleEditClick = (noteToEdit: NoteWithRelations) => {
    setEditingNote(noteToEdit);
    setFormOpen(true);
  };

  const handleAddClick = () => {
    setEditingNote(undefined);
    setFormOpen(true);
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearTagFilters = () => {
    setSelectedTagIds([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-border bg-card/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            Financial Notes & Journal
          </h1>
          <p className="text-xs text-muted-foreground">
            Document research, log decisions, and link thoughts to financial plans.
          </p>
        </div>
        <Button onClick={handleAddClick} size="sm" className="gap-1.5 shadow-sm">
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Notes List Sidebar */}
        <div className="w-80 border-r border-border flex flex-col bg-card/20 shrink-0">
          {/* Search bar */}
          <div className="p-3 border-b border-border/80 bg-background/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search notes..."
                className="pl-8 h-8 text-xs bg-card/60"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Tag filter pills */}
          {tags.length > 0 && (
            <div className="p-2 border-b border-border/60 overflow-x-auto whitespace-nowrap bg-muted/10 scrollbar-none flex items-center gap-1.5 min-h-[40px]">
              <TagIcon className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
              {selectedTagIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={clearTagFilters}
                  title="Clear tag filters"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              {tags.map((tag: Tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer text-[9px] px-2 py-0.5 rounded-full select-none font-semibold transition-all shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "hover:bg-muted/40"
                    }`}
                    style={
                      !isSelected && tag.color
                        ? { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}0a` }
                        : undefined
                    }
                    onClick={() => toggleTagFilter(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Notes scroll list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs">Loading notes...</span>
              </div>
            ) : activeNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center p-4">
                <AlertCircle className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-foreground">No notes found</span>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px]">
                  {search || selectedTagIds.length > 0
                    ? "Try adjusting your search query or tag filters."
                    : "Get started by adding your first financial note."}
                </p>
              </div>
            ) : (
              activeNotes.map((note) => {
                const isSelected = selectedNoteId === note.id;
                const dateStr = format(new Date(note.created_at), "MMM d, yyyy");

                return (
                  <div
                    key={note.id}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/5 border-primary/50 shadow-sm"
                        : "bg-card border-border/80 hover:bg-muted/20 hover:border-border"
                    }`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs truncate text-foreground">{note.title}</h4>
                      <span className="text-[9px] text-muted-foreground font-mono shrink-0">{dateStr}</span>
                    </div>

                    {/* Content Preview */}
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {note.content || <span className="italic">No content</span>}
                    </p>

                    {/* Small tags row */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.tags.slice(0, 3).map((tag: any) => (
                          <span
                            key={tag.id}
                            className="text-[8px] font-semibold px-1 rounded-sm border shrink-0"
                            style={tag.color ? { borderColor: `${tag.color}40`, color: tag.color, backgroundColor: `${tag.color}05` } : undefined}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-[8px] font-semibold text-muted-foreground px-1 shrink-0">
                            +{note.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Note Details Panel */}
        <div className="flex-1 p-6 overflow-hidden min-w-0 bg-background/30">
          <NoteDetail
            note={selectedNote}
            onEdit={handleEditClick}
            onDeleteSuccess={() => {
              setSelectedNoteId(null);
              invalidateAll();
            }}
          />
        </div>
      </div>

      {/* Add / Edit Note Drawer */}
      <NoteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        note={editingNote}
        tags={tags}
        onSuccess={invalidateAll}
        onTagCreated={async (name) => inlineTagMutation.mutateAsync(name)}
      />
    </div>
  );
}
