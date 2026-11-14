# Chennai Real Estates: technical overview

**Purpose:** engineering onboarding and maintenance reference. **Repository review:** 2026-11-12, on `main` at committed checkpoint `08bd243` plus uncommitted brokerage accounting changes. This review does not verify staging or production state.

This documents checked-in source and SQL, not the state of a deployed database. Source code and migrations are authoritative; update this guide when architecture, schema, authorization, security, or major workflows change. The discarded phone-rate-limit experiment is not implemented.

## 1. Project introduction

This is a single-broker property platform centered on Madipakkam and nearby Chennai areas. Visitors browse listings and locality guides, then contact the broker. The intended journey is visitor → catalogue → detail → enquiry → broker inbox → customer contact → site visit → follow-up. The application records enquiries and status; scheduling, verification, and transactions still require people. A forward migration adds a database-only closed-deals and brokerage-collection ledger; no deal or payment interface is implemented.

A **listing** advertises a property; **resale** means an existing property being sold, rather than a separate database transaction type. **Lease** is one of sale/rent/lease; exact financial terms require broker confirmation. **Brokerage** is the broker's fee, represented as independent free text and optional structured terms. A **customer** is one person or contact number identified by normalized phone; a **lead** or **enquiry** is one potential request attached to that customer and may carry its own property, message and status. A **site visit** is an offline event. Availability status, legal approval, and broker verification are separate concepts (§6).

Public catalogue and enquiries, broker authentication, dashboard, customer directory, property management, area management, and lead management use Supabase. Image uploads, external messaging, comprehensive bot protection, and verified production operations are not established here. Persistent in-app broker notifications and the customer-centric schema are defined by forward migrations.

## 2. Technology stack

Versions are from `package.json`; `^` represents a supported range, with exact resolution in the lockfile.

| Technology | Version | Purpose / location |
|---|---|---|
| Next.js | 16.4.5 | App Router, server components/actions and proxy; `src/app`, `src/proxy.ts` |
| React / React DOM | 19.3.0 | UI rendering and client interaction |
| TypeScript | ^5 | Strict types, domain models, server/client contracts |
| Tailwind CSS | ^4 | Utilities and theme tokens; `src/app/globals.css` |
| Radix Slot / CVA / clsx / tailwind-merge | ^1.5.0 / ^0.7.1 / ^2.1.1 / ^3.7.0 | Local shadcn-compatible primitives in `src/components/ui` |
| Lucide React | ^1.69.0 | Icons |
| Supabase JS / SSR | ^2.119.0 / ^0.12.7 | Data, Auth and session clients |
| PostgreSQL / Supabase Auth | Not pinned | Schema, RLS, RPC and password authentication |
| ESLint | ^9 | Next and TypeScript checks |
| Node assert / VM / TypeScript | Node built-ins and installed TypeScript | Focused test harnesses in `tests/` |

There is no Zod, Supabase Storage integration, established browser E2E framework, or checked-in Vercel configuration. Next serves the frontend and server logic; Supabase provides database/Auth. WhatsApp links, if configured, navigate to an external service.

## 3. High-level system architecture

```mermaid
flowchart LR
  Visitor[Public browser] --> Public[Next public pages]
  Broker[Broker browser] --> Admin[Next admin pages]
  Visitor --> Form[ContactForm]
  Form --> LeadAction[submitPublicLead action]
  Public --> Anon[Cookie-free anonymous client]
  LeadAction --> Anon
  Admin --> BrokerAction[Guarded broker actions]
  Admin --> Session[Request-cookie Supabase client]
  BrokerAction --> Session
  Session --> Auth[Supabase Auth]
  Session --> DB[(PostgreSQL with RLS)]
  Anon --> DB
  Anon --> RPC[submit_public_lead RPC]
  RPC --> DB
```

The public client is server-only and independent of visitor cookies. Broker reads/actions use the request-bound client plus `requireBroker()` and database RLS. The public form validates in the browser and Server Action; the anonymous RPC validates again and atomically resolves or creates the customer and creates a lead, initial activity and broker notification once the notification migration is applied. Client components manage interactions and receive only data intentionally passed to them; the authorized broker form receives private fields it needs.

## 4. Repository and folder structure

```text
src/
  app/(public)/             public pages, layouts and contact action
  app/admin/(dashboard)/    guarded admin pages, property, lead and customer actions
  app/admin/login/          password login
  components/               admin, areas, common, forms, layout, property, ui
  config/                   branding and navigation
  hooks/                    hydration and scroll helpers
  lib/auth/                 broker authorization and redirect validation
  lib/supabase/             clients, projections, queries, mappers, validation
  lib/validation/           shared public lead and customer validation
  modules/                  labels, filters, demo data and presentation helpers
  types/                    domain types
  proxy.ts                  admin route gate and session refresh
supabase/migrations/        ordered schema and RPC migrations
supabase/seed.sql           sample records
tests/                      Node harnesses and SQL verification
public/                     static assets, if present
```

Public routes depend on anonymous queries and shared presentation; broker routes depend on guarded broker queries/actions. Add data-access logic in `src/lib/supabase` and a forward migration, not in demo arrays. There are no checked-in `route.ts` API handlers. Route groups affect layout, not URL paths.

## 5. Application routing and page architecture

| Route | Purpose / access | Components / data source |
|---|---|---|
| `/` | Public homepage | Featured properties, active areas and public counts from anonymous queries |
| `/properties` | Public catalogue | `PropertyFiltersForm`, `PropertyGrid`; public properties and areas |
| `/properties/[slug]` | Public property detail | `PropertyGallery`, `ContactForm`, related listings; public queries |
| `/areas` | Public area directory | Area cards, search, public counts |
| `/areas/[slug]` | Public area guide | Active area, public properties, listing-type filter |
| `/contact` | Public enquiry | `ContactForm`, optional explicit property context |
| `/admin` | Admin redirect | Redirects to dashboard, subject to proxy |
| `/admin/login` | Public login | `LoginForm`, `loginAction`, Supabase Auth |
| `/admin/dashboard` | Broker overview | Supabase property and lead stats and recent records |
| `/admin/properties` | Broker listing | `AdminPropertiesClient`, broker property/area reads |
| `/admin/properties/new` | Broker create | `PropertyForm`, broker areas, create action |
| `/admin/properties/[id]/edit` | Broker edit | Broker reads, `PropertyForm`, update action |
| `/admin/leads` | Broker inbox | `AdminLeadsClient`, lead/property option reads, guarded actions |
| `/admin/customers` | Broker customer directory | `AdminCustomersClient`, customer summary reads, guarded paging/search action |
| `/admin/customers/[id]` | Broker customer details | Customer summary, complete linked enquiry history, guarded edit form |
| `/admin/areas` | Broker area management | `AdminAreasClient`, guarded area reads and actions |

