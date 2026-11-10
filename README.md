# Chennai Real Estates

A single-broker property catalogue for Madipakkam and nearby Chennai localities. Visitors can browse sale, rent and lease listings, explore areas and send enquiries. An authorized broker can manage property listings and follow up on enquiries.

## Documentation

- [Technical overview and engineering onboarding](docs/TECHNICAL_OVERVIEW.md) — architecture, schema, security, development and operations.
- [Website user guide](docs/USER_GUIDE.md) — instructions for property seekers and brokers.

The application source and checked-in migrations are the source of truth. The guides should be reviewed when implementation or deployment configuration changes.

## Current functionality

- Public pages read available and under-offer properties and active areas through a session-independent anonymous Supabase client. Catalogue filters cover locality, transaction, category, configuration, bedrooms, price, facing and keywords.
- Property details include public listing information, related properties and an enquiry form. General enquiries are available from the contact page; a property enquiry carries an explicit property ID.
- Enquiries go through a validated Server Action and the `submit_public_lead` database function, which creates a lead, initial activity and persistent broker notification together. Anonymous users do not receive direct lead-table access.
- Broker login and admin pages use Supabase Auth, verified broker claims and row-level security. Broker property create, edit and availability updates, and lead status updates and notes, are connected to Supabase.
- The admin dashboard shows database property counts and recent listings. Brokers can add, edit and activate or deactivate areas. Demo enquiries remain labeled and read-only through the application.

## Current limitations

- Property illustrations and selected image previews are not uploaded property photographs. Storage and image uploads are not implemented.
- Seeded sample properties are ordinary database records with no demo marker and are included in property counts. Public catalogue filtering has no application pagination; the broker inbox displays a bounded recent window. Backend response limits can affect large catalogues.
- Contact details in the site configuration are placeholders. WhatsApp links appear only when configured.
- The enquiry honeypot and one-minute duplicate guard are not comprehensive abuse protection. The anonymous enquiry function is directly callable; production abuse controls still need a design and verification.
- JavaScript-disabled enquiry behavior, deployment settings, monitoring, backups, privacy and retention procedures require verification. A streamed missing-detail page may show the not-found UI with HTTP 200.
- In-app notifications are shared between broker accounts; email, WhatsApp, SMS and push alerts are not implemented. No appointment booking is implemented. Confirm property details, prices and availability with the broker.

## Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase Auth and PostgreSQL. The project uses locally maintained UI primitives, Lucide icons and focused Node-based test harnesses. Exact dependency versions are in `package.json` and `package-lock.json`.

## Local setup

Install Git, npm and Node.js 22 or a later compatible version. This requirement accounts for the locked Supabase dependencies as well as Next.js.

```powershell
npm ci
Copy-Item .env.example .env.local
# Set the variables listed below using your own nonproduction configuration.
npm run dev
```

Open `http://localhost:3000`. Use a dedicated local or staging Supabase project with the required migrations and an authorized broker account. Do not use production data for development tests.

| Environment variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL; required when a client is created. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable project key; required when a client is created. RLS enforces access. |
| `NEXT_PUBLIC_SITE_URL` | Site URL for metadata; defaults to the local URL. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional number for WhatsApp links. |

The Supabase settings are validated lazily by `src/lib/env.ts`. Restart the dev server after changing them; public environment values may be embedded at build time. Never put secret or service-role credentials in a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Routes

| Public | Broker / admin |
| --- | --- |
| `/` — home | `/admin/login` — broker sign-in |
| `/properties` and `/properties/[slug]` | `/admin/dashboard` — overview |
| `/areas` and `/areas/[slug]` | `/admin/properties` — property management |
| `/contact` — general or property-context enquiry | `/admin/properties/new` and `/admin/properties/[id]/edit` |
| | `/admin/leads` — enquiry inbox |
| | `/admin/areas` — area management |

`/admin` redirects to the dashboard. Admin pages and actions enforce broker authorization in addition to the route proxy.

## Development and checks

```powershell
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

`npm run start` serves an existing production build. Focused tests are run directly with Node; for example:

```powershell
node tests/broker-dashboard-areas.test.cjs
node tests/broker-notifications.test.cjs
node tests/public-lead-action.test.cjs
node tests/public-lead-rpc.test.cjs
node tests/contact-prehydration.test.cjs
node tests/lead-read.test.cjs
node tests/lead-actions.test.cjs
node tests/property-actions.test.cjs
node tests/property-form-adapter.test.cjs
node tests/property-brokerage.test.cjs
node tests/property-list-refresh.test.cjs
node tests/property-pages.test.cjs
```

These harnesses include mocks and static checks; they do not replace browser or database integration testing. `tests/sql/public-lead-rpc.sql` is a separate psql verification script for a disposable local or staging database. Review it and the target before running it; do not run test writes against production.

## Database and security

The checked-in migrations, including the broker notification migration, are in `supabase/migrations/`; apply and verify them in a nonproduction environment before relying on notifications. `supabase/seed.sql` contains sample data. Do not rewrite an already-applied migration. Confirm the target and migration history before applying a reviewed forward migration, and verify grants and policies in a disposable environment.

Anonymous property reads exclude the private `description`, `address` and `whatsapp_reference` columns. Broker operations use a request-bound client and server-side role checks. Public enquiries use a separate cookie-free anonymous client and a narrow database function. See the [technical overview](docs/TECHNICAL_OVERVIEW.md) for the full access model, migration notes and known operational gaps.

No production deployment, hosting configuration, backup schedule or monitoring integration is established by this README; verify the actual environment with the project owner before release.
