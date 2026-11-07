import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

interface DemoFeedbackProps {
  message: string | null;
  className?: string;
}

/**
 * Consistent feedback for simulated admin actions. Never use wording that
 * implies a server write or persistent storage.
 */
export function DemoFeedback({ message, className }: DemoFeedbackProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-primary/20 bg-accent/70 px-4 py-3 text-sm leading-relaxed text-foreground",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{message}</p>
    </div>
  );
}
