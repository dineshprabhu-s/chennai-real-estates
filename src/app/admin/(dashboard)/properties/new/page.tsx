import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { PropertyForm } from "@/components/forms/property-form";
import { Card } from "@/components/ui/card";
import { getAreasWithCounts } from "@/modules/areas/queries";

export const metadata: Metadata = {
  title: "Add property",
};

export default function NewPropertyPage() {
  const areas = getAreasWithCounts().map((area) => ({
    slug: area.slug,
    name: area.name,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Properties", href: "/admin/properties" },
          { label: "Add property" },
        ]}
        eyebrow="Properties"
        title="Add a property"
        description="Prepare a complete listing with pricing, verification, brokerage, and image previews. Validation runs in the browser."
      />

      <Notice className="mt-6">
        Development preview — this form does not save or publish anything.
        Selected images stay in your browser and are never uploaded.
      </Notice>

      <Card className="mt-6 p-5 sm:p-8">
        <PropertyForm areas={areas} />
      </Card>
    </div>
  );
}
