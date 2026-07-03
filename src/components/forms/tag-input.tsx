"use client";

// ==============================================
// TagInput — create-on-type chip tag picker
// Supports selecting existing tags and creating new ones
// ==============================================

import * as React from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types/database";

interface TagInputProps {
  /** All available tags for the current user */
  availableTags: Tag[];
  /** Currently selected tag IDs */
  value: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
  /** Called when user types a new tag name that doesn't exist yet */
  onCreateTag?: (name: string) => Promise<string | null>; // returns new tag id
}

export function TagInput({
  availableTags,
  value,
  onChange,
  disabled,
  onCreateTag,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const selectedTags = availableTags.filter((t) => value.includes(t.id));
  const filtered = availableTags.filter(
    (t) =>
      !value.includes(t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );
  const canCreate =
    search.trim().length > 0 &&
    !availableTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase()) &&
    onCreateTag;

  const handleSelect = (tagId: string) => {
    onChange([...value, tagId]);
    setSearch("");
  };

  const handleRemove = (tagId: string) => {
    onChange(value.filter((id) => id !== tagId));
  };

  const handleCreate = async () => {
    if (!canCreate || !search.trim()) return;
    setCreating(true);
    try {
      const newId = await onCreateTag(search.trim());
      if (newId) onChange([...value, newId]);
      setSearch("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected tag chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
              style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
            >
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemove(tag.id)}
                  className="ml-0.5 rounded-full hover:bg-muted"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Picker */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground hover:bg-muted"
            aria-label="Add tag"
          >
            <Plus className="h-3 w-3" />
            Add tag
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <Input
              placeholder="Search or create tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length > 0) {
                    handleSelect(filtered[0].id);
                  } else if (canCreate) {
                    void handleCreate();
                  }
                }
              }}
              className="mb-2 h-8 text-xs"
              autoFocus
            />

            <div className="max-h-40 space-y-0.5 overflow-y-auto">
              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    handleSelect(tag.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                >
                  {tag.color && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  {tag.name}
                </button>
              ))}

              {filtered.length === 0 && !canCreate && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  No tags found.
                </p>
              )}

              {canCreate && (
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={creating}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1 text-sm",
                    "hover:bg-accent text-primary"
                  )}
                >
                  <Plus className="h-3 w-3" />
                  {creating ? "Creating…" : `Create "${search.trim()}"`}
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
