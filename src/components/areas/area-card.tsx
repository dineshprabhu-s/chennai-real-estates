import { ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AreaWithCounts } from "@/modules/areas/queries";

interface AreaCardProps {
  area: AreaWithCounts;
}

export function AreaCard({ area }: AreaCardProps) {
  return (
    <Link
      href={`/areas/${area.slug}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
    >
      <Card className="h-full gap-4 p-6 transition-colors group-hover:border-primary/35">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <MapPin aria-hidden="true" className="size-3.5" />
              <span>{area.pincode}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
              {area.name}
            </h3>
          </div>
          <Badge variant="secondary">
            {area.publicPropertyCount}{" "}
            {area.publicPropertyCount === 1 ? "listing" : "listings"}
          </Badge>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {area.summary}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-primary">
            Explore {area.name}
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-primary"
          />
        </div>
      </Card>
    </Link>
  );
}
