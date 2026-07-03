import { Target } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function GoalsPage() {
  return (
    <ModulePlaceholder
      title="Financial Goals"
      description="Set, track, and achieve your financial goals with milestones."
      icon={Target}
      phase={5}
      features={[
        "Create goals with target amounts",
        "Track progress over time",
        "Link investments to goals",
        "Priority & deadline management",
        "Milestone tracking",
        "Completion analytics",
      ]}
    />
  );
}
