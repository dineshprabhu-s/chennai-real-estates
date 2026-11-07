import type { Lead } from "@/types/lead";

/**
 * Seeded enquiries for the admin development preview only.
 *
 * These are not real customers. Names, phone numbers, e-mail addresses, and
 * messages are placeholders; every record is marked `isDemo` and the UI must
 * keep that label visible. Nothing here is read by the public website.
 */
export const demoLeads: Lead[] = [
  {
    id: "LEAD-1001",
    name: "Demo — Priya R.",
    phone: "+91 90000 10001",
    email: "demo.priya@example.com",
    message:
      "Demo enquiry: interested in the 3BHK at Madipakkam. This sample record exists only to preview the admin inbox.",
    propertyId: "MAD-0001",
    status: "new",
    source: "property-enquiry",
    createdAt: "2026-11-06T09:15:00+05:30",
    isDemo: true,
    notes: [],
    activities: [
      {
        id: "ACT-1001-1",
        at: "2026-11-06T09:15:00+05:30",
        label: "Enquiry received",
        detail: "Seeded demo enquiry from the property page.",
      },
    ],
  },
  {
    id: "LEAD-1002",
    name: "Demo — Karthik S.",
    phone: "+91 90000 10002",
    email: null,
    message:
      "Demo enquiry: asked about the lease amount and brokerage for the 2BHK near Ponniamman Kovil.",
    propertyId: "MAD-0007",
    status: "contacted",
    source: "whatsapp",
    createdAt: "2026-11-05T17:40:00+05:30",
    isDemo: true,
    notes: ["Sample note: broker replied with the lease terms on 6 Nov."],
    activities: [
      {
        id: "ACT-1002-1",
        at: "2026-11-05T17:40:00+05:30",
        label: "Enquiry received",
      },
      {
        id: "ACT-1002-2",
        at: "2026-11-06T10:05:00+05:30",
        label: "Contacted customer",
        detail: "Sample activity — terms shared over WhatsApp.",
      },
    ],
  },
  {
    id: "LEAD-1003",
    name: "Demo — Meera V.",
    phone: "+91 90000 10003",
    email: "demo.meera@example.com",
    message:
      "Demo enquiry: wants to visit the unapproved resale flat in Guperan Nagar this weekend.",
    propertyId: "MAD-0009",
    status: "visit-scheduled",
    source: "website-form",
    createdAt: "2026-11-04T12:20:00+05:30",
    isDemo: true,
    notes: ["Sample note: visit proposed for Saturday at 11:00 AM."],
    activities: [
      {
        id: "ACT-1003-1",
        at: "2026-11-04T12:20:00+05:30",
        label: "Enquiry received",
      },
      {
        id: "ACT-1003-2",
        at: "2026-11-05T09:10:00+05:30",
        label: "Visit scheduled",
        detail: "Sample activity — Saturday, 11:00 AM.",
      },
    ],
  },
  {
    id: "LEAD-1004",
    name: "Demo — Arun P.",
    phone: "+91 90000 10004",
    email: null,
    message:
      "Demo enquiry: discussing the price for the independent house in Keelkattalai.",
    propertyId: "MAD-0003",
    status: "negotiation",
    source: "phone",
    createdAt: "2026-11-02T15:05:00+05:30",
    isDemo: true,
    notes: ["Sample note: customer asked whether the price is negotiable."],
    activities: [
      {
        id: "ACT-1004-1",
        at: "2026-11-02T15:05:00+05:30",
        label: "Enquiry received",
      },
    ],
  },
  {
    id: "LEAD-1005",
    name: "Demo — Nisha K.",
    phone: "+91 90000 10005",
    email: "demo.nisha@example.com",
    message:
      "Demo enquiry: completed the rental discussion for the 2BHK on Madipakkam main road.",
    propertyId: "MAD-0002",
    status: "converted",
    source: "property-enquiry",
    createdAt: "2026-10-28T11:30:00+05:30",
    isDemo: true,
    notes: ["Sample note: marked converted for the interface preview."],
    activities: [
      {
        id: "ACT-1005-1",
        at: "2026-10-28T11:30:00+05:30",
        label: "Enquiry received",
      },
      {
        id: "ACT-1005-2",
        at: "2026-11-01T16:45:00+05:30",
        label: "Marked converted",
      },
    ],
  },
  {
    id: "LEAD-1006",
    name: "Demo — Suresh M.",
    phone: "+91 90000 10006",
    email: null,
    message:
      "Demo enquiry: asked about the residential plot, then decided to postpone the purchase.",
    propertyId: "MAD-0006",
    status: "closed-lost",
    source: "website-form",
    createdAt: "2026-10-24T08:50:00+05:30",
    isDemo: true,
    notes: [],
    activities: [
      {
        id: "ACT-1006-1",
        at: "2026-10-24T08:50:00+05:30",
        label: "Enquiry received",
      },
      {
        id: "ACT-1006-2",
        at: "2026-10-30T14:00:00+05:30",
        label: "Marked closed / lost",
      },
    ],
  },
  {
    id: "LEAD-1007",
    name: "Demo — Vikram J.",
    phone: "+91 90000 10007",
    email: "demo.vikram@example.com",
    message:
      "Demo enquiry: general question about renting in Madipakkam, with no specific property selected.",
    propertyId: null,
    status: "new",
    source: "website-form",
    createdAt: "2026-11-07T08:10:00+05:30",
    isDemo: true,
    notes: [],
    activities: [
      {
        id: "ACT-1007-1",
        at: "2026-11-07T08:10:00+05:30",
        label: "Enquiry received",
        detail: "Seeded demo enquiry from the contact page.",
      },
    ],
  },
];
