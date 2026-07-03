import { Receipt } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function ExpensesPage() {
  return (
    <ModulePlaceholder
      title="Expense Tracking"
      description="Track every expense with categories, tags, attachments, and recurring support."
      icon={Receipt}
      phase={2}
      features={[
        "Add, edit, delete expenses",
        "Categories & subcategories",
        "Tags & attachments",
        "Recurring expenses",
        "CSV import/export",
        "Calendar view",
        "Advanced filters & search",
      ]}
    />
  );
}
