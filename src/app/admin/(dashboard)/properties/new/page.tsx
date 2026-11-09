import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { PropertyForm } from "@/components/forms/property-form";
import { Card } from "@/components/ui/card";
import { requireBroker } from "@/lib/auth/broker";
import { getBrokerAreas } from "@/lib/supabase/queries/broker-areas";

export const metadata: Metadata = {
  title: "Add property",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

export default async function NewPropertyPage() {
  await requireBroker();

  const areas = (await getBrokerAreas()).filter((area) => area.isActive);
  const listedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Properties", href: "/admin/properties" },
          { label: "Add property" },
        ]}
        eyebrow="Properties"
        title="Add a property"
        description="Prepare a listing with pricing, verification and brokerage details."
      />

      <Notice className="mt-6">
        Selected images stay in your browser and are never uploaded.
      </Notice>

      <Card className="mt-6 p-5 sm:p-8">
        <PropertyForm areas={areas} listedAt={listedAt} />
      </Card>
    </div>
  );
}
