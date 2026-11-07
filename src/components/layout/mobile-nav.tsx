"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { BrandMark } from "@/components/common/logo";
import { WhatsAppEnquiryButton } from "@/components/property/whatsapp-enquiry-button";
import { buttonVariants } from "@/components/ui/button";
import { publicNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls="public-mobile-menu"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "md:hidden",
        )}
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      {open
        ? createPortal(
            <div
              id="public-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              className="fixed inset-0 z-50 flex flex-col bg-background md:hidden"
            >
              <div className="flex h-20 items-center justify-between border-b border-border px-4">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3"
                  aria-label="Chennai Real Estates — home"
                >
                  <BrandMark />
                  <span className="flex flex-col">
                    <span className="font-display text-xl leading-none tracking-tight">
                      Chennai Real Estates
                    </span>
                    <span className="mt-1.5 text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                      Madipakkam · Chennai
                    </span>
                  </span>
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation menu"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                  )}
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>

              <nav
                aria-label="Mobile primary"
                className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6"
              >
                {publicNavigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3.5 font-display text-3xl tracking-tight text-foreground transition-colors hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="space-y-3 border-t border-border px-4 py-6">
                <WhatsAppEnquiryButton
                  label="WhatsApp us"
                  fallbackLabel="Send an enquiry"
                  size="lg"
                  className="w-full"
                />
                <a
                  href={siteConfig.contact.phoneHref}
                  className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground"
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {siteConfig.contact.phoneLabel}
                </a>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
