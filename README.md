# Chennai Real Estates

A production-ready foundation for a single-broker real estate platform focused on **Madipakkam, Chennai**. The project currently delivers the public website and admin dashboard shells, a typed domain model, and a complete route structure.

> **Foundation build only.** Authentication, Supabase, property persistence, and the lead workflow are intentionally not implemented yet. All listings, areas, and contact details are sample content for interface development and must be replaced before launch.

---

## Overview

Chennai Real Estates is designed around one broker rather than a crowded marketplace:

- **Public website** — browse properties, explore area guides, and contact the broker.
- **Admin dashboard** — manage properties, enquiries, and area coverage (UI shell in this stage).
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

`NEXT_PUBLIC_SITE_URL` falls back to `http://localhost:3000` when unset. No credentials are required to run the foundation build.

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
| `/` | Homepage with hero, featured listings, area coverage, and contact call-to-action |
| `/properties` | Property listing page |
| `/properties/[slug]` | Property detail page |
| `/areas` | Area directory |
| `/areas/[slug]` | Area-specific property listings and guide |
| `/contact` | Contact details and enquiry form preview |

### Admin dashboard

| Route | Description |
| --- | --- |
| `/admin` | Redirects to the dashboard |
| `/admin/login` | Broker sign-in screen (not functional yet) |
| `/admin/dashboard` | Dashboard overview |
| `/admin/properties` | Property management table |
| `/admin/properties/new` | Add-property form preview |
| `/admin/properties/[id]/edit` | Edit-property form preview |
| `/admin/leads` | Customer enquiry inbox placeholder |
| `/admin/areas` | Area management |

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
│  │  │  │  ├─ properties/new/page.tsx
│  │  │  │  ├─ properties/[id]/edit/page.tsx
│  │  │  │  ├─ leads/page.tsx
│  │  │  │  └─ areas/page.tsx
│  │  │  ├─ login/page.tsx
│  │  │  └─ page.tsx                   # /admin redirect
│  │  ├─ error.tsx
│  │  ├─ loading.tsx
│  │  ├─ not-found.tsx
│  │  ├─ globals.css                   # Tailwind import and design tokens
│  │  ├─ icon.svg
│  │  └─ layout.tsx                    # Fonts, metadata, viewport
│  ├─ components/
│  │  ├─ admin/                        # Admin-specific presentation
│  │  ├─ areas/                        # Area cards
│  │  ├─ common/                       # Container, headers, empty/error/loading states
│  │  ├─ forms/                        # Contact, login, property form previews
│  │  ├─ layout/                       # Public and admin navigation shells
│  │  ├─ property/                     # Property cards, grids, status badges
│  │  └─ ui/                           # shadcn/ui-compatible primitives
│  ├─ config/                          # Brand, site, and navigation configuration
│  ├─ hooks/                           # Client-side hooks
│  ├─ lib/                             # Formatting and shared utilities
│  ├─ modules/
│  │  ├─ areas/                        # Area data and queries
│  │  ├─ leads/                        # Lead labels and queries
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
- **Sample data is isolated.** `demo-properties.ts`, `demo-areas.ts`, and the empty lead store are clearly marked and safe to replace.
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
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Planned — not implemented |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Planned — not implemented |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Planned — never expose to the client |
| `ADMIN_SESSION_SECRET` | Server only | Planned — not implemented |

Only placeholder names are provided in `.env.example`. Do not commit real secrets.

---

## Planned application modules

1. **Authentication** — broker-only sign-in, protected admin routes, session handling.
2. **Supabase data layer** — schema for properties, areas, leads, and media; typed repositories.
3. **Property workflow** — create, edit, publish/unpublish, archive, image uploads, validation.
4. **Lead capture** — functional enquiry form, property references, status tracking, notifications.
5. **Area management** — create/edit areas, assign listings, area-level SEO content.
6. **Search and filters** — budget, property type, bedrooms, listing type, and locality.
7. **Public experience** — real photography, shortlists, share links, structured data.
8. **Operations** — audit trail, backups, analytics, and deployment configuration.

---

## Current limitations

- No authentication or route protection.
- No database, API routes, server actions, or persistence.
- No image uploads or storage integration.
- No functional property create/edit/delete workflow.
- No lead submission or inbox.
- Listings, areas, and contact details are sample data and placeholder content.

---

## Validation

Run the following before merging changes:

```bash
npm run lint
npm run typecheck
npm run build
```

The foundation build is considered healthy only when all three commands pass without errors.
