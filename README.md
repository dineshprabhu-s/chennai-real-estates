# Chennai Real Estates

A production-ready foundation for a single-broker real estate platform focused on **Madipakkam, Chennai**. The public property website and a complete admin development preview are implemented against typed demo data, alongside a typed domain model and a full route structure.

> **Development preview.** Supabase client foundations are in place, but database queries, authentication, property persistence, image uploads, real lead storage, and notifications are intentionally not implemented yet. Admin workflows validate and update browser state only; nothing is written to a database. All listings, areas, enquiries, and contact details are sample content for interface development and must be replaced or verified before launch.

---

## Overview

Chennai Real Estates is designed around one broker rather than a crowded marketplace:

- **Public website** — browse properties, explore area guides, and contact the broker.
- **Admin preview** — dashboard, property management, add/edit form, enquiry inbox, and area management for one broker, with every write clearly marked as demo-only.
- **Modular domain layer** — property, area, and lead logic kept separate from presentation.
- **Reusable UI foundation** — shadcn/ui-compatible primitives, responsive navigation, loading and error states.

The visual identity uses a warm white canvas, charcoal text, deep forest green accents, neutral grey surfaces, and a restrained serif/sans typography pairing.

---

## Technology stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI runtime | React 19 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| Component architecture | shadcn/ui-compatible primitives, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Icons | Lucide React |
| Linting | ESLint 9 with `eslint-config-next` |
| Package manager | npm |

Exact versions are pinned in `package.json` and `package-lock.json`.

---

## Requirements

- Node.js **20.9 or later** (Node 24 was used during setup)
- npm **10 or later**

---

## Installation

```bash
npm install
```

Environment variables are optional for this stage. To configure local values:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local
```

`NEXT_PUBLIC_SITE_URL` falls back to `http://localhost:3000` when unset. `NEXT_PUBLIC_WHATSAPP_NUMBER` is optional; without it the public site shows contact and enquiry fallbacks instead of WhatsApp links. No credentials are required to run the foundation build.

### Supabase configuration (Phase 1)

Supabase client factories live in `src/lib/supabase/`, but no database queries, authentication, or persistence use them yet. To connect a local environment:

1. Copy `.env.example` to `.env.local` as shown above.
2. In the Supabase dashboard, open **Project Settings → API** and copy the project URL and publishable key.
3. Add both values to `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

4. Restart the dev server. `NEXT_PUBLIC_*` values are inlined at build time, so a rebuild is required after changing them in a deployed build.

The app reads only these two Supabase variables. They are validated lazily, the first time a Supabase client is created, so the project still builds and runs without them. The publishable key is browser-safe but is not an authorization mechanism: Row Level Security must enforce access once database queries are added. Never place a secret or service-role key in a `NEXT_PUBLIC_*` variable.

---

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server at `http://localhost:3000` |
| `npm run build` | Create an optimised production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint across the project |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |

Start local development with:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

## Routes

### Public website

| Route | Description |
| --- | --- |
| `/` | Homepage with hero search, featured listings, popular localities, how-it-works, and contact call-to-action |
| `/properties` | Property catalogue with working keyword, transaction, locality, category, configuration, bedroom, price, and facing filters |
| `/properties/[slug]` | Property detail page with gallery placeholders, full specifications, approval warnings, WhatsApp/contact actions, enquiry form, and same-locality listings |
| `/areas` | Searchable area directory with live property counts |
| `/areas/[slug]` | Area guide with property listings and sale/rent/lease chips |
| `/contact` | Contact methods, conditional WhatsApp, and a client-validated demo enquiry form |

### Admin dashboard

