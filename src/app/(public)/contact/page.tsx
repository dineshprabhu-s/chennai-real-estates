import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { ContactForm } from "@/components/forms/contact-form";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { getPublicPropertyById } from "@/lib/supabase/queries/properties";

export const instant = false;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to Chennai Real Estates about buying, renting, or leasing a property in Madipakkam and nearby Chennai neighbourhoods.",
};

const expectations = [
  "A direct conversation with the broker, not a call centre.",
  "Area context that goes beyond the listing description.",
  "Site visits coordinated around your availability.",
];

interface ContactPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw?.trim() ?? "";
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const propertyId = firstValue(params.property);
  const property = propertyId
    ? (await getPublicPropertyById(propertyId)) ?? undefined
    : undefined;
  const whatsappUrl = getGeneralWhatsAppUrl();

  const contactMethods = [
    {
      icon: Phone,
      label: "Call",
      value: siteConfig.contact.phoneLabel,
      href: siteConfig.contact.phoneHref,
      external: false,
      description: "Best for quick questions and site-visit scheduling.",
    },
    ...(whatsappUrl
      ? [
          {
            icon: MessageCircle,
            label: "WhatsApp",
            value: "Message the broker",
            href: whatsappUrl,
            external: true,
            description:
              "Open a pre-filled chat about your property requirement.",
          },
        ]
      : []),
    {
      icon: Mail,
      label: "Email",
      value: siteConfig.contact.email,
      href: siteConfig.contact.emailHref,
      external: false,
      description: "Share requirements, documents, or a longer note.",
    },
    {
      icon: MapPin,
      label: "Based in",
      value: siteConfig.contact.addressLines.join(", "),
      href: null,
      external: false,
      description: "Site visits across Madipakkam and nearby areas.",
    },
    {
      icon: Clock,
      label: "Hours",
      value: siteConfig.contact.hours,
      href: null,
      external: false,
      description: "Messages outside these hours are answered next working day.",
    },
  ];

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Contact"
        title="Start with a straightforward conversation"
        description="Tell us what you are looking for, or ask a question about a listing. We will help you work out what is worth seeing next."
      />

      <Notice className="mt-8">
        Contact details and form submission are placeholders for the foundation
        build. WhatsApp only appears when a business number is configured. Update
        the broker details in the site configuration before launch.
      </Notice>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-4">
          {contactMethods.map((method) => {
            const content = (
              <>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <method.icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    {method.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold break-words text-foreground">
                    {method.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {method.description}
                  </p>
                </div>
              </>
            );

            return method.href ? (
              <a
                key={method.label}
                href={method.href}
                target={method.external ? "_blank" : undefined}
                rel={method.external ? "noopener noreferrer" : undefined}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/35"
              >
                {content}
              </a>
            ) : (
              <div
                key={method.label}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                {content}
              </div>
            );
          })}

          <div className="rounded-xl bg-primary p-6 text-primary-foreground">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary-foreground/60 uppercase">
              <UserRound aria-hidden="true" className="size-3.5" />
              What to expect
            </p>
            <ul className="mt-4 space-y-3">
              {expectations.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-primary-foreground/80"
                >
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-primary-foreground/60"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Card className="gap-6 p-6 sm:p-8">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-foreground sm:text-3xl">
              Send an enquiry
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Fill in a few details so the broker has the right context before
              the conversation. Required fields are marked with an asterisk.
            </p>
            {property ? (
              <p className="mt-4 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                About{" "}
                <Link
                  href={`/properties/${property.slug}`}
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  {property.title}
                </Link>{" "}
                · <span className="font-mono">{property.id}</span>
              </p>
            ) : null}
          </div>
          <ContactForm
            key={property?.id ?? "general-enquiry"}
            property={property}
          />
        </Card>
      </div>
    </Container>
  );
}
