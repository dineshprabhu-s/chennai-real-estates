import { siteConfig } from "@/config/site";
import type { Property } from "@/types/property";

type WhatsAppProperty = Pick<Property, "id" | "title" | "locality">;

/**
 * WhatsApp only exists when a business number is configured. Keep numbers in
 * international format, without punctuation, e.g. 919876543210.
 */
export function normalizeWhatsAppNumber(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");

  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function getWhatsAppNumber(): string | null {
  return normalizeWhatsAppNumber(siteConfig.contact.whatsappNumber);
}

export function getWhatsAppUrl(message: string): string | null {
  const number = getWhatsAppNumber();

  if (!number) {
    return null;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function getPropertyEnquiryMessage(property: WhatsAppProperty): string {
  return `Hello Chennai Real Estates, I am interested in property ${property.id} (${property.title}) in ${property.locality}. Please share more details and help arrange a property visit.`;
}

export function getPropertyWhatsAppUrl(
  property: WhatsAppProperty,
): string | null {
  return getWhatsAppUrl(getPropertyEnquiryMessage(property));
}

export function getGeneralWhatsAppUrl(): string | null {
  return getWhatsAppUrl(
    "Hello Chennai Real Estates, I would like to know more about properties in Madipakkam and nearby areas.",
  );
}