Pages are Server Components by default; forms, controls, dialogs and responsive menus use Client Components. Public and admin layouts provide separate shells; root/group `loading.tsx`, `error.tsx`, and root `not-found.tsx` provide boundaries. Public detail pages resolve slugs via anonymous queries and call `notFound()` for missing or unavailable records; database errors throw. Metadata uses public title/summary. A loading boundary can stream before `notFound()`, so the not-found UI can be returned with HTTP 200; verify actual HTTP behavior before relying on it for SEO. The dashboard layout obtains identity for its shell; it is not an independent authorization boundary. Protected pages, broker DAL functions and actions apply broker guards in addition to the proxy.

## 6. Core business domain and data model

Source of truth: the checked-in migrations under `supabase/migrations/`, principally `20261107000000_initial_schema.sql`, `20261112000000_customer_centric_enquiries.sql` and `20261112000001_brokerage_accounting.sql`. `N` means nullable; other columns are `NOT NULL`. Defaults and constraints below are SQL-level. Database fields are snake_case; mappers produce camelCase domain objects.

```mermaid
erDiagram
  AREAS ||--o{ PROPERTIES : area_slug
  PROPERTIES o|--o{ LEADS : property_id
  CUSTOMERS o|--o{ LEADS : customer_id
  CUSTOMERS ||--o{ DEALS : customer_id
  PROPERTIES ||--o{ DEALS : property_id
  LEADS ||--o| DEALS : lead_id
  DEALS ||--o{ BROKERAGE_PAYMENTS : deal_id
  LEADS ||--o{ LEAD_NOTES : lead_id
  LEADS ||--o{ LEAD_ACTIVITIES : lead_id
  LEADS o|--o| BROKER_NOTIFICATIONS : lead_id
```

### Areas

| Column | Type / default | Constraint or meaning |
|---|---|---|
| `slug` | text | PK; lowercase hyphenated slug |
| `name` | text | Trimmed length ≥3 |
| `pincode` | text | Six digits |
| `summary` | text | Trimmed length ≥10 |
| `description` | text | Trimmed length ≥20 |
| `highlights` | text[] default `{}` | Guide highlights |
| `parent_area` | text, N | Display text, not an FK |
| `is_active` | boolean default true | Controls anonymous area visibility |
| `created_at`, `updated_at` | timestamptz default `now()` | Update trigger on `updated_at` |

### Properties

| Column | Type / default | Constraint or meaning |
|---|---|---|
| `id` | text, sequence-generated | PK; `MAD-` business ID, nonblank |
| `slug` | text | Unique, lowercase hyphenated |
| `title`, `summary` | text | Trimmed lengths ≥5 / ≥10 |
| `description`, `public_description` | text[] | Separate private/public descriptions; private array cardinality ≥1 |
| `type` | property_type | Required category |
| `configuration` | property_configuration, N | Bedroom configuration |
| `listing_type` | listing_type | Transaction type |
| `status` | property_status default `draft` | Availability, independent of approval |
| `price` | numeric(14,2) | Positive |
| `price_negotiable` | boolean default false | Negotiability |
| `bedrooms`, `bathrooms` | smallint, N | Nonnegative |
| `built_up_area_sqft` | numeric(10,2), N | Positive when present |
| `carpet_area_sqft`, `uds_sqft` | numeric(10,2), N | Nonnegative; UDS is undivided share |
| `floor`, `parking` | text, N | Free text |
| `facing` | facing, N | Enum |
| `building_age_years`, `total_floors` | smallint, N | Nonnegative |
| `has_lift` | boolean, N | True, false or unknown |
| `furnishing` | furnishing_status, N | Enum |
| `approval_status` | approval_status, N | Sample verification cannot be approved |
| `brokerage` | text, N | Independent free-form fee |
| `brokerage_type`, `brokerage_value` | brokerage_type, N; numeric(14,2), N | Nonnegative value; required for fixed/percentage and null for `none` |
| `availability_note`, `landmark`, `address` | text, N | Address is private |
| `security_deposit` | numeric(14,2), N | Nonnegative |
| `last_verified_at` | date, N | Required for broker-confirmed verification |
| `area_slug` | text | FK `areas.slug`; update cascade, delete restrict |
| `locality` | text | Separate locality text |
| `features` | text[] default `{}` | Features |
| `is_featured` | boolean default false | Homepage selection |
| `verification_status` | verification_status default `sample` | Verification distinct from approval |
| `whatsapp_reference` | text, N | Private reference, never the permanent ID |
| `listed_at` | date | Required listing date |
| `updated_at` | date default current_date | Date trigger, not a timestamp |

### Customers

Source: `supabase/migrations/20261112000000_customer_centric_enquiries.sql`.

| Column | Type / default | Constraint or meaning |
|---|---|---|
| `id` | text, sequence-generated | PK; `CUST-` business ID, nonblank |
| `name` | text | Nonblank; broker-facing current name |
| `phone` | text | Nonblank; broker-facing phone value. New public enquiries store the canonical digits, while a broker edit keeps the entered display value |
| `normalized_phone` | text, generated stored | `public.normalize_customer_phone(phone)`; required 10–15 digits; unique |
| `email` | text, N | Optional current email |
| `created_at`, `updated_at` | timestamptz default `now()` | Update trigger on `updated_at` |

Customer identity is the normalized phone only; names and emails are not matching keys. `normalize_customer_phone(text)` strips formatting, canonicalizes an Indian mobile with optional `+91`/`91` or a single leading `0`, and retains other 10–15 digit values unchanged rather than guessing. The generated column and unique constraint make concurrent customer creation safe. The function is `immutable`, `strict`, has an empty search path, and is executable by `authenticated` so broker updates recalculate the generated value; anonymous callers use it indirectly through the definer RPC.

### Leads, notes and activities

| Column | Type / default | Constraint or meaning |
|---|---|---|
| `leads.id` | text, sequence-generated | PK; `LEAD-` business ID, nonblank |
| `leads.name`, `phone`, `message` | text | Nonblank name/message; the table constraint checks that phone contains 10–15 digits after removing nondigits; it does not normalize the stored value |
| `leads.email` | text, N | Optional |
| `leads.property_id` | text, N | FK properties; update cascade, delete restrict |
| `leads.customer_id` | text, N | FK customers; update cascade, delete restrict; nullable for safety, backfilled from normalized phone |
| `leads.status` | lead_status default `new` | Pipeline state, independent per enquiry |
| `leads.source` | lead_source, N | RPC derives source |
| `leads.is_demo` | boolean default false | Seeded demo rows are application read-only |
| `leads.created_at`, `updated_at` | timestamptz default `now()` | Updated-at trigger |
| `lead_notes.id` | bigint generated identity | PK |
| `lead_notes.lead_id` | text | FK leads; delete cascade |
| `lead_notes.body` | text | Nonblank |
| `lead_notes.created_at` | timestamptz default `now()` | Note timestamp |
| `lead_activities.id` | text | PK, nonblank, caller supplies ID |
| `lead_activities.lead_id` | text | FK leads; delete cascade |
| `lead_activities.occurred_at` | timestamptz | Required timestamp |
| `lead_activities.label`, `detail` | text; detail N | Label nonblank |

