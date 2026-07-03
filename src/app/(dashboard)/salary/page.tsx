import { Briefcase } from "lucide-react";
import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export default function SalaryPage() {
  return (
    <ModulePlaceholder
      title="Salary Tracking"
      description="Track salary components, appraisals, and compensation growth."
      icon={Briefcase}
      phase={3}
      features={[
        "Gross & net salary tracking",
        "PF, NPS, Tax breakdowns",
        "Bonus & variable pay",
        "Appraisal history",
        "Salary growth visualization",
      ]}
    />
  );
}
