import type * as React from "react";

import { cn } from "@/lib/utils";

interface ContainerProps extends React.ComponentProps<"div"> {
  as?: "div" | "section";
}

export function Container({
  as: Comp = "div",
  className,
  ...props
}: ContainerProps) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