The customer migration backfills `leads.customer_id` by grouping existing leads on the normalized phone. It keeps lead IDs, statuses, sources, messages, timestamps, notes, activities, property associations and demo markers unchanged; the lead updated-at trigger is disabled only while adding the link and restored inside the same migration transaction. The RPC stores the lead phone as digits-only and the customer phone as the canonical normalized value, so broker edits update the current customer contact while the enquiry message remains historical. A lead whose phone cannot be normalized stays unlinked rather than being forced into an incorrect customer.

### Broker customer summary view

`public.broker_customer_summary` is `security_invoker`, so customer and lead RLS still apply. It exposes current customer fields plus `enquiry_count`, `active_enquiry_count` (new, contacted, visit-scheduled or negotiation), `latest_enquiry_at`, `is_demo` (true only when every linked enquiry is demo) and the latest activity label/time. It is granted to `authenticated` only; anonymous users have no grant.

### Deals and brokerage payments

Source: `supabase/migrations/20261112000001_brokerage_accounting.sql`. This is a database-only foundation; no application screen, invoice generation, GST/tax logic, bank integration, financial dashboard or deal notification is implemented.

`public.deals` records one finalized property transaction per converted lead. `id` uses the existing `DEAL-` business-ID convention. `lead_id` is unique, so a second deal for the same lead is rejected by the database. `customer_id` and `property_id` are required and, when the deal is created, must match the converted lead's linked customer and property; a converted general enquiry without a property cannot become a deal. Those three associations are then immutable, so later lead edits do not change the deal. All three foreign keys are `on update cascade on delete restrict`, so financial history blocks parent deletion rather than cascading.

| Column | Type / default | Constraint or meaning |
|---|---|---|
| `id` | text, sequence-generated | PK; `DEAL-` ID, nonblank |
| `lead_id` | text | Unique FK to leads; delete restrict |
| `customer_id`, `property_id` | text | Required FKs to customers/properties; delete restrict; must match the lead at creation |
| `transaction_amount` | numeric(14,2) | Required; INR; greater than zero |
| `expected_brokerage` | numeric(14,2), N | Initial estimate; null or non-negative |
| `agreed_brokerage` | numeric(14,2) | Required; non-negative; not above `transaction_amount` |
| `invoice_number` | text, N | Optional; nonblank when present |
| `closing_date` | date | Required transaction closing date |
| `status` | `deal_status` default `pending` | Stored payment state; non-cancelled values are derived |
| `notes` | text, N | Internal note; nonblank when present |
| `created_at`, `updated_at` | timestamptz default `now()` | `updated_at` maintained by trigger |

`public.brokerage_payments` stores actual money received. `id` uses `PAY-`. `amount` is INR `numeric(14,2)` and must be greater than zero. `payment_date` is a required `timestamptz` with no default, so the broker records the actual collection time rather than relying on insertion time. `payment_method` is `cash`, `upi`, `bank_transfer`, `cheque` or `other`. `receipt_number`, `payment_reference` and `notes` are optional and nonblank when present; receipt numbers are deliberately not unique because one receipt may cover multiple installments. The deal foreign key is delete restrict, so payment history cannot be cascaded away.

**Derived status.** A `validate_deal` trigger rejects a non-cancelled status that does not match the collected total: no payments → `pending`, some but less than agreed → `partially_paid`, at least agreed → `fully_paid`. An `after insert` payment trigger refreshes the stored status. Manual attempts to mark a deal `fully_paid` below the agreed total, or to reduce `agreed_brokerage` below money already collected, are rejected. `cancelled` is explicit, allowed only before any payment, and cannot be reopened. A zero agreed brokerage derives to `fully_paid`, so such a deal must be created with that status rather than the default `pending`.

**Append-only payments.** Grants give `authenticated` only `select` and `insert` on payments, and a trigger rejects all updates and deletes with SQLSTATE `P0007`, including direct privileged edits. A controlled reversal/void mechanism is deferred; a wrong payment currently requires a forward design rather than rewriting history. No browser or service role receives `delete` or `truncate` on deals or payments, and payments receive no `update` grant.

**Overpayment concurrency.** The payment insert trigger locks the parent deal row with `select ... for update` before summing existing payments. Concurrent inserts for one deal serialize, and a payment that would overpay is rejected even when two submissions each fit individually. The sum runs in a later statement after the lock, so under the Supabase default READ COMMITTED isolation it sees the committed earlier payment. Under REPEATABLE READ the second transaction may abort instead. The checked-in SQL test is sequential; real multi-session concurrency has not been executed.

**Relationships captured at creation.** The converted-status, customer and property checks run only when a deal is created. This phase deliberately does not add a trigger to the existing lead workflow, so a later lead status change does not invalidate or block maintenance of an existing deal. The deal update path does not read the lead at all: it enforces that `lead_id`, `customer_id` and `property_id` are unchanged and then validates payments and status. Editing a lead's `customer_id` or `property_id` after the deal exists therefore cannot break notes updates or payment recording, and the deal keeps the associations captured at creation. The database does not propagate that lead drift into the deal; application-layer enforcement would be a future addition.

**Reporting views.** `broker_deal_summary` joins the deal, customer, property and payment totals to expose collected and pending brokerage, payment count and latest payment time. `broker_brokerage_monthly` groups collections by `date_trunc('month', payment_date at time zone 'Asia/Kolkata')`, never by `closing_date`; a payment collected in a later month belongs to that later month. Both views are `security_invoker` and granted to `authenticated` only, so broker RLS on the underlying tables remains the boundary. Anonymous users have no grant.

`MAD-...` and `LEAD-...` are business IDs; Auth user IDs belong to Supabase Auth. There is no image table in these migrations.

### Enum data dictionary

| Enum | Values |
|---|---|
| `property_type` | `apartment`, `independent-house`, `villa`, `plot` |
| `property_configuration` | `1-rk`, `1-bhk`, `2-bhk`, `3-bhk`, `4-bhk` |
| `listing_type` | `sale`, `rent`, `lease` |
| `property_status` | `available`, `under-offer`, `sold`, `draft`, `unavailable`, `expired` |
| `facing` | `north`, `south`, `east`, `west`, `north-east`, `north-west`, `south-east`, `south-west` |
| `furnishing_status` | `unfurnished`, `semi-furnished`, `furnished` |
| `approval_status` | `approved`, `unapproved`, `not-applicable` |
| `brokerage_type` | `percentage`, `fixed`, `none` |
| `verification_status` | `sample`, `broker-confirmed` |
| `lead_status` | `new`, `contacted`, `visit-scheduled`, `negotiation`, `converted`, `closed-lost` |
| `lead_source` | `website-form`, `property-enquiry`, `whatsapp`, `phone` |
| `deal_status` | `pending`, `partially_paid`, `fully_paid`, `cancelled` |
| `payment_method` | `cash`, `upi`, `bank_transfer`, `cheque`, `other` |

