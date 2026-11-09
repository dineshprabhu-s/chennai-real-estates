"use client";

import { ArrowLeft, Save, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { FormField } from "@/components/forms/form-field";
import { ImagePreviewSelector } from "@/components/forms/image-preview-selector";
import { adaptPropertyForm } from "@/components/forms/property-form-adapter";
import { createBrokerProperty, updateBrokerProperty } from "@/app/admin/(dashboard)/properties/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  approvalStatusOptions,
  brokerageTypeOptions,
  facingOptions,
  furnishingOptions,
  listingTypeOptions,
  propertyConfigurationOptions,
  propertyTypeOptions,
  verificationStatusOptions,
} from "@/modules/properties/constants";
import type {
  ApprovalStatus,
  BrokerageType,
  ListingType,
  VerificationStatus,
} from "@/types/property";
import type { Property } from "@/types/property";

type FormProperty = Pick<Property, "id" | "title" | "summary" | "description" | "type" | "configuration" | "listingType" | "status" | "price" | "priceNegotiable" | "bedrooms" | "bathrooms" | "builtUpAreaSqft" | "carpetAreaSqft" | "udsSqft" | "floor" | "facing" | "buildingAgeYears" | "hasLift" | "parking" | "furnishing" | "approvalStatus" | "brokerage" | "brokerageType" | "brokerageValue" | "landmark" | "address" | "totalFloors" | "securityDeposit" | "lastVerifiedAt" | "areaSlug" | "features" | "isFeatured" | "verificationStatus"> & { publicDescription: string[] };

interface AreaOption {
  slug: string;
  name: string;
  isActive?: boolean;
}

interface PropertyFormProps {
  areas: AreaOption[];
  property?: FormProperty;
  listedAt?: string;
  cancelHref?: string;
}

type FieldErrors = Record<string, string>;

