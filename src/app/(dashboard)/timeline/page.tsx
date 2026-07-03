import { Clock } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function TimelinePage() {
  return (
    <ModulePlaceholder
      title="Financial Timeline"
      description="View all financial events chronologically in one unified timeline."
      icon={Clock}
      phase={6}
      features={[
        "Chronological event view",
        "All event types (salary, expenses, investments, etc.)",
        "Filtering by event type",
        "Search & date range",
        "Event details & links",
      ]}
    />
  );
}
