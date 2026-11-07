import type { VariantProps } from "class-variance-authority";
import { Mail, MessageCircle } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  getGeneralWhatsAppUrl,
  getPropertyWhatsAppUrl,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";

type WhatsAppProperty = Pick<Property, "id" | "title" | "locality">;

interface WhatsAppEnquiryButtonProps {
  property?: WhatsAppProperty;
  label?: string;
  fallbackLabel?: string;
  ariaLabel?: string;
  iconOnly?: boolean;
  fallbackHref?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}

/**
 * Renders a configured WhatsApp link, or a clearly labelled contact fallback
 * when no business number is available. Never emits an empty wa.me link.
 */
export function WhatsAppEnquiryButton({
  property,
  label,
  fallbackLabel,
  ariaLabel,
  iconOnly = false,
  fallbackHref,
  size = "sm",
  variant = "outline",
  className,
}: WhatsAppEnquiryButtonProps) {
  const href = property
    ? getPropertyWhatsAppUrl(property)
    : getGeneralWhatsAppUrl();
  const contactFallbackHref = property
    ? `/contact?property=${encodeURIComponent(property.id)}`
    : siteConfig.links.contact;
  const resolvedFallbackHref = fallbackHref ?? contactFallbackHref;
  const isConfigured = href !== null;
  const Icon = isConfigured ? MessageCircle : Mail;
  const text = isConfigured
    ? (label ?? "WhatsApp us")
    : (fallbackLabel ?? "Contact us");
  const accessibleLabel =
    ariaLabel ??
    (property
      ? `${isConfigured ? "WhatsApp enquiry" : "Enquire"} about ${property.id}`
      : text);

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn(
        isConfigured && variant !== "default" && "text-primary",
        className,
      )}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={iconOnly ? accessibleLabel : undefined}
        >
          <Icon aria-hidden="true" />
          {iconOnly ? null : text}
        </a>
      ) : (
        <Link
          href={resolvedFallbackHref}
          aria-label={iconOnly ? accessibleLabel : undefined}
        >
          <Icon aria-hidden="true" />
          {iconOnly ? null : text}
        </Link>
      )}
    </Button>
  );
}
