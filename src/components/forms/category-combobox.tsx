"use client";

// ==============================================
// CategoryCombobox — searchable category picker
// Shows parent → child hierarchy
// ==============================================

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/database";

interface CategoryComboboxProps {
  categories: Category[];
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  onCreateCategory?: (name: string) => Promise<string | null>;
}

export function CategoryCombobox({
  categories,
  value,
  onChange,
  placeholder = "Select category…",
  disabled,
  onCreateCategory,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // Separate parents and children
  const parents = categories.filter((c) => !c.parent_id && c.is_active);
  const children = categories.filter((c) => c.parent_id && c.is_active);

  const selected = categories.find((c) => c.id === value);

  const hasExactMatch = categories.some(
    (c) => c.name.toLowerCase() === search.trim().toLowerCase()
  );
  const canCreate = search.trim().length > 0 && !hasExactMatch && onCreateCategory;

  const handleCreateCategory = async () => {
    if (!canCreate || !search.trim()) return;
    setCreating(true);
    try {
      const newId = await onCreateCategory(search.trim());
      if (newId) {
        onChange(newId);
      }
      setSearch("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm font-normal hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        aria-label={placeholder}
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <span>{selected.icon}</span>
              <span>{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search categories…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {!canCreate && <CommandEmpty>No category found.</CommandEmpty>}

            {canCreate && (
              <CommandGroup heading="Create New">
                <CommandItem
                  value={search}
                  onSelect={() => void handleCreateCategory()}
                  disabled={creating}
                  className="text-primary hover:bg-accent cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Creating…" : `Create Category "${search.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}

            {/* No category option */}
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="text-muted-foreground">No category</span>
              </CommandItem>
            </CommandGroup>

            {/* Parent categories and their children */}
            {parents.map((parent) => {
              const subs = children.filter((c) => c.parent_id === parent.id);
              if (subs.length === 0) {
                return (
                  <CommandItem
                    key={parent.id}
                    value={parent.name}
                    onSelect={() => {
                      onChange(parent.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === parent.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="mr-2">{parent.icon}</span>
                    <span>{parent.name}</span>
                  </CommandItem>
                );
              }

              return (
                <CommandGroup key={parent.id} heading={`${parent.icon ?? ""} ${parent.name}`}>
                  {/* Parent itself is selectable */}
                  <CommandItem
                    value={`${parent.name}-parent`}
                    onSelect={() => {
                      onChange(parent.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === parent.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {parent.name}
                  </CommandItem>
                  {/* Subcategories */}
                  {subs.map((sub) => (
                    <CommandItem
                      key={sub.id}
                      value={`${parent.name} ${sub.name}`}
                      onSelect={() => {
                        onChange(sub.id);
                        setOpen(false);
                      }}
                      className="pl-6"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === sub.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {sub.icon} {sub.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}

            {/* Standalone categories (no parent, not appearing as parent) */}
            {(() => {
              const parentIds = new Set(parents.map((p) => p.id));
              const standalone = categories.filter(
                (c) => c.is_active && !c.parent_id && !parentIds.has(c.id)
              );
              if (standalone.length === 0) return null;
              return (
                <CommandGroup heading="Other">
                  {standalone.map((cat) => (
                    <CommandItem
                      key={cat.id}
                      value={cat.name}
                      onSelect={() => {
                        onChange(cat.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === cat.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {cat.icon} {cat.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
