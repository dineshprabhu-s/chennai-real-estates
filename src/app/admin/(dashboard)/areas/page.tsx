import { ExternalLink, LockKeyhole, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAreasWithCounts } from "@/modules/areas/queries";

export const metadata: Metadata = {
  title: "Areas",
};

export default function AdminAreasPage() {
  const areas = getAreasWithCounts();

  return (
    <div>
      <PageHeader
        variant="admin"
        eyebrow="Areas"
        title="Area management"
        description="The neighbourhoods covered by the platform, and the listings mapped to each one."
        actions={
          <Button type="button" disabled title="Area editing is not enabled yet">
            <LockKeyhole aria-hidden="true" />
            Add area
          </Button>
        }
      />

      <Notice className="mt-6">
        Areas are currently defined in sample data. Creating and editing areas
        will be enabled with the area data layer.
      </Notice>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {areas.map((area) => (
          <Card key={area.slug} className="gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {area.pincode}
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-foreground">
                  {area.name}
                </h2>
              </div>
              <Badge variant="success">Active</Badge>
            </div>

            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {area.summary}
            </p>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">
                    {area.publicPropertyCount}
                  </span>{" "}
                  public
                </span>
                <span>
                  <span className="font-semibold text-foreground">
                    {area.propertyCount}
                  </span>{" "}
                  total
                </span>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/areas/${area.slug}`}>
                  View page
                  <ExternalLink aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <Plus aria-hidden="true" className="size-3.5" />
        New areas will be added here once editing is enabled.
      </div>
    </div>
  );
}