Indexes: `properties_area_slug_idx`, `properties_status_idx`, partial `properties_public_browse_idx`, partial `properties_public_featured_idx`, `properties_updated_at_idx`, partial `areas_active_idx`, `leads_status_idx`, `leads_created_at_idx`, `leads_property_id_idx`, `leads_customer_created_idx`, `lead_notes_lead_created_idx`, `lead_activities_lead_occurred_idx`, `deals_customer_idx`, `deals_property_idx`, `deals_closing_date_idx`, `deals_status_idx`, `brokerage_payments_deal_paid_idx`, `brokerage_payments_payment_date_idx`, and PK/unique indexes including the customer normalized-phone key and the deal lead key. Areas, leads, customers and deals use timestamp updated-at triggers; properties use a date trigger. Exact check names and RLS policies are in the migrations; access is summarized in §9.

## 7. Supabase integration architecture

| Module | Scope / key | Intended use |
|---|---|---|
| `src/lib/supabase/public-server.ts` | Server-only, publishable key, no cookies or session persistence/refresh/URL detection | Anonymous public reads and enquiry RPC; never broker private reads |
| `src/lib/supabase/server.ts` | Server-only, publishable key, request cookies | Login and guarded broker queries/actions; do not share across users |
| `src/lib/supabase/proxy.ts` | Server-only, publishable key, request/response cookies | Session refresh and cookie/header propagation |
| `src/lib/supabase/client.ts` | Browser SSR client, publishable key | Session-aware browser client where required |

No service-role client is present. Public row projections are in `database.types.ts`; broker projections are in `broker.types.ts`; mappers isolate database naming and nullability. Numeric database values may be strings or numbers. Domain conversions validate values; brokerage decimal strings preserve received precision where possible. JavaScript numbers have finite precision.

| Environment name | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL; required when a client is created |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key; RLS remains the security boundary |
| `NEXT_PUBLIC_SITE_URL` | Metadata URL; defaults to local URL |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Optional WhatsApp link configuration |

`src/lib/env.ts` validates Supabase values lazily and rejects `sb_secret_` keys. Configure local and hosting environments separately; public variables may be inlined at build time. Never put secret credentials in public variables.

## 8. Authentication and authorization

```mermaid
sequenceDiagram
  actor B as Broker
  participant L as LoginForm and loginAction
  participant S as Request-bound client
  participant A as Supabase Auth
  participant G as Proxy and requireBroker
  participant D as PostgreSQL RLS
  B->>L: email and password
  L->>S: signInWithPassword
  S->>A: authenticate
  A-->>S: session cookies and claims
  L->>A: getClaims and check app_metadata role
  B->>G: request admin page
  G->>A: getClaims and refresh cookies
  G->>S: request guarded broker data
  S->>D: query with broker session
  D-->>S: authorized rows
  S-->>G: mapped broker data
  G-->>B: rendered admin page
```

`loginAction` checks verified claims after password login, signs out non-brokers and sanitizes the `next` destination. `src/proxy.ts` leaves login public, checks other admin paths, refreshes cookies and redirects unauthorized users. `requireBroker()` calls `connection()`, uses React request-scoped `cache` and `getClaims()`, and trusts only server-controlled `app_metadata.role === "broker"`, not editable `user_metadata`. The dashboard layout obtains identity and provides shell context; protected pages, broker DAL functions and Server Actions apply their own guards. Database grants and broker RLS policies provide an additional database access boundary; their presence in migrations does not establish that they are applied in a deployed environment. `logoutAction` signs out. Hiding links in the browser is not authorization.

## 9. Database security and row-level security

The five original tables plus the broker notification, customer, deal and brokerage-payment tables have RLS. `public.is_broker()` is security-invoker, has an empty search path, and checks JWT `app_metadata.role`; authenticated users may execute it. Grants permit operations, policies restrict rows.

| Resource | Anonymous | Authenticated non-broker | Authenticated broker |
|---|---|---|---|
| Areas read | Active only | No matching policy | All |
| Properties read | `available` / `under-offer`, public columns only | No matching policy | All columns/statuses |
| Area/property writes | None | No matching policy | CRUD under broker policies |
| Customers | No direct access | No matching policy | Read and update only; no insert or delete grant |
| `broker_customer_summary` view | No grant | No matching policy | Select under invoker RLS |
| Lead/note/activity tables | No direct access | No matching policy | CRUD under broker policies |
| Broker notifications | No direct access | No matching policy | Read and update read timestamp only |
| Deals | No access | No matching policy | Read and insert; update only mutable columns; no delete grant |
| Brokerage payments | No access | No matching policy | Read and insert only; update/delete blocked by grants and trigger |
| `broker_deal_summary`, `broker_brokerage_monthly` views | No grant | No matching policy | Select under invoker RLS |
| `submit_public_lead` | Execute | No execute grant | No authenticated execute grant; public client remains anon |

Authenticated table CRUD grants are constrained by broker policies with `USING` and `WITH CHECK`. Anonymous has no direct lead-table, customer-table, financial-table or sequence grants. Authenticated receives usage on property, lead and note sequences, but not the customer sequence: only the security-definer RPC creates customers. The brokerage migration grants usage on the deal and payment sequences and limits deal updates to `transaction_amount`, `expected_brokerage`, `agreed_brokerage`, `invoice_number`, `closing_date`, `status` and `notes`; identity, associations and timestamps are not granted and are also guarded by trigger. `service_role` loses DELETE and TRUNCATE on deals and UPDATE, DELETE and TRUNCATE on payments; the append-only trigger still blocks payment mutation even for privileged direct edits. The customer update grant exists because brokers edit the current name, phone and email; the generated normalized-phone column still enforces uniqueness. The RPC is owned by `postgres`, `SECURITY DEFINER`, `RETURNS void`, has empty `search_path` and explicit execute grants/revokes. `normalize_customer_phone` is executable by `authenticated` only so a broker phone update can recalculate the generated column.

Publicly granted property columns: `id`, `slug`, `title`, `summary`, `public_description`, `type`, `configuration`, `listing_type`, `status`, `price`, `price_negotiable`, `bedrooms`, `bathrooms`, `built_up_area_sqft`, `carpet_area_sqft`, `uds_sqft`, `floor`, `facing`, `building_age_years`, `has_lift`, `parking`, `furnishing`, `approval_status`, `brokerage`, `brokerage_type`, `brokerage_value`, `availability_note`, `landmark`, `total_floors`, `security_deposit`, `last_verified_at`, `area_slug`, `locality`, `features`, `is_featured`, `verification_status`, `listed_at`, `updated_at`. Private `description`, `address` and `whatsapp_reference` are omitted from grants and queries. `mapPublicProperty` maps `public_description` to domain `description`.

