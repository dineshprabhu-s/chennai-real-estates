import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AreaCard } from "@/components/areas/area-card";
import { Container } from "@/components/common/container";
import { SectionHeading } from "@/components/common/section-heading";
import { PropertyGrid } from "@/components/property/property-grid";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { formatArea, formatFullPrice } from "@/lib/format";
import { getPublicAreasWithCounts } from "@/modules/areas/queries";
import { listingTypeLabels, propertyTypeLabels } from "@/modules/properties/constants";
import { getFeaturedProperties } from "@/modules/properties/queries";

export const metadata: Metadata = {
  title: "Property listings in Madipakkam, Chennai",
  description: siteConfig.description,
};

const valueProps = [
  {
    icon: ShieldCheck,
    title: "One broker, start to finish",
    description: "A single point of contact from first call to site visit.",
  },
  {
    icon: MapPin,
    title: "Madipakkam-first",
    description: "Local context on streets, buildings, and everyday access.",
  },
  {
    icon: BadgeCheck,
    title: "Curated, not crowded",
    description: "A focused shortlist instead of an endless feed.",
  },
];

const buyingSteps = [
  {
    title: "Tell us what matters",
    description:
      "Share your budget, preferred area, and the details you cannot compromise on — commute, schools, parking, or a quieter street.",
  },
  {
    title: "Get a shortlist with context",
    description:
      "We filter the options and explain the trade-offs: building age, access, layout, and what the price actually includes.",
  },
  {
    title: "Visit with someone local",
    description:
      "Site visits are coordinated around your schedule, with straightforward guidance on documents and next steps.",
  },
];

export default function HomePage() {
  const featuredProperties = getFeaturedProperties(3);
  const heroProperty = featuredProperties[0];
  const areas = getPublicAreasWithCounts();

  return (
    <>
      <section className="border-b border-border bg-[linear-gradient(180deg,#f6f8f2_0%,#fcfcfa_100%)]">
        <Container className="grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              <MapPin aria-hidden="true" className="size-3.5" />
              Madipakkam, Chennai
            </p>

            <h1 className="mt-6 font-display text-5xl leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              A local property broker for homes worth{" "}
              <span className="text-primary">coming home to.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Chennai Real Estates is a single-broker platform focused on
              Madipakkam and the neighbourhoods around it. Browse a considered
              shortlist, then get direct, practical guidance on the ground.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={siteConfig.links.properties}>
                  Browse properties
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={siteConfig.links.contact}>
                  <Phone aria-hidden="true" />
                  Talk to the broker
                </Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 border-t border-border pt-7 sm:grid-cols-3">
              {valueProps.map((item) => (
                <div key={item.title} className="flex items-start gap-2.5">
                  <item.icon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {heroProperty ? (
              <div className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-[0_30px_70px_-40px_rgba(30,77,58,0.65)]">
                <div className="relative overflow-hidden border-b border-primary-foreground/15 p-6 sm:p-8">
                  <div
                    aria-hidden="true"
                    className="absolute -top-16 -right-16 size-56 rounded-full border border-primary-foreground/10"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute -right-2 -bottom-24 size-64 rounded-full border border-primary-foreground/10"
                  />

                  <div className="relative flex items-center justify-between gap-4">
                    <span className="rounded-full border border-primary-foreground/25 px-3 py-1 text-xs font-medium tracking-wide text-primary-foreground/80">
                      Featured sample listing
                    </span>
                    <Link
                      href={`/properties/${heroProperty.slug}`}
                      aria-label={`View ${heroProperty.title}`}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-primary-foreground/20 text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                    >
                      <ArrowUpRight aria-hidden="true" className="size-4" />
                    </Link>
                  </div>

                  <p className="relative mt-10 text-xs font-medium tracking-[0.16em] text-primary-foreground/60 uppercase">
                    {heroProperty.locality} ·{" "}
                    {listingTypeLabels[heroProperty.listingType]}
                  </p>
                  <h2 className="relative mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                    {heroProperty.title}
                  </h2>
                  <p className="relative mt-3 line-clamp-2 text-sm leading-relaxed text-primary-foreground/70">
                    {heroProperty.summary}
                  </p>

                  <div className="relative mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-primary-foreground/15 pt-5">
                    <div>
                      <p className="text-[11px] font-medium tracking-[0.14em] text-primary-foreground/55 uppercase">
                        Guide price
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">
                        {formatFullPrice(
                          heroProperty.price,
                          heroProperty.listingType,
                        )}
                      </p>
                    </div>
                    <p className="text-right text-xs leading-relaxed text-primary-foreground/65">
                      {heroProperty.bedrooms !== null
                        ? `${heroProperty.bedrooms} BHK`
                        : propertyTypeLabels[heroProperty.type]}
                      <br />
                      {formatArea(heroProperty.builtUpAreaSqft)}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/properties/${heroProperty.slug}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 text-sm font-medium transition-colors hover:bg-primary-foreground/5 sm:px-8"
                >
                  View the full listing
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-8">
                <Building2 aria-hidden="true" className="size-8 text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Featured listings will appear here once properties are added.
                </p>
              </div>
            )}

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Phone aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Prefer a conversation?
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Call{" "}
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {siteConfig.contact.phoneLabel}
                  </a>{" "}
                  for a direct, local view of the market.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <SectionHeading
            eyebrow="Sample listings"
            title="Properties worth a closer look"
            description="A small, considered set of apartments, homes, and plots across the neighbourhoods we cover."
            action={
              <Button asChild variant="outline">
                <Link href={siteConfig.links.properties}>
                  View all properties
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <PropertyGrid className="mt-10" properties={featuredProperties} />
        </Container>
      </section>

      <section
        id="areas"
        className="border-y border-border bg-muted/40 py-20"
      >
        <Container>
          <SectionHeading
            eyebrow="Where we work"
            title="Madipakkam first, with the right neighbours"
            description="Start with the area you know, or explore nearby pockets that may offer better value, access, or space."
            action={
              <Button asChild variant="outline">
                <Link href={siteConfig.links.areas}>
                  Explore all areas
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {areas.map((area) => (
              <AreaCard key={area.slug} area={area} />
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20">
        <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              How it works
            </p>
            <h2 className="mt-2 font-display text-3xl leading-[1.15] tracking-tight text-foreground sm:text-4xl">
              Less scrolling. More useful conversations.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              The platform is built around a single broker who knows the area —
              not a directory of anonymous listings. Here is what working
              together looks like.
            </p>
            <Button asChild className="mt-7">
              <Link href={siteConfig.links.contact}>
                Start a conversation
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <ol className="divide-y divide-border border-y border-border">
            {buyingSteps.map((step, index) => (
              <li key={step.title} className="flex gap-5 py-6 first:pt-0 last:pb-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-accent font-display text-lg text-primary">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
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
                <p className="text-xs font-semibold tracking-[0.16em] text-primary-foreground/60 uppercase">
                  Ready when you are
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                  Tell us what you are looking for. We will take it from there.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/70">
                  Share your budget and preferred area, and we will suggest a
                  shortlist worth visiting — with no pressure and no listing
                  clutter.
                </p>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-primary-foreground/75">
                  <li className="inline-flex items-center gap-2">
                    <Check aria-hidden="true" className="size-4" />
                    One point of contact
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <Check aria-hidden="true" className="size-4" />
                    Local area guidance
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <Check aria-hidden="true" className="size-4" />
                    Visits around your schedule
                  </li>
                </ul>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                  <Link href={siteConfig.links.contact}>
                    Book a visit
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
