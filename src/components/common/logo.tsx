import Link from "next/link";

import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  inverse?: boolean;
}

export function BrandMark({ className, inverse = false }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg",
        inverse
          ? "bg-primary-foreground text-primary"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13v-9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    </span>
  );
}

interface LogoProps {
  className?: string;
  textClassName?: string;
  inverse?: boolean;
  showTagline?: boolean;
  href?: string;
}

export function Logo({
  className,
  textClassName,
  inverse = false,
  showTagline = true,
  href = "/",
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25",
        className,
      )}
      aria-label="Chennai Real Estates — home"
    >
      <BrandMark inverse={inverse} />
      <span className={cn("flex min-w-0 flex-col", textClassName)}>
        <span
          className={cn(
            "font-display text-xl leading-none tracking-tight sm:text-[1.35rem]",
            inverse ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Chennai Real Estates
        </span>
        {showTagline ? (
          <span
            className={cn(
              "mt-1.5 text-[10px] font-medium tracking-[0.18em] uppercase",
              inverse ? "text-primary-foreground/60" : "text-muted-foreground",
            )}
          >
            Madipakkam · Chennai
          </span>
        ) : null}
      </span>
    </Link>
  );
}
