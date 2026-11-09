"use client";

import { MessageCircle, Phone, Send } from "lucide-react";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";

import { submitPublicLead } from "@/app/(public)/contact/actions";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";
import {
  publicLeadMessages,
  validatePublicLeadInput,
  type PublicLeadField,
  type PublicLeadFieldErrors,
} from "@/lib/validation/public-lead";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";

type FieldName = PublicLeadField;
type FieldErrors = PublicLeadFieldErrors;

type EnquiryProperty = Pick<Property, "id" | "title" | "locality">;

const subscribe = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

interface Feedback {
  tone: "success" | "error";
  message: string;
}

interface ContactFormProps {
  property?: EnquiryProperty;
  /** Explicit database property ID. `null` means a general enquiry. */
  propertyId?: string | null;
  compact?: boolean;
  className?: string;
}

function initialMessage(property?: EnquiryProperty): string {
  if (!property) {
    return "";
  }

  return `I am interested in property ${property.id} (${property.title}) in ${property.locality}. Please share more details and help arrange a property visit.`;
}

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const firstInvalid = (["name", "phone", "email", "message"] as const).find(
    (field) => errors[field],
  );

  if (!firstInvalid) {
    return;
  }

  form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
}

export function ContactForm({
  property,
  propertyId,
  compact = false,
  className,
}: ContactFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, clientHydrated, serverHydrated);
  const submittingRef = useRef(false);
  const whatsappUrl = getGeneralWhatsAppUrl();
  const enquiryPropertyId =
    propertyId === undefined ? (property?.id ?? null) : propertyId;

  function clearError(field: FieldName) {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hydrated || pending || submittingRef.current) {
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const validation = validatePublicLeadInput({
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      message: data.get("message"),
      propertyId: enquiryPropertyId,
    });

    setFeedback(null);

    if (!validation.ok) {
      setErrors(validation.fields);
      setFeedback({ tone: "error", message: validation.message });
      focusFirstInvalid(form, validation.fields);
      return;
    }

    setErrors({});
    submittingRef.current = true;
    setPending(true);

    try {
      const result = await submitPublicLead({
        ...validation.values,
        website: String(data.get("website") ?? ""),
      });

      if (result.ok) {
        setFeedback({ tone: "success", message: publicLeadMessages.success });
        return;
      }

      if (result.fields) {
        setErrors(result.fields);
        focusFirstInvalid(form, result.fields);
      }

      setFeedback({ tone: "error", message: result.message });
    } catch {
      setFeedback({ tone: "error", message: publicLeadMessages.generic });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <form
      method="post"
      action="/contact"
      noValidate
      onSubmit={handleSubmit}
      onChange={() => setFeedback(null)}
      aria-busy={pending}
      className={cn("space-y-5", className)}
    >
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {property ? (
        <p className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Enquiring about{" "}
          <span className="font-semibold text-foreground">{property.id}</span> ·{" "}
          {property.title}
        </p>
      ) : null}

      <div
        className={cn(
          "grid gap-5",
          !compact && "sm:grid-cols-2",
        )}
      >
        <FormField
          label="Your name"
          htmlFor="contact-name"
          required
          error={errors.name}
          errorId="contact-name-error"
        >
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Full name"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            onChange={() => clearError("name")}
          />
        </FormField>

        <FormField
          label="Phone number"
          htmlFor="contact-phone"
          required
          error={errors.phone}
          errorId="contact-phone-error"
        >
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91"
            required
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? "contact-phone-error" : undefined}
            onChange={() => clearError("phone")}
          />
        </FormField>
      </div>

      <FormField
        label="Email address"
        htmlFor="contact-email"
        hint="Optional"
        error={errors.email}
        errorId="contact-email-error"
      >
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "contact-email-error" : undefined}
          onChange={() => clearError("email")}
        />
      </FormField>

      <FormField
        label="What are you looking for?"
        htmlFor="contact-message"
        required
        error={errors.message}
        errorId="contact-message-error"
      >
        <Textarea
          id="contact-message"
          name="message"
          defaultValue={initialMessage(property)}
          placeholder="Tell us the area, budget, and the kind of home you have in mind."
          required
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          onChange={() => clearError("message")}
        />
      </FormField>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={!hydrated || pending} aria-busy={pending}>
          <Send aria-hidden="true" />
          {pending ? "Sending…" : "Send enquiry"}
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your details are sent only to the broker to respond to this enquiry.
        </p>
      </div>

      {!hydrated ? (
        <p className="text-xs text-muted-foreground" role="status">
          The enquiry form requires JavaScript. Please enable it or call the broker.
        </p>
      ) : null}

      {feedback?.tone === "success" ? (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-accent/60 px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          <p className="font-semibold">Enquiry sent</p>
          <p className="mt-1 text-muted-foreground">
            {feedback.message} To reach the broker now, call{" "}
            <a
              href={siteConfig.contact.phoneHref}
              className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
            >
              <Phone aria-hidden="true" className="size-3.5" />
              {siteConfig.contact.phoneLabel}
            </a>
            {whatsappUrl ? (
              <>
                {" "}
                or{" "}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
                >
                  <MessageCircle aria-hidden="true" className="size-3.5" />
                  message on WhatsApp
                </a>
              </>
            ) : null}
            .
          </p>
        </div>
      ) : null}

      {feedback?.tone === "error" ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          <p className="font-semibold text-destructive">Enquiry not sent</p>
          <p className="mt-1 text-muted-foreground">{feedback.message}</p>
        </div>
      ) : null}
    </form>
  );
}
