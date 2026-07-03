import { StickyNote } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function NotesPage() {
  return (
    <ModulePlaceholder
      title="Financial Notes"
      description="Maintain rich financial notes with Markdown, images, and cross-references."
      icon={StickyNote}
      phase={6}
      features={[
        "Markdown editor",
        "Image & PDF attachments",
        "Tags & search",
        "Link to transactions & goals",
        "Rich text formatting",
      ]}
    />
  );
}