When changing RLS or grants, use a forward migration and test each anonymous, non-broker and broker role, including column-level permissions and direct RPC calls in a disposable environment. Never broaden private access merely to simplify a public query.

## 10. Public website workflows

### 10.1 Home

`src/app/(public)/page.tsx` uses `connection()` and parallel featured (limit three), public area and public property queries. Featured ordering is by ID. `withPublicPropertyCounts` counts returned public rows, not all inventory; four curated area slugs appear first, new areas follow by slug.

### 10.2 Catalogue

`/properties` fetches public rows and active areas server-side, parses URL parameters using `parsePropertyFilters`, then filters with `filterProperties`. Filters cover keyword, transaction, area, category, configuration, bedrooms, price and facing. Search uses public ID/title/summary/locality/area/landmark. There is no server-side pagination or full-text search; backend response limits may truncate large catalogues. `PropertyCard` links to the slug and `PropertyGrid` renders empty states.

### 10.3 Property detail

`getPublicPropertyBySlug` permits only available/under-offer records. The page retrieves the active area when available and same-area public listings. Related items exclude the current ID, prioritize the same property **type**, then sort updated date descending and ID ascending; maximum three. Gallery images are illustrations, not uploaded photographs. Enquiry context uses the permanent ID, not editable text or private WhatsApp reference.

### 10.4 Contact

`/contact` supports general and explicitly referenced property enquiries. An invalid supplied property reference must not silently become a general enquiry. Contact details in `src/config/site.ts` are placeholders; WhatsApp links are conditional on configuration.

### 10.5 Navigation and responsive behavior

Public layout uses header, footer and mobile navigation; admin uses `AdminShell`, sidebar, header and mobile navigation. Tailwind breakpoints switch grids, tables and cards. `next/link` drives navigation; catalogue filters use URL search parameters and server rendering. See §11 for the sensitive-form fallback.

## 11. Public enquiry submission: end-to-end

```mermaid
sequenceDiagram
  actor V as Visitor
  participant F as ContactForm
  participant A as submitPublicLead action
  participant C as Public anonymous client
  participant R as submit_public_lead RPC
  participant D as PostgreSQL
  V->>F: enquiry and optional property context
  F->>F: shared validation
  F->>A: validated fields and honeypot
  A->>A: repeat validation
  A->>C: approved RPC arguments
  C->>R: anonymous invocation
  R->>D: validate, lock, resolve customer, insert lead, activity and notification
  D-->>R: transaction outcome
  R-->>A: void or safe error code
  A-->>F: serializable feedback
  F-->>V: success or error
```

`ContactForm` and the Server Action validate name (trimmed 2–120), phone (trimmed formatted input ≤256 characters and 10–15 digits after normalization), optional email (blank→null, ≤254, basic shape), message (trimmed 10–4000), and optional property ID (≤64, explicitly blank rejected). `null` or omitted means general. The RPC independently trims its phone input, limits the trimmed formatted value to 64 characters, removes nondigits and validates 10–15 digits before storing it; it also validates property visibility. The action normally passes the application-normalized digits to the RPC. JavaScript string length and PostgreSQL character count can differ for Unicode.

The server-rendered form specifies fixed `POST /contact`, disables its button until hydration and explains the JavaScript requirement. Hydrated submission prevents default, validates, focuses the first invalid field, prevents concurrent clicks with a ref and pending state, and calls the action. Verify the actual no-JavaScript and implicit-Enter behavior before launch.

`public.submit_public_lead(p_name text, p_phone text, p_email text, p_message text, p_property_id text default null) returns void` is defined by the public-lead migration and subsequently replaced by the broker-notification and customer-centric migrations. It derives source, `status='new'`, `is_demo=false`, IDs and timestamps. Invalid input uses `22023`; missing/nonpublic property uses `P0001`; a same-phone/same-property enquiry within 60 seconds uses `P0002`. The duplicate guard also matches a recent lead linked to the same customer, so a broker phone edit does not bypass it. An advisory transaction lock serializes that pair, and customer resolution, lead, initial activity and notification inserts are atomic after the customer migration. Customer resolution also takes a per-normalized-phone lock and upserts on the unique normalized phone; the function returns no customer or lead ID. The action returns safe serializable feedback, not IDs or raw errors. The website honeypot is not enforced for direct anonymous RPC calls. No durable per-phone/IP limit, CAPTCHA or configured WAF is implemented; direct invocation and rotating numbers remain risks.

## 12. Broker administration workflows

### Dashboard and areas

`/admin/dashboard` uses `getBrokerPropertyStats` for exact head-only counts of all, available, under-offer and sold properties, and `getRecentBrokerProperties` for up to five records ordered by `updated_at` descending then ID ascending. The date has day precision, so ID breaks same-day ties. The dashboard also uses `getBrokerLeadStats`, `getRecentBrokerLeads` and `getBrokerPropertyOptions`. Seeded sample properties have no demo marker and are included in counts. Errors propagate to the admin error boundary.

`/admin/areas` calls `getBrokerAreasWithCounts`, which reads explicit area columns in stable pages and obtains exact all-status and public-status counts per area. `saveBrokerArea` and `setBrokerAreaActive` validate server input, call `requireBroker()`, use the request-bound client and rely on broker RLS. The database unique constraint rejects duplicate slugs; slug changes cascade through the existing property foreign key. Actions revalidate affected public and admin paths and report refresh warnings. No area delete control exists. Public area access remains subject to existing RLS. No migration is added; applied environment state still needs verification.

### Properties

`getBrokerProperties`, `getBrokerPropertyById`, and `getBrokerAreas` use the request-bound client and guards. Broker area options include inactive areas to retain existing relations. List filters and search use current server props. Create/edit uses `adaptPropertyForm`, `validateBrokerPropertyInput`, and `mapBrokerPropertyCreate`/`mapBrokerPropertyUpdate`; a slug is generated and checked, while PostgreSQL generates the property ID. Partial updates preserve hidden fields, ID, slug, independent descriptions and unchanged free-form brokerage. `publish` sets `available`, `draft` sets `draft`, and `preserve` retains status. `updateBrokerPropertyStatus` supports all six statuses with confirmation for nonpublic targets; it does not alter approval.

Property actions revalidate the admin list/edit, home, catalogue, area list, property/area details and previous slug/area where applicable. Post-write invalidation failure returns a warning. Image selections are previews only.

### Broker notifications

`broker_notifications` stores a UUID, nullable lead foreign key, type, optional `customer_context` (`new`/`existing`), creation time and nullable read time. Deleting an associated lead leaves a notification without a lead; no customer contact details are stored in the notification row. An index supports recent ordering and a partial index supports unread counts. Broker RLS permits select and update; column grants allow authenticated users to update only `read_at`, with RLS restricting rows to brokers. Anonymous users have no table access. The security-definer `submit_public_lead` inserts the notification after customer, lead and initial activity in the same transaction; failure rolls back all four. Historical notifications keep `customer_context = NULL`; they are not backfilled. The RPC signature, owner, empty search path, validation, duplicate window and anon-only execute grant remain unchanged.