| Route | Description |
| --- | --- |
| `/admin` | Redirects to the dashboard |
| `/admin/login` | Broker sign-in screen (not functional yet) |
| `/admin/dashboard` | Broker overview with computed catalogue/enquiry stats, recent properties, recent demo enquiries, and quick actions |
| `/admin/properties` | Searchable, filterable property management with desktop table, mobile cards, view dialog, edit links, and demo publish/unpublish/status controls |
| `/admin/properties/new` | Full add-property form with validation, conditional pricing, verification safeguards, brokerage, and preview-only images |
| `/admin/properties/[id]/edit` | The same form prefilled from a demo listing; unknown IDs show the not-found state |
| `/admin/leads` | Demo enquiry inbox with counts, search, filters, a detail drawer, demo status changes, internal notes, and activity history |
| `/admin/areas` | Area management with property counts, active state, search, and add/edit dialogs |

All admin pages render the persistent notice: **“Development preview — authentication and database persistence are not enabled.”** No admin route is protected, and the demo Logout action does not end a real session.

---

## Demo property catalogue

The public site reads from `src/modules/properties/data/demo-properties.ts`. Nine sample listings are available, with permanent IDs `MAD-0001` through `MAD-0009`:

| ID | Locality | Transaction | Notes |
| --- | --- | --- | --- |
| `MAD-0001` | Madipakkam | Sale | Featured 3BHK apartment |
| `MAD-0002` | Madipakkam | Rent | 2BHK rental |
| `MAD-0003` | Keelkattalai | Sale | Independent house |
| `MAD-0004` | Pallikaranai | Sale | 2BHK apartment |
| `MAD-0005` | Velachery | Rent | 3BHK rental |
| `MAD-0006` | Madipakkam | Sale | Residential plot |
| `MAD-0007` | Madipakkam | Lease | 2BHK near Ponniamman Kovil, negotiable |
| `MAD-0008` | Madipakkam | Lease | 1RK near Ponniamman Kovil |
| `MAD-0009` | Guperan Nagar, Madipakkam | Sale | 2BHK resale, marked **unapproved** |

`MAD-0007`, `MAD-0008`, and `MAD-0009` are sample/unverified entries. Their original WhatsApp references (`31-10-26-35`, `31-10-26-36`, `04-11-26-11`) are kept in `whatsappReference` and are never used as the permanent ID. Unapproved status is shown prominently on cards and detail pages.

Property media uses labelled SVG illustrations, not photographs. Replace them with broker-supplied images when the media pipeline exists.

---

## Admin development preview

The admin workspace is a complete interface preview backed by the same typed demo data as the public site. It is intentionally not connected to a database or authentication provider.

### Demo workflows

- **Dashboard** — property and enquiry statistics are calculated from the demo queries (`getPropertyStats`, `getLeadStats`), alongside the five most recently updated listings, the five newest enquiries, and quick-action shortcuts.
- **Property management** — keyword search (ID, title, locality), transaction/locality/type/status filters, clear filters, a desktop table and mobile cards, a read-only view dialog, and links into the edit form.
- **Property form** — shared by add and edit. Sections cover basic information, specifications, conditional pricing, legal/verification, brokerage, preview-only images, and listing actions. Validation focuses the first invalid field. An approved listing cannot remain sample/unverified, and a broker-confirmed listing requires a last-verified date.
- **Demo status and publish actions** — status changes and publish/unpublish update React state for the current browser session only. They never alter the public catalogue or `demo-properties.ts`.
- **Leads inbox** — six-stage pipeline (new, contacted, visit scheduled, negotiation, converted, closed/lost), counts, search, status/source/property filters, and a detail drawer with contact details, the original message, internal notes, and activity history. Every seeded record is labelled **Demo** and uses placeholder contact details.
- **Areas** — all four demo localities with mapped listing counts, optional parent city, active state, search, and an add/edit dialog with validation. New areas show zero listings and do not appear publicly.

### Enquiry demo data

`src/modules/leads/data/demo-leads.ts` contains seven clearly labelled sample enquiries (`LEAD-1001`–`LEAD-1007`). They exist only to exercise the inbox interface. Names, phone numbers, e-mail addresses, and messages are placeholders, and no record is read by public pages. Status changes and notes are local to the open browser session.

