import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function IncomePage() {
  return (
    <ModulePlaceholder
      title="Income Tracking"
      description="Track all income sources and monitor your earning patterns."
      icon={Wallet}
      phase={3}
      features={[
        "Multiple income sources",
        "Income categorization",
        "Recurring income",
        "Income trends & analytics",
        "Tax-related tracking",
      ]}
    />
  );
}