interface FormSectionProps {
  letter: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

function FormSection({
  letter,
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary"
        >
          {letter}
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

/**
 * Property form shared by the add and edit screens.
 * Server actions revalidate all submitted data before saving.
 */
export function PropertyForm({
  areas,
  property,
  listedAt,
  cancelHref = "/admin/properties",
}: PropertyFormProps) {
  const prefix = property ? `edit-${property.id}` : "new-property";
  const [listingType, setListingType] = useState<ListingType>(
    property?.listingType ?? "sale",
  );
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(
    property?.approvalStatus ?? "unapproved",
  );
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>(property?.verificationStatus ?? "sample");
  // Free-form brokerage and structured terms are independent database fields.
  const [brokerageText, setBrokerageText] = useState(property?.brokerage ?? "");
  const [brokerageType, setBrokerageType] = useState<BrokerageType | "">(
    property ? property.brokerageType ?? "" : "none",
  );
  const [brokerageValue, setBrokerageValue] = useState(property?.brokerageValue ?? "");
  const [brokerageTextEdited, setBrokerageTextEdited] = useState(false);
  const [brokerageTypeEdited, setBrokerageTypeEdited] = useState(false);
  const [brokerageValueEdited, setBrokerageValueEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(property?.status);
  const edited = useRef(new Set<string>());

  function id(name: string) {
    return `${prefix}-${name}`;
  }

  function errorId(name: string) {
    return `${id(name)}-error`;
  }

  function errorProps(name: string) {
    const error = errors[name];

    return error
      ? { "aria-invalid": true as const, "aria-describedby": errorId(name) }
      : {};
  }

  function validate(data: FormData): FieldErrors {
    const next: FieldErrors = {};
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const number = (key: string) => Number(value(key));
    const title = value("title");
    const summary = value("summary");
    const description = value("description");
    const price = number("price");
    const builtUp = value("builtUpAreaSqft");
    const approved = value("approvalStatus");
    const verified = value("verificationStatus");
    const verifiedAt = value("lastVerifiedAt");

    if (title.length < 5) {
      next.title = "Enter a property title of at least 5 characters.";
    }

    if (summary.length < 10) {
      next.summary = "Add a short summary of at least 10 characters.";
    }

    if (description.length < 20) {
      next.description = "Add a description of at least 20 characters.";
    }

    if (!value("areaSlug")) {
      next.areaSlug = "Select the locality for this property.";
    }

    if (!Number.isFinite(price) || price <= 0) {
      next.price = "Enter a price greater than zero.";
    }

    if (builtUp && (!Number.isFinite(number("builtUpAreaSqft")) || number("builtUpAreaSqft") <= 0)) {
      next.builtUpAreaSqft = "Built-up area must be greater than zero.";
    }

    for (const key of [
      "bedrooms",
      "bathrooms",
      "carpetAreaSqft",
      "udsSqft",
      "totalFloors",
      "buildingAgeYears",
      "securityDeposit",
    ]) {
      const raw = value(key);

      if (raw && (!Number.isFinite(number(key)) || number(key) < 0)) {
        next[key] = "Enter a valid non-negative number.";
      }
    }

    if ((brokerageTypeEdited || brokerageValueEdited) && brokerageType !== "" && brokerageType !== "none" && brokerageValue.trim().length === 0) {
      next.brokerageValue =
        "Add the brokerage value, for example 2 or a fixed amount.";
    }

    if (approved === "approved" && verified === "sample") {
      next.approvalStatus =
        "A sample listing cannot be marked approved. Confirm the property details first.";
    }

    if (verified === "broker-confirmed" && !verifiedAt) {
      next.lastVerifiedAt =
        "Add the last verified date before marking a listing broker-confirmed.";
    }

    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = submitter instanceof HTMLElement
      ? new FormData(form, submitter)
      : new FormData(form);
    const intent = data.get("intent");
    if (intent !== "draft" && intent !== "publish" && !(intent === "preserve" && property)) {
      setFeedback("Choose Save as Draft or Publish Listing.");
      return;
    }
    const nextErrors = validate(data);
    const firstError = Object.keys(nextErrors)[0];

    setErrors(nextErrors);

    if (firstError) {
      setFeedback(null);
      document.getElementById(id(firstError))?.focus();
      return;
    }

    const payload = adaptPropertyForm(data, property ? "edit" : "create", edited.current);
    setSaving(true);
    setFeedback(null);
    try {
      const result = property
        ? await updateBrokerProperty(property.id, payload, intent)
        : await createBrokerProperty(payload, intent);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        setFeedback(result.message);
        return;
      }
      setErrors({});
      setFeedback(`${result.changed ? "Saved" : "No changes to save"}: ${result.id}.${result.warning ? ` ${result.warning}` : ""}`);
      if (!property) setCreatedId(result.id);
      else {
        if (intent === "draft") setCurrentStatus("draft");
        if (intent === "publish") setCurrentStatus("available");
        edited.current.clear();
      }
    } catch {
      setFeedback("Unable to save the property. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-9"
      onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }}
      onChangeCapture={(event) => {
        const element = event.target;
        if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) return;
        const name = element.name || (element.id.startsWith(`${prefix}-`) ? element.id.slice(prefix.length + 1) : "");
        if (name) edited.current.add(name);
      }}>
      {!property && listedAt ? <input type="hidden" name="listedAt" value={listedAt} /> : null}
      <FormSection
        letter="A"
        title="Basic information"
        description="Public-facing details and the locality this listing belongs to."
      >
        <FormField
          label="Property title"
          htmlFor={id("title")}
          required
          error={errors.title}
          errorId={errorId("title")}
        >
          <Input
            id={id("title")}
            name="title"
            defaultValue={property?.title}
            placeholder="e.g. Sunlit 3BHK apartment with covered parking"
            {...errorProps("title")}
          />
        </FormField>

        <FormField
          label="Short summary"
          htmlFor={id("summary")}
          hint="Shown on listing cards"
          required
          error={errors.summary}
          errorId={errorId("summary")}
        >
          <Textarea
            id={id("summary")}
            name="summary"
            defaultValue={property?.summary}
            placeholder="One or two sentences that capture what makes this listing worth a look."
            className="min-h-20"
            {...errorProps("summary")}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Transaction type"
            htmlFor={id("listingType")}
            required
          >
            <NativeSelect
              id={id("listingType")}
              name="listingType"
              value={listingType}
              onChange={(event) =>
                setListingType(event.target.value as ListingType)
              }
            >
              {listingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Property category"
            htmlFor={id("type")}
            hint="Apartment, house, villa, or plot"
            required
          >
            <NativeSelect
              id={id("type")}
              name="type"
              defaultValue={property?.type ?? "apartment"}
            >
              {propertyTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Configuration"
            htmlFor={id("configuration")}
            hint="Leave blank for plots"
          >
            <NativeSelect
              id={id("configuration")}
              name="configuration"
              defaultValue={property?.configuration ?? ""}
            >
              <option value="">Not specified</option>
              {propertyConfigurationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Locality"
            htmlFor={id("areaSlug")}
            required
            error={errors.areaSlug}
            errorId={errorId("areaSlug")}
          >
            <NativeSelect
              id={id("areaSlug")}
              name="areaSlug"
              defaultValue={property?.areaSlug ?? areas[0]?.slug ?? ""}
              {...errorProps("areaSlug")}
            >
              {areas.map((area) => (
                <option key={area.slug} value={area.slug}>
                  {area.name}{area.isActive === false ? " (inactive)" : ""}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {!property ? (
            <FormField label="Locality display name" htmlFor={id("locality")} required error={errors.locality} errorId={errorId("locality")}>
              <Input id={id("locality")} name="locality" placeholder="e.g. Guperan Nagar, Madipakkam" {...errorProps("locality")} />
            </FormField>
          ) : null}
          <FormField
            label="Address"
            htmlFor={id("address")}
            hint="Broker workspace only"
            className="sm:col-span-2"
          >
            <Input
              id={id("address")}
              name="address"
              defaultValue={property?.address}
              placeholder="Street, block, and building details"
            />
          </FormField>

          <FormField
            label="Landmark"
            htmlFor={id("landmark")}
            hint="Optional"
          >
            <Input
              id={id("landmark")}
              name="landmark"
              defaultValue={property?.landmark}
              placeholder="e.g. Near Ponniamman Kovil"
            />
          </FormField>
        </div>

        <FormField
          label="Private broker description"
          htmlFor={id("description")}
          required
          error={errors.description}
          errorId={errorId("description")}
        >
          <Textarea
            id={id("description")}
            name="description"
            defaultValue={property?.description.join("\n\n")}
            placeholder="Describe the layout, condition, and location advantages."
            className="min-h-32"
            {...errorProps("description")}
          />
        </FormField>

        <FormField label="Public description" htmlFor={id("publicDescription")} hint="Shown to visitors" error={errors.publicDescription} errorId={errorId("publicDescription")}>
          <Textarea id={id("publicDescription")} name="publicDescription" defaultValue={property?.publicDescription.join("\n\n") ?? ""} placeholder="Enter the customer-visible description separately." className="min-h-32" {...errorProps("publicDescription")} />
        </FormField>

        <FormField
          label="Features"
          htmlFor={id("features")}
          hint="Separate with commas"
        >
          <Textarea
            id={id("features")}
            name="features"
            defaultValue={property?.features.join(", ")}
            placeholder="Covered parking, Lift, Piped gas connection"
          />
        </FormField>
      </FormSection>

      <div className="border-t border-border" />

      <FormSection
        letter="B"
        title="Property specifications"
        description="Leave fields blank when the source listing does not provide the detail."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Bedrooms"
            htmlFor={id("bedrooms")}
            error={errors.bedrooms}
            errorId={errorId("bedrooms")}
          >
            <Input
              id={id("bedrooms")}
              name="bedrooms"
              type="number"
              min={0}
              defaultValue={property?.bedrooms ?? undefined}
              placeholder="3"
              {...errorProps("bedrooms")}
            />
          </FormField>

          <FormField
            label="Bathrooms"
            htmlFor={id("bathrooms")}
            error={errors.bathrooms}
            errorId={errorId("bathrooms")}
          >
            <Input
              id={id("bathrooms")}
              name="bathrooms"
              type="number"
              min={0}
              defaultValue={property?.bathrooms ?? undefined}
              placeholder="2"
              {...errorProps("bathrooms")}
            />
          </FormField>

          <FormField
            label="Built-up area"
            htmlFor={id("builtUpAreaSqft")}
            hint="sq ft"
            error={errors.builtUpAreaSqft}
            errorId={errorId("builtUpAreaSqft")}
          >
            <Input
              id={id("builtUpAreaSqft")}
              name="builtUpAreaSqft"
              type="number"
              min={0}
              defaultValue={property?.builtUpAreaSqft ?? undefined}
              placeholder="1250"
              {...errorProps("builtUpAreaSqft")}
            />
          </FormField>

          <FormField
            label="Carpet area"
            htmlFor={id("carpetAreaSqft")}
            hint="sq ft"
            error={errors.carpetAreaSqft}
            errorId={errorId("carpetAreaSqft")}
          >
            <Input
              id={id("carpetAreaSqft")}
              name="carpetAreaSqft"
              type="number"
              min={0}
              defaultValue={property?.carpetAreaSqft}
              placeholder="980"
              {...errorProps("carpetAreaSqft")}
            />
          </FormField>

          <FormField
            label="UDS"
            htmlFor={id("udsSqft")}
            hint="sq ft"
            error={errors.udsSqft}
            errorId={errorId("udsSqft")}
          >
            <Input
              id={id("udsSqft")}
              name="udsSqft"
              type="number"
              min={0}
              defaultValue={property?.udsSqft}
              placeholder="507"
              {...errorProps("udsSqft")}
            />
          </FormField>

          <FormField label="Floor" htmlFor={id("floor")}>
            <Input
              id={id("floor")}
              name="floor"
              defaultValue={property?.floor}
              placeholder="e.g. Second floor"
            />
          </FormField>

          <FormField
            label="Total floors"
            htmlFor={id("totalFloors")}
            error={errors.totalFloors}
            errorId={errorId("totalFloors")}
          >
            <Input
              id={id("totalFloors")}
              name="totalFloors"
              type="number"
              min={0}
              defaultValue={property?.totalFloors}
              placeholder="4"
              {...errorProps("totalFloors")}
            />
          </FormField>

          <FormField label="Facing" htmlFor={id("facing")}>
            <NativeSelect
              id={id("facing")}
              name="facing"
              defaultValue={property?.facing ?? ""}
            >
              <option value="">Not specified</option>
              {facingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Building age"
            htmlFor={id("buildingAgeYears")}
            hint="years"
            error={errors.buildingAgeYears}
            errorId={errorId("buildingAgeYears")}
          >
            <Input
              id={id("buildingAgeYears")}
              name="buildingAgeYears"
              type="number"
              min={0}
              defaultValue={property?.buildingAgeYears}
              placeholder="10"
              {...errorProps("buildingAgeYears")}
            />
          </FormField>

          <FormField label="Lift" htmlFor={id("hasLift")}>
            <NativeSelect
              id={id("hasLift")}
              name="hasLift"
              defaultValue={
                property?.hasLift === undefined
                  ? ""
                  : property.hasLift
                    ? "yes"
                    : "no"
              }
            >
              <option value="">Not specified</option>
              <option value="yes">Available</option>
              <option value="no">Not available</option>
            </NativeSelect>
          </FormField>

          <FormField label="Parking" htmlFor={id("parking")}>
            <Input
              id={id("parking")}
              name="parking"
              defaultValue={property?.parking}
              placeholder="e.g. Covered car parking"
            />
          </FormField>

          <FormField label="Furnishing" htmlFor={id("furnishing")}>
            <NativeSelect
              id={id("furnishing")}
              name="furnishing"
              defaultValue={property?.furnishing ?? ""}
            >
              <option value="">Not specified</option>
              {furnishingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </FormSection>

      <div className="border-t border-border" />

      <FormSection
        letter="C"
        title="Pricing"
        description="Only the fields relevant to the selected transaction type are shown."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label={
              listingType === "sale"
                ? "Sale price (INR)"
                : listingType === "rent"
                  ? "Monthly rent (INR)"
                  : "Lease amount (INR)"
            }
            htmlFor={id("price")}
            required
            error={errors.price}
            errorId={errorId("price")}
          >
            <Input
              id={id("price")}
              name="price"
              type="number"
              min={0}
              step={1000}
              defaultValue={property?.price}
              placeholder={listingType === "rent" ? "28000" : "8500000"}
              {...errorProps("price")}
            />
          </FormField>

          {listingType !== "sale" ? (
            <FormField
              label="Security deposit (INR)"
              htmlFor={id("securityDeposit")}
              hint="Optional"
              error={errors.securityDeposit}
              errorId={errorId("securityDeposit")}
            >
              <Input
                id={id("securityDeposit")}
                name="securityDeposit"
                type="number"
                min={0}
                step={1000}
                defaultValue={property?.securityDeposit}
                placeholder="e.g. 100000"
                {...errorProps("securityDeposit")}
              />
            </FormField>
          ) : null}

          <label className="flex items-start gap-3 rounded-lg border border-border p-4 sm:col-span-2 lg:col-span-1">
            <input
              type="checkbox"
              name="priceNegotiable"
              defaultChecked={property?.priceNegotiable ?? false}
              className="mt-0.5 size-4 rounded border-input accent-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Price negotiable
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                Shows a negotiable note on the listing.
              </span>
            </span>
          </label>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Prices are displayed with Indian number formatting, for example
          ₹45,00,000.
        </p>
      </FormSection>

      <div className="border-t border-border" />

      <FormSection
        letter="D"
        title="Legal and verification"
        description="Approval status is never inferred from an enquiry or a property visit."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Approval status"
            htmlFor={id("approvalStatus")}
            error={errors.approvalStatus}
            errorId={errorId("approvalStatus")}
          >
            <NativeSelect
              id={id("approvalStatus")}
              name="approvalStatus"
              value={approvalStatus}
              onChange={(event) =>
                setApprovalStatus(event.target.value as ApprovalStatus)
              }
              {...errorProps("approvalStatus")}
            >
              {approvalStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField
            label="Verification status"
            htmlFor={id("verificationStatus")}
            error={errors.verificationStatus}
            errorId={errorId("verificationStatus")}
          >
            <NativeSelect
              id={id("verificationStatus")}
              name="verificationStatus"
              value={verificationStatus}
              onChange={(event) =>
                setVerificationStatus(event.target.value as VerificationStatus)
              }
            >
              {verificationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <p className="text-sm text-muted-foreground">Current status: {currentStatus ?? "new listing"}. Choose Publish or Save as Draft to change it.</p>

          <FormField
            label="Last verified"
            htmlFor={id("lastVerifiedAt")}
            hint="Optional unless broker-confirmed"
            error={errors.lastVerifiedAt}
            errorId={errorId("lastVerifiedAt")}
          >
            <Input
              id={id("lastVerifiedAt")}
              name="lastVerifiedAt"
              type="date"
              defaultValue={property?.lastVerifiedAt}
              {...errorProps("lastVerifiedAt")}
            />
          </FormField>
        </div>

        {approvalStatus === "unapproved" ? (
          <div
            role="note"
            className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
          >
            <ShieldAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-warning"
            />
            <p>
              Unapproved listings are marked prominently on the public website.
              Approval cannot be implied by publishing a listing.
            </p>
          </div>
        ) : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          A sample/unverified listing cannot be marked approved. Confirm the
          property details and verification date first.
        </p>
      </FormSection>

      <div className="border-t border-border" />

      <FormSection
        letter="E"
        title="Brokerage"
        description="Record the brokerage terms separately from the property price."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Brokerage terms" htmlFor={id("brokerage")} hint="Free-form terms">
            <Input
              id={id("brokerage")}
              name={brokerageTextEdited ? "brokerage" : undefined}
              value={brokerageText}
              onChange={(event) => {
                setBrokerageText(event.target.value);
                setBrokerageTextEdited(true);
              }}
              placeholder="e.g. 2%"
            />
          </FormField>
          <FormField label="Brokerage type" htmlFor={id("brokerageType")}>
            <NativeSelect
              id={id("brokerageType")}
              name={brokerageTypeEdited ? "brokerageType" : undefined}
              value={brokerageType}
              onChange={(event) => {
                setBrokerageType(event.target.value as BrokerageType | "");
                setBrokerageTypeEdited(true);
              }}
            >
              <option value="">Not specified</option>
              {brokerageTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {brokerageType !== "" && brokerageType !== "none" ? (
            <FormField
              label="Brokerage value"
              htmlFor={id("brokerageValue")}
              hint={
                brokerageType === "percentage"
                  ? "e.g. 2 for 2%"
                  : "Amount in INR"
              }
              error={errors.brokerageValue}
              errorId={errorId("brokerageValue")}
            >
              <Input
                id={id("brokerageValue")}
                name={brokerageValueEdited ? "brokerageValue" : undefined}
                value={brokerageValue}
                onChange={(event) => {
                  setBrokerageValue(event.target.value);
                  setBrokerageValueEdited(true);
                }}
                placeholder={brokerageType === "percentage" ? "2" : "50000"}
                {...errorProps("brokerageValue")}
              />
            </FormField>
          ) : null}
          {brokerageTypeEdited && brokerageType === "none" ? (
            <input type="hidden" name="brokerageValue" value="" />
          ) : null}
        </div>
      </FormSection>

      <div className="border-t border-border" />

      <FormSection
        letter="F"
        title="Property images"
        description="Select image files to preview how the gallery could look."
      >
        <ImagePreviewSelector inputId={`${prefix}-images`} />
      </FormSection>

      <div className="border-t border-border" />

      <section>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary"
          >
            G
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Listing actions
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Save changes, publish the listing, or save it as a draft.
            </p>
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-lg border border-border p-4">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={property?.isFeatured ?? false}
            className="mt-0.5 size-4 rounded border-input accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Feature this listing
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Featured listings may appear on the homepage and area pages.
            </span>
          </span>
        </label>

        {feedback ? <p role="status" aria-live="polite" className="mt-5 rounded-lg border border-border p-4 text-sm">{feedback}</p> : null}
        {createdId ? <p className="mt-3 text-sm"><Link className="text-primary underline" href={`/admin/properties/${encodeURIComponent(createdId)}/edit`}>Edit {createdId}</Link>{" · "}<Link className="text-primary underline" href="/admin/properties">Property list</Link></p> : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button type="submit" name="intent" value="draft" variant="outline" disabled={saving || !!createdId}>
            <Save aria-hidden="true" />
            Save as Draft
          </Button>
          <Button type="submit" name="intent" value="publish" disabled={saving || !!createdId}>
            <Send aria-hidden="true" />
            Publish Listing
          </Button>
          {property ? <Button type="submit" name="intent" value="preserve" variant="secondary" disabled={saving}>Save changes</Button> : null}
          <Button asChild variant="ghost">
            <Link href={cancelHref}>
              <ArrowLeft aria-hidden="true" />
              Cancel
            </Link>
          </Button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {saving ? "Saving…" : "Property images are previews and are not uploaded."}
        </p>
      </section>
    </form>
  );
}
