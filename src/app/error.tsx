"use client";

import { Logo } from "@/components/common/logo";
import { Container } from "@/components/common/container";
import { ErrorState } from "@/components/common/error-state";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ reset }: RouteErrorProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <Container className="flex h-20 items-center">
          <Logo />
        </Container>
      </header>
      <main className="flex flex-1 items-center">
        <div className="w-full">
          <ErrorState reset={reset} />
        </div>
      </main>
    </div>
  );
}
