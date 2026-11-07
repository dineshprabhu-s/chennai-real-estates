import type { Area } from "@/types/area";

/**
 * Sample areas for UI development only.
 * These descriptions are illustrative and not verified market data.
 */
export const demoAreas: Area[] = [
  {
    slug: "madipakkam",
    name: "Madipakkam",
    pincode: "600091",
    summary:
      "A well-connected residential neighbourhood with a strong mix of family apartments, independent homes, and local conveniences.",
    description:
      "Madipakkam sits between Velachery and Pallikaranai, with easy access to the Velachery MRTS, OMR, and the everyday markets along Medavakkam Main Road. The neighbourhood suits families looking for established schools, hospitals, and a manageable commute.",
    highlights: [
      "Strong rental demand from working professionals",
      "Walkable local markets and everyday services",
      "Easy access to Velachery and the OMR corridor",
    ],
    parentArea: "Chennai",
    isActive: true,
  },
  {
    slug: "keelkattalai",
    name: "Keelkattalai",
    pincode: "600117",
    summary:
      "A settled residential pocket known for independent houses, quieter streets, and good access to Madipakkam.",
    description:
      "Keelkattalai is a largely residential area with a mix of older independent homes and newer apartment projects. It offers a calmer pace than the main Velachery–Madipakkam stretch while keeping schools, temples, and daily shopping close at hand.",
    highlights: [
      "Quieter residential streets",
      "Good stock of independent houses",
      "Close to Madipakkam and Medavakkam",
    ],
    parentArea: "Chennai",
    isActive: true,
  },
  {
    slug: "pallikaranai",
    name: "Pallikaranai",
    pincode: "600100",
    summary:
      "A fast-growing residential belt with newer apartment communities and direct access to the OMR IT corridor.",
    description:
      "Pallikaranai has seen steady residential growth around its marshland and along the Medavakkam–Sholinganallur road. It is a practical choice for buyers who want newer construction and a shorter commute toward the IT corridor.",
    highlights: [
      "Newer apartment projects",
      "Direct access to OMR",
      "Wide choice of schools and hospitals nearby",
    ],
    parentArea: "Chennai",
    isActive: true,
  },
  {
    slug: "velachery",
    name: "Velachery",
    pincode: "600042",
    summary:
      "A busy, established hub with excellent retail, transit links, and a wide range of rental homes.",
    description:
      "Velachery is one of south Chennai's main commercial and residential hubs, anchored by the MRTS terminus, Phoenix Marketcity, and a dense network of shops and services. It is a convenient base for professionals who value connectivity over quiet streets.",
    highlights: [
      "MRTS and bus connectivity",
      "Malls, restaurants, and daily conveniences",
      "Large rental market for families and professionals",
    ],
    parentArea: "Chennai",
    isActive: true,
  },
];