### What is not persisted

- Property create, edit, publish, unpublish, and status changes.
- Lead status changes, internal notes, and activity additions.
- Area creation, editing, and active/inactive state changes.
- Selected property images (browser object URLs only; no upload).
- Any dashboard statistic affected by those changes; the server-rendered figures return to the seed values on reload.

---

## WhatsApp enquiries

WhatsApp links are built in `src/lib/whatsapp.ts` from `NEXT_PUBLIC_WHATSAPP_NUMBER`:

- Set the variable to the full international number without spaces or punctuation, for example `919876543210`.
- Links use `https://wa.me/<number>?text=<encoded message>` and prefill the property ID, title, locality, and visit request.
- When the variable is unset or invalid, no `wa.me` link is rendered. Buttons fall back to the contact page or the on-page enquiry form instead.
- No phone number is hardcoded in the source.

---


## Project structure

```text
chennai-real-estates/
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ layout.tsx                 # Public header, footer, skip link
│  │  │  ├─ page.tsx                   # Homepage
│  │  │  ├─ loading.tsx
│  │  │  ├─ areas/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [slug]/page.tsx
│  │  │  ├─ properties/
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [slug]/page.tsx
│  │  │  └─ contact/page.tsx
│  │  ├─ admin/
│  │  │  ├─ (dashboard)/
│  │  │  │  ├─ layout.tsx              # Sidebar, top bar, admin shell
│  │  │  │  ├─ loading.tsx
│  │  │  │  ├─ error.tsx
│  │  │  │  ├─ dashboard/page.tsx
│  │  │  │  ├─ properties/page.tsx
│  │  │  │  ├─ properties/admin-properties-client.tsx
│  │  │  │  ├─ properties/new/page.tsx
│  │  │  │  ├─ properties/[id]/edit/page.tsx
│  │  │  │  ├─ leads/page.tsx
│  │  │  │  ├─ leads/admin-leads-client.tsx
│  │  │  │  ├─ areas/page.tsx
│  │  │  │  └─ areas/admin-areas-client.tsx
│  │  │  ├─ login/page.tsx
│  │  │  └─ page.tsx                   # /admin redirect
│  │  ├─ error.tsx
│  │  ├─ loading.tsx
│  │  ├─ not-found.tsx
│  │  ├─ globals.css                   # Tailwind import and design tokens
│  │  ├─ icon.svg
│  │  └─ layout.tsx                    # Fonts, metadata, viewport
│  ├─ components/
│  │  ├─ admin/                        # Admin shell, headers, tables, badges, dialogs
│  │  ├─ areas/                        # Area cards
│  │  ├─ common/                       # Container, headers, empty/error/loading states
│  │  ├─ forms/                        # Contact, login, property, area, and image preview forms
│  │  ├─ layout/                       # Public and admin navigation shells
│  │  ├─ property/                     # Property cards, grids, status badges
│  │  └─ ui/                           # shadcn/ui-compatible primitives
│  ├─ config/                          # Brand, site, and navigation configuration
│  ├─ hooks/                           # Client-side hooks
│  ├─ lib/                             # Formatting and shared utilities
│  ├─ modules/
│  │  ├─ areas/                        # Area data and queries
│  │  ├─ leads/                        # Lead labels, demo enquiries, and queries
│  │  └─ properties/                   # Property data, labels, and queries
│  └─ types/                           # Domain types (property, area, lead)
├─ .env.example
├─ components.json                     # shadcn/ui configuration
├─ eslint.config.mjs
├─ next.config.ts
├─ package.json
└─ tsconfig.json
```

### Architecture notes

