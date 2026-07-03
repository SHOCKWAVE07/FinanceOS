// ==============================================
// Module Placeholder Page Component
// Reusable placeholder for modules not yet built
// ==============================================

import { Construction, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: number;
  features: string[];
}

export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  phase,
  features,
}: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="space-y-6 max-w-lg">
        {/* Icon */}
        <div className="flex items-center justify-center mx-auto size-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20">
          <Icon className="size-10 text-blue-500" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold">{title}</h2>
            <Badge variant="secondary" className="gap-1">
              <Construction className="size-3" />
              Phase {phase}
            </Badge>
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>

        {/* Upcoming Features */}
        <Card className="text-left">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
              Upcoming Features
            </h3>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="size-3 text-blue-500 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
