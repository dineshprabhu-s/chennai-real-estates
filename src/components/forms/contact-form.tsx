"use client";

import { MessageCircle, Phone, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import type { Property } from "@/types/property";

type FieldName = "name" | "phone" | "email" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

type EnquiryProperty = Pick<Property, "id" | "title" | "locality">;

interface ContactFormProps {
  property?: EnquiryProperty;
  compact?: boolean;
  className?: string;
}

function initialMessage(property?: EnquiryProperty): string {
  if (!property) {
    return "";
  }

  return `I am interested in property ${property.id} (${property.title}) in ${property.locality}. Please share more details and help arrange a property visit.`;
}

export function ContactForm({
  property,
  compact = false,
  className,
}: ContactFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const whatsappUrl = getGeneralWhatsAppUrl();

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const nextErrors: FieldErrors = {};

    if (name.length < 2) {
      nextErrors.name = "Please enter your name.";
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      nextErrors.phone = "Enter a valid phone number with 10 to 13 digits.";
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address, or leave this blank.";
    }

    if (message.length < 10) {
      nextErrors.message = "Add a little more detail (at least 10 characters).";
    }

    setErrors(nextErrors);

    const firstInvalid = (["name", "phone", "email", "message"] as const).find(
      (field) => nextErrors[field],
    );

    if (firstInvalid) {
      setSubmitted(false);
      const input = form.querySelector<HTMLElement>(
        `[name="${firstInvalid}"]`,
      );
      input?.focus();
      return;
    }

    setSubmitted(true);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      onChange={() => setSubmitted(false)}
      className={cn("space-y-5", className)}
    >
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
        <Button type="submit">
          <Send aria-hidden="true" />
          Send enquiry
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Demo form only. Your details are not sent or stored yet.
        </p>
      </div>

      {submitted ? (
        <div
          role="status"
          className="rounded-lg border border-primary/20 bg-accent/60 px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          <p className="font-semibold">Enquiry captured in the demo only</p>
          <p className="mt-1 text-muted-foreground">
            This form is not connected to a backend, so nothing has been sent or
            stored. To reach the broker now, call{" "}
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
    </form>
  );
}