- **Route groups** separate the public site (`(public)`) from the admin dashboard (`(dashboard)`), so each area can own its layout without leaking chrome into the other.
- **Server components are the default.** Client components are limited to interactive pieces: active navigation state, mobile menus, scroll locking, and form previews.
- **Business logic lives in `src/modules`.** Pages compose data queries and presentation; data sources can later be swapped to Supabase without rewriting UI components.
- **UI primitives live in `src/components/ui`.** They follow shadcn/ui conventions (`cn`, `cva`, `data-slot`, CSS variables) and can be extended with the shadcn CLI.
- **Sample data is isolated.** `demo-properties.ts`, `demo-areas.ts`, and `demo-leads.ts` are clearly marked and safe to replace. Admin mutations stay in component state.
- **Admin UI is modular.** Shell, headers, tables, badges, dialogs, the property form, the area form, and the image preview selector live in reusable components rather than one large page.
- **Strict TypeScript** (`strict`, `noUncheckedIndexedAccess`) and an ESLint rule banning explicit `any`.

---

## Design system

Design tokens are declared in `src/app/globals.css` and mapped to Tailwind utilities through `@theme inline`.

| Token | Value |
| --- | --- |
| Background | Warm white `#fcfcfa` |
| Foreground | Charcoal `#1b2420` |
| Primary | Deep forest green `#1e4d3a` |
| Secondary / muted | Neutral greys and soft green-grey surfaces |
| Border | `#e2e6df` |
| Radius | `0.625rem` |

Typography:

- **Inter** for UI and body copy.
- **Instrument Serif** for marketing display headings.
- Font variables are supplied by `next/font` and exposed as `font-sans` / `font-display`.

---

## Environment variables

| Variable | Scope | Status |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | Used for metadata and canonical site URL |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Public | Optional WhatsApp business number in international format; fallbacks render when unset |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL; validated when a client is created |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Browser-safe Supabase key; validated when a client is created |
| `ADMIN_SESSION_SECRET` | Server only | Planned — not implemented |

`NEXT_PUBLIC_WHATSAPP_NUMBER` is embedded at build time, so rebuild after changing it in a production deployment. Only placeholder names are provided in `.env.example`. Do not commit real secrets.

---

## Planned application modules

1. **Authentication** — broker-only sign-in, protected admin routes, session handling.
2. **Supabase data layer** — schema for properties, areas, leads, and media; typed repositories.
3. **Property workflow** — connect the existing admin form to persistent create/edit/publish operations, image uploads, and audit history.
4. **Lead capture** — replace the demo enquiry inbox with real submissions, property references, status tracking, and notifications.
5. **Area management** — persist areas, assign listings, and generate area-level SEO content.
6. **Media and verification** — broker-supplied photography, document review, verified-listing workflow.
7. **Public experience extras** — saved shortlists, share links, structured data, live availability.
8. **Operations** — audit trail, backups, analytics, and deployment configuration.

---

## Current limitations

- No authentication or route protection. `/admin/login` and Logout are placeholders, and the admin shell states this on every page.
- No database, API routes, server actions, or persistence. Admin changes are held in browser state and reset on reload.
- No image uploads or storage integration. The property form previews selected files with object URLs only.
- Property create/edit/publish/status changes are simulated; the public catalogue always reads the original nine demo records.
- Leads and areas are demo data. Seeded enquiries are labelled, and internal notes/status changes are never stored or shown publicly.
- Listings, areas, and contact details are sample data and placeholder content. The three supplied Madipakkam entries remain unverified until the broker confirms them.
- WhatsApp is unavailable until `NEXT_PUBLIC_WHATSAPP_NUMBER` is configured with a real business number.
- Property images are illustrative SVG placeholders, not photographs of the listed properties.
- Search and filtering run in memory against the demo data and will move to the data layer with Supabase.

---

## Validation

Run the following before merging changes:

```bash
npm run lint
npm run typecheck
npm run build
```

The build is considered healthy only when all three commands pass without errors. For the admin preview, also review `/admin/dashboard`, `/admin/properties`, `/admin/properties/new`, an edit route such as `/admin/properties/MAD-0001/edit`, `/admin/leads`, and `/admin/areas` at mobile and desktop widths, and confirm the public routes still behave as before.
