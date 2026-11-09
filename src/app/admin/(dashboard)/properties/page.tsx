import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { requireBroker } from "@/lib/auth/broker";
import { getBrokerAreas } from "@/lib/supabase/queries/broker-areas";
import { getBrokerProperties } from "@/lib/supabase/queries/broker-properties";

import { AdminPropertiesClient } from "./admin-properties-client";

export const metadata: Metadata = {
  title: "Properties",
};

// Session-guarded admin pages are allowed to block during navigation.
export const instant = false;

export default async function AdminPropertiesPage() {
  await requireBroker();

  const [records, areas] = await Promise.all([getBrokerProperties(), getBrokerAreas()]);
  const properties = records.map(({ id, title, summary, locality, areaSlug, type, configuration, listingType, price, status, verificationStatus, updatedAt, builtUpAreaSqft, facing, bedrooms, bathrooms, floor, approvalStatus, brokerage }) => ({
    id, title, summary, locality, areaSlug, type, configuration, listingType, price, status, verificationStatus, updatedAt, builtUpAreaSqft, facing, bedrooms, bathrooms, floor, approvalStatus, brokerage,
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Properties" }]}
        eyebrow="Properties"
        title="Property management"
        description="Search, filter and review the property catalogue. Property IDs and verification labels are preserved."
        actions={
          <Button asChild>
            <Link href="/admin/properties/new">
              <Plus aria-hidden="true" />
              Add Property
            </Link>
          </Button>
        }
      />

      <AdminPropertiesClient initialProperties={properties} areas={areas} />
    </div>
  );
}
