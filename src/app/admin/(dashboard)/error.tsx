"use client";

import { ErrorState } from "@/components/common/error-state";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ reset }: AdminErrorProps) {
  return (
    <ErrorState
      title="The dashboard could not load"
      description="An unexpected error occurred while loading this admin page. Try again, or return to the homepage."
      reset={reset}
    />
  );
}
