import { MapPin, RotateCcw, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AreaCard } from "@/components/areas/area-card";
import { Container } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicAreas } from "@/lib/supabase/queries/areas";
import { getPublicProperties } from "@/lib/supabase/queries/properties";
import { withPublicPropertyCounts } from "@/modules/areas/public-presentation";

export const instant = false;

export const metadata: Metadata = {
  title: "Areas",
  description:
    "Explore the Chennai neighbourhoods covered by Chennai Real Estates, starting with Madipakkam and nearby Keelkattalai, Pallikaranai, and Velachery.",
};

interface AreasPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw?.trim() ?? "";
}

export default async function AreasPage({ searchParams }: AreasPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).slice(0, 80);
  const normalizedQuery = query.toLowerCase();
  const [publicAreas, properties] = await Promise.all([getPublicAreas(), getPublicProperties()]);
  const allAreas = withPublicPropertyCounts(publicAreas, properties);
  const areas = normalizedQuery
    ? allAreas.filter((area) =>
        [area.name, area.pincode, area.summary, area.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : allAreas;

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Areas"
        title="Find the neighbourhood that fits your day"
        description="Madipakkam is the primary coverage area, with nearby neighbourhoods offering different access, space, and price trade-offs. Search a locality or browse the guides below."
      />

      <Notice className="mt-8">
        Property counts
        reflect public listings; verify local details independently
        before making a decision.
      </Notice>

      <form
        action="/areas"
        method="get"
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="area-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by locality name or pincode"
            aria-label="Search localities"
            className="h-11 bg-card pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="h-11">
            <Search aria-hidden="true" />
            Search areas
          </Button>
          {query ? (
            <Button asChild variant="ghost" size="lg" className="h-11">
              <Link href="/areas">
                <RotateCcw aria-hidden="true" />
                Clear
              </Link>
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground">{areas.length}</span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">
            {allAreas.length}
          </span>{" "}
          {allAreas.length === 1 ? "locality" : "localities"}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5 text-primary" />
          South Chennai coverage
        </p>
      </div>

      {areas.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {areas.map((area) => (
            <AreaCard
              key={area.slug}
              area={area}
              featured={area.slug === "madipakkam"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          icon={Search}
          title="No localities match that search"
          description="Try a shorter name such as Madipakkam, or search by the area's pincode."
          action={
            <Button asChild variant="outline">
              <Link href="/areas">
                <RotateCcw aria-hidden="true" />
                Clear search
              </Link>
            </Button>
          }
        />
      )}
    </Container>
  );
}
