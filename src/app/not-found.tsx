import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/common/logo";
import { Container } from "@/components/common/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <Container className="flex h-20 items-center">
          <Logo />
        </Container>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <p className="font-display text-7xl leading-none tracking-tight text-primary/25">
            404
          </p>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-foreground">
            This page is not on our list
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            The page you are looking for may have moved, or the link may be
            incorrect. Head back to the listings or start from the homepage.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/properties">Browse properties</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to homepage</Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground">
        Chennai Real Estates · Madipakkam, Chennai
      </footer>
    </div>
  );
}
