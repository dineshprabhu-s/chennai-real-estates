import { cn } from "@/lib/utils";
import { propertyTypeLabels } from "@/modules/properties/constants";
import type { PropertyType } from "@/types/property";

type IllustrationVariant = "exterior" | "interior" | "plan";

interface PropertyIllustrationProps {
  type: PropertyType;
  variant?: IllustrationVariant;
  className?: string;
  label?: string | false;
}

const strokeProps = {
  stroke: "var(--primary)",
  strokeOpacity: 0.3,
  strokeWidth: 1.5,
  vectorEffect: "non-scaling-stroke",
} as const;

function ApartmentExterior() {
  return (
    <>
      <rect x="196" y="134" width="170" height="258" rx="3" {...strokeProps} fill="var(--card)" />
      <rect x="352" y="188" width="110" height="204" rx="3" {...strokeProps} fill="var(--card)" />
      <path d="M196 134 240 96h178l-52 38Z" {...strokeProps} fill="var(--accent)" />
      <rect x="218" y="160" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="266" y="160" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="314" y="160" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="218" y="210" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="266" y="210" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="314" y="210" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="218" y="260" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="266" y="260" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="314" y="260" width="28" height="30" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="374" y="212" width="24" height="26" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="416" y="212" width="24" height="26" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="374" y="258" width="24" height="26" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="416" y="258" width="24" height="26" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="374" y="304" width="24" height="26" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="416" y="304" width="24" height="26" rx="1" {...strokeProps} fill="var(--secondary)" />
      <rect x="264" y="326" width="36" height="66" rx="2" {...strokeProps} fill="var(--primary)" fillOpacity="0.16" />
      <path d="M196 392h170M352 392h110" {...strokeProps} />
    </>
  );
}

function HouseExterior() {
  return (
    <>
      <rect x="210" y="212" width="230" height="180" rx="3" {...strokeProps} fill="var(--card)" />
      <path d="M186 220 326 112l140 108Z" {...strokeProps} fill="var(--accent)" />
      <rect x="292" y="308" width="52" height="84" rx="2" {...strokeProps} fill="var(--primary)" fillOpacity="0.16" />
      <rect x="238" y="254" width="42" height="40" rx="2" {...strokeProps} fill="var(--secondary)" />
      <rect x="360" y="254" width="42" height="40" rx="2" {...strokeProps} fill="var(--secondary)" />
      <path d="M238 274h42M259 254v40M360 274h42M381 254v40" {...strokeProps} strokeOpacity={0.18} />
      <path d="M210 392h230" {...strokeProps} />
    </>
  );
}

function PlotExterior() {
  return (
    <>
      <path
        d="M112 360 252 178l246-26 74 196Z"
        {...strokeProps}
        fill="var(--card)"
      />
      <path
        d="M154 350 274 210l184-18 50 142Z"
        {...strokeProps}
        strokeDasharray="5 6"
        strokeOpacity={0.2}
        fill="none"
      />
      <path d="M252 178v196M498 152v196" {...strokeProps} strokeOpacity={0.18} />
      <circle cx="372" cy="268" r="9" {...strokeProps} fill="var(--accent)" />
      <path d="M372 277v44" {...strokeProps} />
      <path d="M372 300c-16-2-24-10-26-24 16 1 24 9 26 24ZM372 314c16-2 24-10 26-24-16 1-24 9-26 24Z" {...strokeProps} fill="var(--accent)" />
      <circle cx="126" cy="324" r="34" {...strokeProps} fill="var(--accent)" />
      <path d="M126 358v34" {...strokeProps} />
    </>
  );
}

