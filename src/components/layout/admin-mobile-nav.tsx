"use client";

import { ExternalLink, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { BrandMark } from "@/components/common/logo";
import { AdminNavLinks } from "@/components/layout/admin-nav-links";
import { buttonVariants } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";

export function AdminMobileNav() {
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
        aria-label={open ? "Close admin menu" : "Open admin menu"}
        aria-expanded={open}
        aria-controls="admin-mobile-menu"
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "lg:hidden",
        )}
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>

      {open
        ? createPortal(
            <div
              id="admin-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              className="fixed inset-0 z-50 lg:hidden"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-foreground/25"
                onClick={() => setOpen(false)}
              />
              <div className="relative flex h-full w-[min(20rem,85vw)] flex-col border-r border-border bg-card shadow-xl">
                <div className="flex h-20 items-center justify-between border-b border-border px-4">
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3"
                  >
                    <BrandMark />
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        Chennai Real Estates
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                        Broker admin
                      </span>
                    </span>
                  </Link>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close admin menu"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                    )}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <p className="px-3 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    Workspace
                  </p>
                  <AdminNavLinks
                    className="mt-3 space-y-1"
                    onNavigate={() => setOpen(false)}
                  />
                </div>

                <div className="border-t border-border p-4">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    View public website
                  </Link>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
