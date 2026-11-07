import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { Button } from "@/components/ui/button";
import { getAreasWithCounts } from "@/modules/areas/queries";
import { getAllProperties } from "@/modules/properties/queries";

import { AdminPropertiesClient } from "./admin-properties-client";

export const metadata: Metadata = {
  title: "Properties",
};

export default function AdminPropertiesPage() {
  const properties = getAllProperties();
  const areas = getAreasWithCounts().map((area) => ({
    slug: area.slug,
    name: area.name,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Properties" }]}
        eyebrow="Properties"
        title="Property management"
        description="Search, filter, review, and preview status changes across the demo catalogue. Property IDs and verification labels are preserved."
        actions={
          <Button asChild>
            <Link href="/admin/properties/new">
              <Plus aria-hidden="true" />
              Add Property
            </Link>
          </Button>
        }
      />

      <Notice className="mt-6">
        Development preview — all nine sample listings are shown. Publish,
        unpublish, and status changes update this browser session only and never
        alter the public catalogue.
      </Notice>

      <AdminPropertiesClient initialProperties={properties} areas={areas} />
    </div>
  );
}
