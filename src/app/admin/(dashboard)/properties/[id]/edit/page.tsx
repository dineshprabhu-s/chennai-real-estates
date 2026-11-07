import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { PropertyForm } from "@/components/forms/property-form";
import { Card } from "@/components/ui/card";
import { getAreasWithCounts } from "@/modules/areas/queries";
import {
  getAllProperties,
  getPropertyById,
} from "@/modules/properties/queries";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return getAllProperties().map((property) => ({ id: property.id }));
}

export async function generateMetadata({
  params,
}: EditPropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  const property = getPropertyById(id);

  return {
    title: property ? `Edit ${property.title}` : "Property not found",
  };
}

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  const { id } = await params;
  const property = getPropertyById(id);

  if (!property) {
    notFound();
  }

  const areas = getAreasWithCounts().map((area) => ({
    slug: area.slug,
    name: area.name,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Properties", href: "/admin/properties" },
          { label: property.id },
          { label: "Edit" },
        ]}
        eyebrow="Properties"
        title="Edit property"
        description={`Working on ${property.id}: ${property.title}. All available demo details are prefilled and optional fields remain blank where no value exists.`}
      />

      <Notice className="mt-6">
        Development preview — changes are validated in the browser but are not
        saved. Existing demo data and public pages remain unchanged.
      </Notice>

      <Card className="mt-6 p-5 sm:p-8">
        <PropertyForm areas={areas} property={property} />
      </Card>
    </div>
  );
}
