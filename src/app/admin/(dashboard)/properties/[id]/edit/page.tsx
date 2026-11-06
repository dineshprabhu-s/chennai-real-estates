import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Notice } from "@/components/common/notice";
import { PageHeader } from "@/components/common/page-header";
import { PropertyForm } from "@/components/forms/property-form";
import { Button } from "@/components/ui/button";
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
        title="Edit property"
        description={`Working on: ${property.title}. This preview shows the fields that will be editable once the data layer is connected.`}
      />

      <Notice className="mt-6">
        Editing is disabled in this foundation build. Changes are not saved, and
        no data leaves this page.
      </Notice>

      <Card className="mt-6 p-6 sm:p-8">
        <PropertyForm
          areas={areas}
          property={property}
          submitLabel="Save changes"
        />
      </Card>
    </div>
  );
}
