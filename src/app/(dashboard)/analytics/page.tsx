import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function AnalyticsPage() {
  return (
    <ModulePlaceholder
      title="Analytics"
      description="Interactive dashboards with spending trends, savings rate, and investment performance."
      icon={BarChart3}
      phase={7}
      features={[
        "Spending & income trends",
        "Savings rate tracking",
        "Net worth growth chart",
        "Goal completion analytics",
        "Investment performance",
        "Cash flow analysis",
        "Category breakdowns",
      ]}
    />
  );
}
