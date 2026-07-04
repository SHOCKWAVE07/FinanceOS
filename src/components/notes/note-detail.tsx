"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Edit2,
  Trash2,
  Calendar,
  Link2,
  Paperclip,
  TrendingUp,
  Target,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { deleteNote } from "@/app/(dashboard)/notes/actions";
import type { NoteWithRelations, Tag } from "@/types/database";

interface NoteDetailProps {
  note: NoteWithRelations | null;
  onEdit: (note: NoteWithRelations) => void;
  onDeleteSuccess: () => void;
}

export function NoteDetail({ note, onEdit, onDeleteSuccess }: NoteDetailProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-6 bg-card/20 rounded-xl border border-border/40 border-dashed">
        <div className="rounded-full bg-muted/60 p-3 mb-3">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-sm text-foreground">No Note Selected</h3>
        <p className="text-xs text-muted-foreground max-w-[240px] mt-1.5 leading-relaxed">
          Select a note from the left sidebar or create a new one to view its details.
        </p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    setIsDeleting(true);

    try {
      const res = await deleteNote(note.id);
      if (!res.ok) throw new Error(res.error);

      toast.success("Note deleted successfully");
      onDeleteSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  // Render icons for different linkage types
  const renderLinkIcon = (type: string) => {
    switch (type) {
      case "goal":
        return <Target className="h-3.5 w-3.5 text-amber-500" />;
      case "investment":
        return <TrendingUp className="h-3.5 w-3.5 text-blue-500" />;
      case "expense":
        return <ArrowUpRight className="h-3.5 w-3.5 text-destructive" />;
      case "income":
        return <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />;
      default:
        return <Link2 className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const formatLinkType = (type: string) => {
    if (type === "expense") return "Expense";
    if (type === "income") return "Income";
    if (type === "investment") return "Asset";
    if (type === "goal") return "Goal";
    return type;
  };

  return (
    <div className="flex h-full flex-col bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Detail Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Updated {format(new Date(note.updated_at), "PPP p")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(note)}
          >
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">Edit note</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete note</span>
          </Button>
        </div>
      </div>

      {/* Note Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Title */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{note.title}</h2>

          {/* Tags */}
          {note.tags && note.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag: Tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="px-2 py-0.5 text-[10px] font-semibold border-border/80"
                  style={tag.color ? { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}0a` } : undefined}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground italic">No tags</span>
          )}
        </div>

        <Separator className="bg-border/60" />

        {/* Markdown Rendered Content */}
        <div className="prose prose-sm prose-invert max-w-none text-foreground/90 leading-relaxed font-sans">
          <MarkdownRenderer content={note.content} />
        </div>

        {/* Links & Attachments grids */}
        {((note.links && note.links.length > 0) || (note.attachments && note.attachments.length > 0)) && (
          <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-border/40">
            {/* Links */}
            {note.links && note.links.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" /> Associated Links
                </h4>
                <div className="space-y-1.5">
                  {note.links.map((link: any) => (
                    <div
                      key={`${link.link_type}-${link.link_id}`}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 p-2 text-xs hover:bg-muted/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {renderLinkIcon(link.link_type)}
                        <span className="font-semibold text-foreground/90">
                          {formatLinkType(link.link_type)}
                        </span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {note.attachments && note.attachments.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-primary" /> Attachments
                </h4>
                <div className="space-y-1.5">
                  {note.attachments.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/10 p-2 text-xs hover:bg-muted/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate text-foreground/80 font-mono" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0 pl-2">
                        {(Number(file.size) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
