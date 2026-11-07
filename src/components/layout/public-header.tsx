import { Phone } from "lucide-react";

import { Container } from "@/components/common/container";
import { Logo } from "@/components/common/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PublicNav } from "@/components/layout/public-nav";
import { WhatsAppEnquiryButton } from "@/components/property/whatsapp-enquiry-button";
import { siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Logo className="shrink-0" textClassName="hidden min-[380px]:flex" />

        <div className="hidden md:block">
          <PublicNav />
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={siteConfig.contact.phoneHref}
            className="hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground xl:inline-flex"
          >
            <Phone aria-hidden="true" className="size-4" />
            {siteConfig.contact.phoneLabel}
          </a>
          <WhatsAppEnquiryButton
            label="WhatsApp us"
            fallbackLabel="Contact us"
            ariaLabel="Enquire about a property"
          />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <WhatsAppEnquiryButton
            iconOnly
            size="icon-sm"
            ariaLabel="Enquire about a property"
          />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
