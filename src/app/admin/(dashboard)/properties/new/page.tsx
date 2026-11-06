import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { PropertyForm } from "@/components/forms/property-form";
import { Button } from "@/components/ui/button";
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
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/properties">
          <ArrowLeft aria-hidden="true" />
          Back to properties
        </Link>
      </Button>

      <PageHeader
        className="mt-4"
        variant="admin"
        eyebrow="Properties"
        title="Add a property"
        description="This form previews the fields a complete listing will need. Validation and saving will be connected with the data layer."
      />

      <Notice className="mt-6">
        The form is intentionally non-functional in this foundation build. All
        fields are safe to explore; nothing is saved or transmitted.
      </Notice>

      <Card className="mt-6 p-6 sm:p-8">
        <PropertyForm areas={areas} />
      </Card>
    </div>
  );
}
