import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Card>
  );
}
