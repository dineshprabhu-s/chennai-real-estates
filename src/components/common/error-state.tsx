"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  reset?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred while loading this page. Please try again, or return to the homepage.",
  reset,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {reset ? (
            <Button type="button" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href="/">
              <Home aria-hidden="true" />
              Back to homepage
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
