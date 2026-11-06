import { Phone } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/common/container";
import { Logo } from "@/components/common/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PublicNav } from "@/components/layout/public-nav";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo className="shrink-0" />

        <div className="hidden md:block">
          <PublicNav />
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={siteConfig.contact.phoneHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Phone aria-hidden="true" className="size-4" />
            {siteConfig.contact.phoneLabel}
          </a>
          <Button asChild size="sm">
            <Link href={siteConfig.links.contact}>Book a visit</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <a
            href={siteConfig.contact.phoneHref}
            aria-label={`Call ${siteConfig.contact.phoneLabel}`}
            className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm sm:hidden"
          >
            <Phone aria-hidden="true" className="size-4" />
          </a>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
