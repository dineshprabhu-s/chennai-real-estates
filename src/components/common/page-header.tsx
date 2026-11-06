import type * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  variant?: "public" | "admin";
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  variant = "public",
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "mt-2 tracking-tight text-foreground",
            variant === "public"
              ? "font-display text-4xl leading-[1.1] sm:text-5xl"
              : "text-2xl font-semibold sm:text-3xl",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-4 text-muted-foreground",
              variant === "public"
                ? "max-w-2xl text-base leading-relaxed sm:text-lg"
                : "max-w-2xl text-sm leading-relaxed",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
