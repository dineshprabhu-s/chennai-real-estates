import { ArrowUpRight, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AreaWithCounts } from "@/modules/areas/queries";

interface AreaCardProps {
  area: AreaWithCounts;
  featured?: boolean;
  className?: string;
}

export function AreaCard({
  area,
  featured = false,
  className,
}: AreaCardProps) {
  return (
    <Link
      href={`/areas/${area.slug}`}
      className={cn(
        "group block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
        className,
      )}
    >
      <Card
        className={cn(
          "h-full gap-4 transition-colors group-hover:border-primary/35",
          featured ? "bg-accent/45 p-7 sm:p-8" : "p-6",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <MapPin aria-hidden="true" className="size-3.5" />
              <span>{area.pincode}</span>
            </div>
            <h3
              className={cn(
                "mt-2 font-semibold text-foreground transition-colors group-hover:text-primary",
                featured
                  ? "font-display text-3xl leading-tight tracking-tight"
                  : "text-lg",
              )}
            >
              {area.name}
            </h3>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {featured ? <Badge>Primary area</Badge> : null}
            <Badge variant="secondary">
              {area.publicPropertyCount}{" "}
              {area.publicPropertyCount === 1 ? "listing" : "listings"}
            </Badge>
          </div>
        </div>

        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            featured ? "max-w-xl text-base" : "text-sm",
          )}
        >
          {area.summary}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-primary">
            Explore {area.name}
          </span>
          <ArrowUpRight aria-hidden="true" className="size-4 text-primary" />
        </div>
      </Card>
    </Link>
  );
}