`getBrokerNotifications` uses the request-bound client and broker guard, selecting 20 recent records ordered by creation time and UUID descending plus an exact unread count. It joins only the lead name/property reference and the current customer name, not phone, email or message. `loadBrokerNotifications`, `markBrokerNotificationRead` and `markAllBrokerNotificationsRead` independently require a broker; write actions update only `read_at`. `NotificationBell` displays a drawer and polls the guarded load action every 30 seconds while the tab is visible, refreshes when the tab becomes visible or the drawer opens, and cleans up its timer on unmount. Items carry **New customer** or **Existing customer** labels when the database recorded that context. Read state is shared among all broker accounts. Poll failures display an error instead of a fabricated count; clicking an unread item confirms the update before navigating to `/admin/leads?lead=...`. There is no Realtime configuration or external messaging. Migration application, RLS and polling require staging verification.

### Customers

`/admin/customers` uses `getBrokerCustomerPage` and `getBrokerCustomerStats`. Listing search covers customer ID, name, phone, normalized phone and email; sorting supports latest enquiry, latest activity, newest customer and name, with 25-row server-side pages and exact matching/total counts. Search and paging run as a guarded Server Action (`loadBrokerCustomerHistory`) with a 350 ms debounce, so rows are filtered by PostgREST under broker RLS rather than loaded and filtered in the browser. The four headline metrics are total customers, customers with at least one active enquiry, repeat customers (two or more enquiries) and customers created in the last 30 days.

`/admin/customers/[id]` uses `getBrokerCustomerById`, which reads the summary row and pages through every linked enquiry in `created_at`/`id` descending order, then loads notes and activities in bounded pages. The page shows current customer name, phone, email, normalized phone, counts, latest enquiry and activity, and each enquiry's property, original message, status, notes and activity timeline. **Open enquiry** uses the existing `/admin/leads?lead=...` deep link, so status and notes remain managed by the existing enquiry workspace rather than a second write path.

`updateBrokerCustomer` validates the customer ID and shared name/phone/email rules, re-reads the authoritative summary row, rejects demo-only customers and skips an unchanged save. It updates only `name`, `phone` and `email`; the generated normalized phone recalculates, and a unique violation is reported as a phone conflict. It never merges two customers or rewrites lead snapshots, and it revalidates the customer list/detail, leads and dashboard. The edit form is disabled for demo-only customers and reports field errors plus partial-success refresh warnings. Customers with a mixed demo/real history are editable because the view marks `is_demo` only when every linked enquiry is demo.

### Leads

`/admin/leads` uses `getBrokerLeadPage`, `getBrokerPropertyOptions`, exact status statistics and optional `getBrokerLeadById` deep-link lookup. `AdminLeadsClient` calls the guarded `loadBrokerLeadHistory` Server Action to search and filter the full history with a 350 ms debounce; it fetches 25 rows per page ordered by `created_at` descending and `id` descending. Search matches ID, name, phone, email, message, property ID, related property title/locality, and the linked customer's name, phone and email. A PostgREST empty embedded relation supports the related-property search under broker RLS. Status, source and property/general filters combine with search; exact matching and overall counts are obtained separately. Search text is limited to 100 characters and stays in client state and action requests rather than URL query parameters. The history changes are uncommitted at this checkpoint; the PostgREST relationship search and end-to-end pagination have not been verified against staging in this review. The requested notification lead is loaded independently of the current page. Detail, status, notes and activity remain available. Contact fields in the detail view prefer the current customer record while the enquiry message stays historical; a linked enquiry shows an **Existing customer** link to its customer page. Seeded demo leads are labeled and guarded actions reject modifications based on the authoritative `is_demo` row. `updateBrokerLeadStatus` conditionally updates the previous status; `addBrokerLeadNote` validates nonblank text. Both attempt activity insertion separately and revalidate `/admin/leads` and `/admin/dashboard`. Broker actions are **not atomic** with their activity insert: a saved change can return an activity warning.

```mermaid
sequenceDiagram
  actor B as Broker
  participant U as AdminLeadsClient
  participant A as Guarded lead action
  participant S as Request-bound client
  participant D as PostgreSQL RLS
  B->>U: update status or add note
  U->>A: action request
  A->>A: requireBroker and validate
  A->>S: read lead and reject demo
  S->>D: broker-authorized mutation
  A->>S: attempt activity insert
  A-->>U: success, warning, conflict or error
  U->>U: refresh after success
```

## 13. Data validation and error handling

Shared public validation is in `src/lib/validation/public-lead.ts`; the form and action invoke it, and PostgreSQL independently validates. Broker property validation is `src/lib/supabase/validation/broker-property-input.ts`; it checks enum values, decimal precision, dates, booleans, area references and verification/approval combinations. `property-form-adapter.ts` distinguishes omitted fields, intentional clears, false and zero. Broker lead actions validate IDs, statuses and note text. Shared customer validation is `src/lib/validation/customer.ts`: name 2–120 characters, phone 10–15 digits after the same normalization rules, optional email up to 254 characters, and customer IDs in `CUST-` form. It intentionally has no server-only import so the client edit form and guarded Server Action can share it; PostgreSQL remains authoritative for normalization and uniqueness.

Public single-record queries return `null` only for missing rows and throw on database errors. Actions return safe discriminated results; invalidation failure after a successful write is a warning, not a failed mutation. No broad demo fallback should mask live read errors. Client validation is convenience, not a security boundary.

## 14. State management, caching and performance

React state handles forms, filters, dialogs and pending state. Admin data comes from guarded server reads; the lead inbox stores the latest page returned by a Server Action in client state. Actions use `revalidatePath`; lead updates and property status changes also call `router.refresh()`. Property create/edit forms show action feedback and rely on action invalidation and subsequent user navigation rather than calling `router.refresh()` themselves. `next.config.ts` enables Cache Components and partial prefetching. Several request-dependent pages set `instant = false`; auth uses `connection()` to avoid prerendering request-time token checks. Never cache a cookie-bound client or private rows across users.

Public queries have deterministic ordering but no application pagination and can be affected by backend response caps. Broker inbox and customer directory use 25-row database pages, exact matching counts and exact overall counts; offset pagination can shift between requests when concurrent inserts or updates change ordering. Child rows and property options are fetched in 500-row pages until exhausted; the property selector loads all options and very large note, activity or customer-enquiry histories can increase page load time. The customer summary view aggregates enquiry counts and latest activity in the database, and the detail query pages through linked enquiries rather than selecting an unbounded result. Leading-wildcard text search and exact counts can be expensive on a large dataset; evaluate query plans before adding indexes. Indexes are listed in §6. No Storage or persistent image-upload pipeline is configured; the browser-only preview uses Next Image for selected local files.

