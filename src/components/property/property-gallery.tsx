import { PropertyIllustration } from "@/components/property/property-illustration";
import type { PropertyType } from "@/types/property";

interface PropertyGalleryProps {
  type: PropertyType;
}

/**
 * Three-frame placeholder gallery. No stock or AI photographs are presented as
 * the real property; these illustrations are replaced by broker-supplied photos
 * when the media pipeline is added.
 */
export function PropertyGallery({ type }: PropertyGalleryProps) {
  return (
    <div>
      <div className="grid gap-3">
        <PropertyIllustration
          type={type}
          variant="exterior"
          label="Illustrative exterior"
          className="aspect-[16/9] rounded-xl border border-border"
        />
        <div className="grid grid-cols-2 gap-3">
          <PropertyIllustration
            type={type}
            variant="interior"
            label="Illustrative interior"
            className="aspect-[4/3] rounded-xl border border-border"
          />
          <PropertyIllustration
            type={type}
            variant="plan"
            label="Illustrative plan"
            className="aspect-[4/3] rounded-xl border border-border"
          />
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Gallery images are illustrations for this sample listing. Actual property
        photographs will be added once the broker confirms the listing.
      </p>
    </div>
  );
}
