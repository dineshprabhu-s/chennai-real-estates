import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Notice } from "@/components/common/notice";
import { PropertyForm } from "@/components/forms/property-form";
import { Card } from "@/components/ui/card";
import { requireBroker } from "@/lib/auth/broker";
import { getBrokerAreas } from "@/lib/supabase/queries/broker-areas";
import { getBrokerPropertyById } from "@/lib/supabase/queries/broker-properties";

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditPropertyPageProps): Promise<Metadata> {
  await params;
  return { title: "Edit property" };
}

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  await requireBroker();

  const { id } = await params;
  const property = await getBrokerPropertyById(id);

  if (!property) {
    notFound();
  }

  const areas = (await getBrokerAreas()).filter((area) => area.isActive || area.slug === property.areaSlug);
  // Only fields used by this authorized form cross the client boundary.
  const { id: propertyId, title, summary, description, publicDescription, type, configuration, listingType, status, price, priceNegotiable, bedrooms, bathrooms, builtUpAreaSqft, carpetAreaSqft, udsSqft, floor, facing, buildingAgeYears, hasLift, parking, furnishing, approvalStatus, brokerage, brokerageType, brokerageValue, landmark, address, totalFloors, securityDeposit, lastVerifiedAt, areaSlug, features, isFeatured, verificationStatus } = property;
  const formProperty = { id: propertyId, title, summary, description, publicDescription, type, configuration, listingType, status, price, priceNegotiable, bedrooms, bathrooms, builtUpAreaSqft, carpetAreaSqft, udsSqft, floor, facing, buildingAgeYears, hasLift, parking, furnishing, approvalStatus, brokerage, brokerageType, brokerageValue, landmark, address, totalFloors, securityDeposit, lastVerifiedAt, areaSlug, features, isFeatured, verificationStatus };

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
        description={`Working on ${property.id}: ${property.title}. Available details are prefilled; saving changes preserves fields not edited here.`}
      />

      <Notice className="mt-6">
        Selected images stay in your browser and are never uploaded.
      </Notice>

      <Card className="mt-6 p-5 sm:p-8">
        <PropertyForm areas={areas} property={formProperty} />
      </Card>
    </div>
  );
}
