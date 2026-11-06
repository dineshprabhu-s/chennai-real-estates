import type { Metadata } from "next";

import { AreaCard } from "@/components/areas/area-card";
import { Container } from "@/components/common/container";
import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { getPublicAreasWithCounts } from "@/modules/areas/queries";

export const metadata: Metadata = {
  title: "Areas",
  description:
    "Explore the Chennai neighbourhoods covered by Chennai Real Estates, starting with Madipakkam and nearby Keelkattalai, Pallikaranai, and Velachery.",
};

export default function AreasPage() {
  const areas = getPublicAreasWithCounts();

  return (
    <Container className="py-12 sm:py-16">
      <PageHeader
        eyebrow="Areas"
        title="Madipakkam first, with the neighbourhoods around it"
        description="Each area has its own rhythm, price profile, and practical trade-offs. Start with the guide that fits how you want to live."
      />

      <Notice className="mt-8">
        These area guides are sample content for the foundation build. Verified
        local notes, pricing context, and property counts will follow with the
        live data layer.
      </Notice>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {areas.map((area) => (
          <AreaCard key={area.slug} area={area} />
        ))}
      </div>
    </Container>
  );
}
