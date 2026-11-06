import { Info } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

interface NoticeProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A restrained inline notice used for sample-data and foundation-build
 * messaging. Kept presentational so it can be used in server components.
 */
export function Notice({ children, className }: NoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-3 text-sm leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <Info
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-primary/70"
      />
      <p>{children}</p>
    </div>
  );
}
