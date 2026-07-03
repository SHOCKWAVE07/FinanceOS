import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Reports"
      description="Generate monthly, quarterly, and yearly financial reports."
      icon={FileText}
      phase={7}
      features={[
        "Monthly reports",
        "Yearly reports",
        "Custom date range reports",
        "PDF export",
        "Comparative analysis",
        "Report templates",
      ]}
    />
  );
}