function InteriorScene() {
  return (
    <>
      <path d="M0 390h640" {...strokeProps} />
      <rect x="330" y="78" width="214" height="196" rx="4" {...strokeProps} fill="var(--card)" />
      <path d="M330 176h214M437 78v196" {...strokeProps} strokeOpacity={0.2} />
      <path d="M92 292h230v78H92Z" {...strokeProps} fill="var(--card)" />
      <path d="M112 252h190v54H112Z" {...strokeProps} fill="var(--accent)" />
      <path d="M140 306h58M242 306h42" {...strokeProps} strokeOpacity={0.2} />
      <ellipse cx="392" cy="364" rx="132" ry="20" {...strokeProps} fill="var(--accent)" strokeOpacity={0.18} />
      <rect x="340" y="310" width="118" height="38" rx="6" {...strokeProps} fill="var(--card)" />
      <path d="M352 348v16M446 348v16" {...strokeProps} />
      <circle cx="260" cy="362" r="26" {...strokeProps} fill="var(--card)" />
      <path d="M260 336v52M234 362h52" {...strokeProps} strokeOpacity={0.2} />
      <rect x="96" y="104" width="82" height="100" rx="3" {...strokeProps} fill="var(--card)" />
      <path d="M117 132h40M117 152h40M117 172h24" {...strokeProps} strokeOpacity={0.2} />
      <circle cx="562" cy="344" r="22" {...strokeProps} fill="var(--accent)" />
      <path d="M562 366v24" {...strokeProps} />
    </>
  );
}

function FloorPlanScene() {
  return (
    <>
      <rect x="126" y="76" width="388" height="314" rx="2" {...strokeProps} fill="var(--card)" strokeWidth={2} />
      <path d="M126 214h152M278 170v220M278 306h236M400 214v92" {...strokeProps} />
      <path d="M278 214a36 36 0 0 1 36 36" {...strokeProps} strokeDasharray="4 5" strokeOpacity={0.25} />
      <path d="M278 306a34 34 0 0 0-34-34" {...strokeProps} strokeDasharray="4 5" strokeOpacity={0.25} />
      <rect x="174" y="254" width="58" height="86" rx="2" {...strokeProps} fill="var(--secondary)" />
      <rect x="306" y="98" width="170" height="76" rx="2" {...strokeProps} fill="var(--secondary)" />
      <rect x="430" y="238" width="56" height="90" rx="2" {...strokeProps} fill="var(--secondary)" />
      <path d="M126 70h388M126 396h388" {...strokeProps} strokeDasharray="3 5" strokeOpacity={0.18} />
      <path d="M118 76v314M522 76v314" {...strokeProps} strokeDasharray="3 5" strokeOpacity={0.18} />
    </>
  );
}

export function PropertyIllustration({
  type,
  variant = "exterior",
  className,
  label = "Illustration",
}: PropertyIllustrationProps) {
  const category = propertyTypeLabels[type].toLowerCase();
  const ariaLabel =
    variant === "plan"
      ? "Illustrative floor plan placeholder, not a property photograph"
      : variant === "interior"
        ? "Illustrative interior placeholder, not a property photograph"
        : `Illustrative ${category} placeholder, not a property photograph`;

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      <svg
        viewBox="0 0 640 480"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={ariaLabel}
        className="absolute inset-0 size-full"
      >
        <rect width="640" height="480" fill="var(--secondary)" />
        <circle cx="540" cy="110" r="64" fill="var(--accent)" />
        <circle cx="540" cy="110" r="92" fill="none" stroke="var(--primary)" strokeOpacity="0.1" strokeWidth="1.5" />
        <path d="M0 392h640" stroke="var(--primary)" strokeOpacity="0.2" strokeWidth="2" />
        {variant === "plan" ? (
          <FloorPlanScene />
        ) : variant === "interior" ? (
          <InteriorScene />
        ) : type === "plot" ? (
          <PlotExterior />
        ) : type === "independent-house" || type === "villa" ? (
          <HouseExterior />
        ) : (
          <ApartmentExterior />
        )}
      </svg>

      {label ? (
        <span className="absolute bottom-3 left-3 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase backdrop-blur-sm">
          {label}
        </span>
      ) : null}
    </div>
  );
}
