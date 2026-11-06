"use client";

import { Phone, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/config/site";

/**
 * Presentational enquiry form.
 *
 * Submission intentionally stops at the UI boundary until the leads module and
 * its persistence layer are implemented. No enquiry data is transmitted.
 */
export function ContactForm() {
  const [showNotice, setShowNotice] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowNotice(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Your name" htmlFor="contact-name" required>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            placeholder="Full name"
            required
          />
        </FormField>
        <FormField label="Phone number" htmlFor="contact-phone" required>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91"
            required
          />
        </FormField>
      </div>

      <FormField label="Email address" htmlFor="contact-email" hint="Optional">
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
        />
      </FormField>

      <FormField
        label="What are you looking for?"
        htmlFor="contact-message"
        required
      >
        <Textarea
          id="contact-message"
          name="message"
          placeholder="Tell us the area, budget, and the kind of home you have in mind."
          required
        />
      </FormField>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit">
          <Send aria-hidden="true" />
          Send enquiry
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your details will only be used to respond to this enquiry.
        </p>
      </div>

      {showNotice ? (
        <div
          role="alert"
          className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          Enquiry submission is not connected in this foundation build. Please
          call{" "}
          <a
            href={siteConfig.contact.phoneHref}
            className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
          >
            <Phone aria-hidden="true" className="size-3.5" />
            {siteConfig.contact.phoneLabel}
          </a>{" "}
          for now.
        </div>
      ) : null}
    </form>
  );
}