## 15. UI and design system

`src/app/globals.css` defines Tailwind v4 tokens for warm light surfaces, charcoal text, green accents and radii. `src/app/layout.tsx` uses Inter and Instrument Serif via `next/font/google`. Reuse `src/components/ui` buttons, cards, inputs, selects, badges, tables and textareas; `components/admin` provides `AdminModal`, `AdminDataTable`, badges, `ActionFeedback`, headers and stat cards; `components/common` provides notice, loading, error and empty states. Forms use `FormField`; icons come from Lucide. No toast library is configured.

## 16. Testing architecture

No Jest, Vitest, Playwright or Cypress framework is configured. `.cjs` tests use Node `assert`, VM, TypeScript transpilation, mocked clients/actions or static SQL inspection. These do not by themselves prove live database grants, cross-session locking, browser hydration or deployed configuration.

| Area | Test files | Command / coverage |
|---|---|---|
| Dashboard and areas | `tests/broker-dashboard-areas.test.cjs` | `node tests/broker-dashboard-areas.test.cjs`; mock reads, counts, ordering, authorization and writes |
| Notifications | `tests/broker-notifications.test.cjs`, `tests/sql/broker-notifications.sql` | Mock/static Node checks; SQL script requires disposable database and rolls back |
| Customers | `tests/customer-validation.test.cjs`, `tests/customer-queries.test.cjs`, `tests/customer-actions.test.cjs`, `tests/customer-schema.test.cjs`, `tests/sql/customer-centric-enquiries.sql` | Node mocks/static checks for normalization, listing, metrics, detail history, edit conflicts, authorization and regression assertions; SQL script requires a disposable database and rolls back |
| Brokerage accounting | `tests/brokerage-schema.test.cjs`, `tests/sql/brokerage-accounting.sql` | Node static checks for deal/payment schema, constraints, append-only payments, grants, RLS and payment-date reporting; SQL script requires a disposable database and rolls back and also covers lead-drift updates, association immutability, zero agreed brokerage and delta-based monthly totals. The SQL script is sequential; real multi-session concurrency remains unverified |
| Public action / validation | `tests/public-lead-action.test.cjs` | `node tests/public-lead-action.test.cjs` |
| RPC static checks | `tests/public-lead-rpc.test.cjs` | `node tests/public-lead-rpc.test.cjs`; no SQL execution |
| Prehydration render | `tests/contact-prehydration.test.cjs` | `node tests/contact-prehydration.test.cjs` |
| Lead history | `tests/lead-history.test.cjs` | Mocked paging, ordering, counts, filters and authorization; verify PostgREST relationship search in staging |
| Broker leads | `tests/lead-read.test.cjs`, `tests/lead-actions.test.cjs` | Run each with `node`; mocks and authorization |
| Broker property | `tests/property-actions.test.cjs`, `tests/property-form-adapter.test.cjs`, `tests/property-brokerage.test.cjs` | Run each with `node` |
| Property pages/list | `tests/property-pages.test.cjs`, `tests/property-list-refresh.test.cjs` | Run each with `node`; mocked rendering |
| SQL runtime | `tests/sql/public-lead-rpc.sql` | psql script for disposable local/staging; manual atomicity procedure included |

Add action tests with mocked guarded clients and failure cases, then separately test RPC security/atomicity in a disposable database and form behavior in a browser where the invariant depends on those systems.

## 17. Database migration and seed management

Apply the checked-in migrations in order: `20261107000000_initial_schema.sql` creates the schema and RLS; `20261109000000_public_lead_submission.sql` adds the RPC; `20261110000000_reject_blank_public_lead_property_id.sql` replaces it to reject blank references; `20261111000000_broker_notifications.sql` adds notifications and extends the RPC; `20261112000000_customer_centric_enquiries.sql` adds phone normalization, customers, the nullable lead link with backfill, the broker summary view, notification customer context and the customer-aware RPC; `20261112000001_brokerage_accounting.sql` adds deal/payment enums, sequences, tables, validation and append-only triggers, broker RLS and grants, and the two `security_invoker` reporting views. Do not rewrite migrations already applied elsewhere. `supabase/seed.sql` contains four areas, nine sample properties and seven demo leads; it is not a production import strategy. No historical notifications are backfilled. Neither the customer migration nor the brokerage migration was applied or verified by this review, and the brokerage migration was not executed here.

No `supabase/config.toml` or Supabase CLI package is checked in. Establish CLI and local-stack availability separately. The older SQL tests include psql meta-commands and cannot be pasted unchanged into Dashboard SQL Editor. The customer-centric and brokerage scripts use SQL without psql meta-commands; review them and the target before execution. Rollback test inserts can still consume sequence values. The brokerage script is sequential; its documented multi-session overpayment procedure requires two separate sessions. Never run tests against production.

Workflow: identify the intended project and migration state; create a later migration; review SQL, grants, RLS and data impact; test in disposable local/staging; verify roles, application behavior and migration history; obtain the normal production approval; apply only to the intended target; verify and commit. With a separately installed CLI, check its version and help for migration-list and dry-run commands before use. Remote linking and deployment are not established by this repository. Plan a forward fix and recovery; SQL migrations do not automatically undo data changes.

## 18. Local development setup (Windows PowerShell)

Install Git, npm and Node.js 22 or a later compatible version. The locked Supabase dependencies require Node.js 22 or later, even though Next.js has a lower minimum. Obtain the repository URL from the owner.

```powershell
git clone <repository-url>
Set-Location chennai-real-estates
npm ci
Copy-Item .env.example .env.local
# Configure the variable names in section 7 with your own nonproduction values.
npm run dev
```

Open `http://localhost:3000`. Use a dedicated local or staging Supabase project and broker account, never production data for tests. `getSupabasePublicConfig()` reports missing/malformed URL or key when a client is created; restart after changing values.

```powershell
npm run typecheck
npm run lint
npm run build
npm run start
node tests/public-lead-action.test.cjs
node tests/public-lead-rpc.test.cjs
node tests/brokerage-schema.test.cjs
```

Run other tests individually as listed in §16. `npm run start` serves an existing build. Google font fetching may require build-time network access.

## 19. Deployment architecture and environments

Git history and a remote named `origin` exist, but this repository does not establish a GitHub URL, Vercel project, production deployment, CI pipeline, project separation or hosting variables. Verify these with the owner. A build uses `npm run build`; hosting must configure the proper public Supabase variables and optional site/WhatsApp settings. Keep staging and production projects separate. Confirm the CLI target before any migration and use the team's verified release/rollback process.

## 20. Logging, monitoring, backups and operations

