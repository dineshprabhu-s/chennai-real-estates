import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  listingTypeOptions,
  propertyTypeOptions,
} from "@/modules/properties/constants";
import { cn } from "@/lib/utils";

interface AreaOption {
  slug: string;
  name: string;
}

interface HomeSearchFormProps {
  areas: AreaOption[];
  className?: string;
}

const labelClass = "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

export function HomeSearchForm({ areas, className }: HomeSearchFormProps) {
  return (
    <form
      action="/properties"
      method="get"
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-[0_20px_50px_-35px_rgba(27,36,32,0.45)] sm:p-5",
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <div className="space-y-2">
          <label htmlFor="home-listing-type" className={labelClass}>
            Transaction type
          </label>
          <NativeSelect
            id="home-listing-type"
            name="listingType"
            defaultValue=""
            className="h-11 bg-background"
          >
            <option value="">Sale, rent, or lease</option>
            {listingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="home-locality" className={labelClass}>
            Locality
          </label>
          <NativeSelect
            id="home-locality"
            name="areaSlug"
            defaultValue=""
            className="h-11 bg-background"
          >
            <option value="">All localities</option>
            {areas.map((area) => (
              <option key={area.slug} value={area.slug}>
                {area.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="space-y-2">
          <label htmlFor="home-property-type" className={labelClass}>
            Property type
          </label>
          <NativeSelect
            id="home-property-type"
            name="category"
            defaultValue=""
            className="h-11 bg-background"
          >
            <option value="">All property types</option>
            {propertyTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <Button type="submit" size="lg" className="h-11 w-full px-6 lg:w-auto">
          <Search aria-hidden="true" />
          Search properties
        </Button>
      </div>
    </form>
  );
}
