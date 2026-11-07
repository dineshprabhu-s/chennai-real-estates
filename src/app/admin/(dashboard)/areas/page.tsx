import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { getAreasWithCounts } from "@/modules/areas/queries";

import { AdminAreasClient } from "./admin-areas-client";

export const metadata: Metadata = {
  title: "Areas",
};

export default function AdminAreasPage() {
  const areas = getAreasWithCounts();

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Areas" }]}
        eyebrow="Areas"
        title="Area management"
        description="The neighbourhoods covered by the platform and the demo listings mapped to each one. Area records include a parent city and an active flag."
      />

      <Notice className="mt-6">
        Development preview — area records come from the seeded demo data. Add,
        edit, and active-state changes affect this browser session only and are
        never written to a database or published to the public website.
      </Notice>

      <AdminAreasClient initialAreas={areas} />
    </div>
  );
}
