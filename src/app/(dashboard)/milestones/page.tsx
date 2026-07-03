import { Flag } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function MilestonesPage() {
  return (
    <ModulePlaceholder
      title="Milestones"
      description="Track key financial milestones and celebrate achievements."
      icon={Flag}
      phase={5}
      features={[
        "Financial milestone tracking",
        "Link to goals",
        "Achievement badges",
        "Timeline integration",
        "Progress notifications",
      ]}
    />
  );
}
