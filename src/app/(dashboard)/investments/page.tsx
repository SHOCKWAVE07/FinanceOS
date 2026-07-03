import { TrendingUp } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function InvestmentsPage() {
  return (
    <ModulePlaceholder
      title="Investment Tracking"
      description="Track your entire portfolio — mutual funds, stocks, ETFs, FDs, and more."
      icon={TrendingUp}
      phase={4}
      features={[
        "Multiple asset types (MF, Stocks, ETFs, Gold, etc.)",
        "Portfolio allocation view",
        "CAGR & XIRR calculations",
        "Profit/Loss tracking",
        "Net worth calculation",
        "Asset allocation charts",
      ]}
    />
  );
}
