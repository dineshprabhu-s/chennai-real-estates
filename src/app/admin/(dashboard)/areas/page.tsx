import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireBroker } from "@/lib/auth/broker";
import { getBrokerAreasWithCounts } from "@/lib/supabase/queries/broker-area-management";

import { AdminAreasClient } from "./admin-areas-client";

export const metadata: Metadata = {
  title: "Areas",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

export default async function AdminAreasPage() {
  await requireBroker();

  const areas = await getBrokerAreasWithCounts();

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Areas" }]}
        eyebrow="Areas"
        title="Area management"
        description="The neighbourhoods covered by the platform and the listings mapped to each one. Area records include a parent city and an active flag."
      />



      <AdminAreasClient initialAreas={areas} />
    </div>
  );
}