The public action maps errors to safe feedback and does not intentionally log enquiry PII. No application monitoring, alerting, backup schedule, retention policy, consent implementation or incident runbook is verified in the repository. Provider capabilities and actual settings require operator verification. Avoid logging request bodies or tokens; define retention and deletion procedures. Before launch, replace placeholder contact information, settle privacy/consent and retention, configure abuse protection for application and direct-RPC surfaces, and test backup restoration and migration recovery.

## 21. Engineering decisions and constraints

Calling the repository a modular monolith is an inference from its single Next application and domain modules, not a recorded strategic decision. Server Components keep public data reads on the server. The narrow RPC and anon column grants avoid direct anonymous lead insertion and private property exposure. Guarded actions and RLS protect direct calls; proxy checks alone are insufficient. Public and private descriptions remain independent. Permanent IDs differ from private WhatsApp references. Demo lead protection exists in broker actions as well as UI.

## 22. How to extend the application

1. **Public page:** add under `src/app/(public)`; reuse public queries/components; validate parameters, metadata, not-found/errors and public fields.
2. **Admin page:** add under `src/app/admin/(dashboard)`; use `requireBroker`, request-bound clients and RLS; add navigation after authorization.
3. **Property field:** inspect schema/migration, grants, public/broker projections, `database.types.ts`, `broker.types.ts`, mappers, validation, form adapter, UI and tests; classify privacy explicitly.
4. **Property filter:** change `src/modules/properties/filters.ts`, controls and tests; account for backend response limits.
5. **Lead or customer field:** review schema/RLS, broker types/mappers/queries, the customer link and backfill implications, public form and RPC if externally supplied, privacy and tests.
6. **Lead status:** add a forward enum migration; update `src/types/lead.ts`, `src/modules/leads/constants.ts`, actions, stats, UI and tests.
7. **Server Action:** validate all input, guard broker operations, use minimum projections, return safe serializable results and revalidate affected paths.
8. **Supabase RPC:** add a forward migration with constrained parameters, secure execution context, fixed search path and grants; test direct roles and transaction behavior.
9. **Database table:** define keys, checks, indexes, lifecycle, RLS and grants; add narrow typed DAL and tests before exposing it.
10. **RLS policy:** review grants and policies together; test allowed/denied roles and columns on disposable data.
11. **Validation rule:** update shared, server and database enforcement where appropriate; test null/omitted values, normalization, direct calls and UI focus.
12. **Property images:** currently absent. Design storage permissions, file limits, ownership, lifecycle and public exposure before adding a backend; previews are not persisted.
13. **Test:** extend existing `tests/*.test.cjs` harnesses and add real browser/database tests where needed.

## 23. Known limitations and technical debt

**Functional:** sample property rows are included in database counts; gallery images are illustrations; uploads are absent; public catalogue has no application pagination; broker inbox and customer directory use offset pagination; contact configuration is placeholder. Customer matching uses normalized phone only, ambiguous numbers are not merged, and there is no customer merge/delete workflow. Deals and brokerage payments are a database-only foundation: there is no deal or payment screen, invoice generation, GST/tax handling, bank reconciliation, financial dashboard or deal notification. Payments are append-only; a controlled reversal/void process for corrections is not designed.

**Security:** the honeypot and one-minute duplicate guard are not comprehensive rate limiting; direct anonymous RPC calls bypass the website honeypot. There is no implemented CAPTCHA or trusted per-IP protection. Duplicate responses can reveal limited recent-submission information. Verify JavaScript-disabled form and streamed HTTP status behavior.

**Operations:** deployment, migration state, backup/restore, monitoring, privacy notice, consent and retention are unverified. The customer migration and the brokerage migration, including their backfills, triggers, RLS, views and RPC changes, require disposable-database and staging verification. The overpayment row-lock guarantee is documented for READ COMMITTED; real multi-session concurrency has not been executed, and under REPEATABLE READ the second transaction may abort rather than overpay. Deal creation requires a converted lead with matching customer and property, and those associations are immutable afterwards. The deal update path does not re-read the lead, so a later lead status change or lead customer/property edit neither blocks deal maintenance nor alters the deal; it keeps the association captured at creation. **Future enhancements:** image management, external alerts, scalable search, customer merge/export controls, deal/payment UI, controlled payment reversal, invoicing/GST and broader browser/database automation need explicit design.

Documentation maintenance: for changes to architecture, features, workflows, routes, schema, security, integrations, validation, setup, tests, deployment, or limitations, review and update README.md and both guides in the same task as appropriate.

## 24. New engineer onboarding checklist

- [ ] Understand the single-broker journey and availability/approval/verification distinctions.
- [ ] Clone, configure a nonproduction environment and run §18 commands.
- [ ] Read the architecture and ER diagrams and all migrations.
- [ ] Trace anonymous and request-cookie clients, broker claims, grants and RLS.
- [ ] Trace a public enquiry through the RPC and a broker lead update through its action.
- [ ] Run the focused tests and arrange browser and disposable database verification.
- [ ] Confirm staging, deployment and Git review practices with the owner.
- [ ] Update this guide when verified implementation details change.

## 25. Quick reference and glossary

| Topic | Location |
|---|---|
| Public / admin routes | `src/app/(public)/`, `src/app/admin/` |
| Supabase clients | `src/lib/supabase/public-server.ts`, `server.ts`, `client.ts`, `proxy.ts` |
| Broker authorization | `src/lib/auth/broker.ts`, `src/proxy.ts` |
| Public enquiry action | `src/app/(public)/contact/actions.ts` |
| Public enquiry RPC | `supabase/migrations/20261109000000_public_lead_submission.sql`, `supabase/migrations/20261110000000_reject_blank_public_lead_property_id.sql`, `supabase/migrations/20261111000000_broker_notifications.sql`, and `supabase/migrations/20261112000000_customer_centric_enquiries.sql` |
| Database schema and RLS | `supabase/migrations/20261107000000_initial_schema.sql`, `supabase/migrations/20261112000000_customer_centric_enquiries.sql`, `supabase/migrations/20261112000001_brokerage_accounting.sql` |
| Queries and mappers | `src/lib/supabase/queries/`, `src/lib/supabase/mappers/` |
| Validation | `src/lib/validation/public-lead.ts`, `src/lib/validation/customer.ts`, `src/lib/supabase/validation/broker-property-input.ts` |
| Tests | `tests/`, `tests/sql/` |
| Environment variables | `src/lib/env.ts`, `src/config/site.ts`, `.env.example` |
| Commands | `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` |

**Glossary:** RLS = PostgreSQL row-level security; RPC = callable database function; DAL = data access layer; UDS = undivided share; `anon` = Supabase anonymous database role; broker = authenticated user with server-controlled broker claim; customer = one contact record matched by normalized phone; enquiry = an individual lead linked to a customer; demo lead = seeded record marked `is_demo` and made read-only by broker application actions; deal = one finalized property transaction created from a converted lead; brokerage payment = one actual append-only collection recorded against a deal, not an invoice or a promise to pay.
