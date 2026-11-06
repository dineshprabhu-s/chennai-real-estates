const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

/**
 * Central brand and contact configuration.
 *
 * The contact details below are placeholders for the foundation build and must
 * be replaced with the broker's real details before launch.
 */
export const siteConfig = {
  name: "Chennai Real Estates",
  shortName: "CRE",
  description:
    "A single-broker property platform for Madipakkam and nearby neighbourhoods in Chennai. Browse curated homes for sale and rent with direct, local guidance.",
  url: siteUrl,
  locale: "en_IN",
  contact: {
    phoneLabel: "+91 90000 00000",
    phoneHref: "tel:+919000000000",
    email: "hello@chennairealestates.example",
    emailHref: "mailto:hello@chennairealestates.example",
    addressLines: ["Madipakkam", "Chennai, Tamil Nadu 600091"],
    hours: "Monday to Saturday, 9:30 AM – 7:00 PM",
  },
  links: {
    properties: "/properties",
    areas: "/areas",
    contact: "/contact",
    adminLogin: "/admin/login",
    adminDashboard: "/admin/dashboard",
  },
} as const;
