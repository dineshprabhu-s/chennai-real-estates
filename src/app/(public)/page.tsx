import {
  ArrowRight,
  CalendarCheck,
  Check,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { AreaCard } from "@/components/areas/area-card";
import { Container } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { HomeSearchForm } from "@/components/property/home-search-form";
import { PropertyGrid } from "@/components/property/property-grid";
import { PropertyIllustration } from "@/components/property/property-illustration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { getPublicAreas } from "@/lib/supabase/queries/areas";
import { getFeaturedProperties, getPublicProperties } from "@/lib/supabase/queries/properties";
import { withPublicPropertyCounts } from "@/modules/areas/public-presentation";
import {
  getListingPriceLabel,
  listingTypeLabels,
} from "@/modules/properties/constants";

export const metadata: Metadata = {
  title: "Find your next home in Chennai",
  description:
    "Explore homes for sale, rent, and lease in Madipakkam and nearby Chennai neighbourhoods with direct guidance from a local broker.",
};

const trustPoints = [
  "Sale, rent, and lease listings",
  "One local broker, start to finish",
  "Visits arranged around your schedule",
];

const steps = [
  {
    icon: Search,
    title: "Browse properties",
    description:
      "Use the catalogue filters to shortlist homes by transaction type, locality, configuration, budget, and facing.",
  },
  {
    icon: MessageCircle,
    title: "Contact Chennai Real Estates",
    description:
      "Ask about a property by phone, WhatsApp where configured, or through the enquiry form. Get direct answers, not a call centre.",
  },
  {
    icon: CalendarCheck,
    title: "Arrange a property visit",
    description:
      "Pick the listings worth seeing and coordinate a site visit with the broker around your availability.",
  },
] as const;

export default async function HomePage() {
  await connection();
  const [featuredProperties, publicAreas, properties] = await Promise.all([
    getFeaturedProperties(3), getPublicAreas(), getPublicProperties(),
  ]);
  const heroProperty = featuredProperties[0];
  const areas = withPublicPropertyCounts(publicAreas, properties);

  return (
    <>
      <section className="border-b border-border bg-muted/35">
        <Container className="py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                <MapPin aria-hidden="true" className="size-3.5" />
                Madipakkam · Chennai
              </p>

              <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Find Your Next Home in{" "}
                <span className="text-primary">Chennai</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Explore homes for sale, rent, and lease across Madipakkam and
                nearby neighbourhoods. Every listing leads directly to a local
                broker who can explain the street, the building, and the next
                practical step.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href={siteConfig.links.properties}>
                    Explore Properties
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={siteConfig.links.contact}>
                    <Phone aria-hidden="true" />
                    Contact Us
                  </Link>
                </Button>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
                {trustPoints.map((point) => (
                  <li key={point} className="inline-flex items-center gap-1.5">
                    <Check aria-hidden="true" className="size-3.5 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <PropertyIllustration
                type="apartment"
                label={false}
                className="aspect-[5/4] rounded-2xl border border-border shadow-sm"
              />
              <span className="absolute top-4 right-4 rounded-full border border-border bg-background/95 px-3 py-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase backdrop-blur-sm">
                Illustration only
              </span>

              {heroProperty ? (
                <div className="absolute right-4 bottom-4 left-4 rounded-xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm sm:right-6 sm:bottom-6 sm:left-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
                      {heroProperty.id}
                    </p>
                    <Badge variant="secondary">
                      {listingTypeLabels[heroProperty.listingType]}
                    </Badge>
                  </div>
                  <Link
                    href={`/properties/${heroProperty.slug}`}
                    className="mt-2 block rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                  >
                    <h2 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors hover:text-primary">
                      {heroProperty.title}
                    </h2>
                  </Link>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
                        {getListingPriceLabel(heroProperty.listingType)}
                      </p>
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {formatPrice(
                          heroProperty.price,
                          heroProperty.listingType,
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/properties/${heroProperty.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      View property
                      <ArrowRight aria-hidden="true" className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <HomeSearchForm areas={areas} className="mt-14 lg:mt-16" />
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Featured properties"
            title="A shortlist worth a closer look"
            description="Selected sale, rent, and lease listings from the current catalogue. Every card shows the information the broker has supplied."
            action={
              <Button asChild variant="outline">
                <Link href={siteConfig.links.properties}>
                  View all properties
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <p className="mt-4 text-xs text-muted-foreground">
            Verify availability and
            details with the broker.
          </p>
          <PropertyGrid className="mt-8" properties={featuredProperties} />
        </Container>
      </section>

      <section
        id="areas"
        className="border-y border-border bg-muted/40 py-20"
      >
        <Container>
          <SectionHeading
            eyebrow="Popular localities"
            title="Start with the area that fits your day"
            description="Madipakkam is the focus, with nearby neighbourhoods offering different access, space, and price trade-offs."
            action={
              <Button asChild variant="outline">
                <Link href={siteConfig.links.areas}>
                  Explore all areas
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <AreaCard
                key={area.slug}
                area={area}
                featured={area.slug === "madipakkam"}
                className={
                  area.slug === "madipakkam" ? "lg:col-span-2" : undefined
                }
              />
            ))}
            <Link
              href={siteConfig.links.areas}
              className="group flex min-h-44 flex-col justify-between rounded-xl border border-dashed border-primary/25 bg-background p-6 outline-none transition-colors hover:border-primary/45 focus-visible:ring-[3px] focus-visible:ring-ring/25"
            >
              <MapPin
                aria-hidden="true"
                className="size-5 text-primary"
              />
              <div>
                <p className="font-display text-2xl tracking-tight text-foreground">
                  View every locality
                </p>
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Open area guide
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </Link>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                How it works
              </p>
              <h2 className="mt-2 font-display text-3xl leading-[1.15] tracking-tight text-foreground sm:text-4xl">
                Less scrolling. More useful conversations.
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                The catalogue is the starting point. The broker helps with the
                part that listings cannot answer: whether the property, street,
                and access actually suit you.
              </p>
              <Button asChild className="mt-7">
                <Link href={siteConfig.links.contact}>
                  Start a conversation
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>

            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <Card className="h-full gap-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
                        <step.icon aria-hidden="true" className="size-5" />
                      </span>
                      <span className="font-display text-2xl leading-none text-primary/35">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-12 lg:px-14">
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-16 size-72 rounded-full border border-primary-foreground/10"
            />
            <div
              aria-hidden="true"
              className="absolute -right-6 -bottom-32 size-80 rounded-full border border-primary-foreground/10"
            />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary-foreground/60 uppercase">
                  <ShieldCheck aria-hidden="true" className="size-3.5" />
                  Ready when you are
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                  Tell us what you need. We will help narrow the search.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/70">
                  Share your budget, preferred locality, and must-haves. The
                  broker will point you to the listings worth visiting and flag
                  anything that needs verification first.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Link href={siteConfig.links.contact}>
                    Contact the broker
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <a href={siteConfig.contact.phoneHref}>
                    <Phone aria-hidden="true" />
                    {siteConfig.contact.phoneLabel}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
