-- Chennai Real Estates
-- Initial Supabase schema.
--
-- Creates the domain tables, constraints, indexes, ID generators, updated-at
-- triggers, broker helper, and RLS policies/grants for anonymous catalogue
-- reads and authenticated broker management.
--
-- Apply through Supabase migration tooling. Do not run this ad hoc against a
-- live project.

-- ---------------------------------------------------------------------------
-- 1. Enumerated domain values
-- ---------------------------------------------------------------------------

create type public.property_type as enum (
  'apartment',
  'independent-house',
  'villa',
  'plot'
);

create type public.property_configuration as enum (
  '1-rk',
  '1-bhk',
  '2-bhk',
  '3-bhk',
  '4-bhk'
);

create type public.listing_type as enum (
  'sale',
  'rent',
  'lease'
);

create type public.property_status as enum (
  'available',
  'under-offer',
  'sold',
  'draft',
  'unavailable',
  'expired'
);

create type public.facing as enum (
  'north',
  'south',
  'east',
  'west',
  'north-east',
  'north-west',
  'south-east',
  'south-west'
);

create type public.furnishing_status as enum (
  'unfurnished',
  'semi-furnished',
  'furnished'
);

create type public.approval_status as enum (
  'approved',
  'unapproved',
  'not-applicable'
);

create type public.brokerage_type as enum (
  'percentage',
  'fixed',
  'none'
);

create type public.verification_status as enum (
  'sample',
  'broker-confirmed'
);

create type public.lead_status as enum (
  'new',
  'contacted',
  'visit-scheduled',
  'negotiation',
  'converted',
  'closed-lost'
);

create type public.lead_source as enum (
  'website-form',
  'property-enquiry',
  'whatsapp',
  'phone'
);

-- ---------------------------------------------------------------------------
-- 2. Concurrency-safe ID generators
--
-- Seeded IDs are MAD-0001..MAD-0009 and LEAD-1001..LEAD-1007, so the
-- sequences start above those values. Explicit seed inserts do not consume
-- sequence values, and rerunning the seed never rewinds a sequence.
-- ---------------------------------------------------------------------------

create sequence public.property_id_seq as bigint start with 10;
create sequence public.lead_id_seq as bigint start with 1008;

create function public.format_generated_id(prefix text, id_number bigint)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select prefix || pg_catalog.lpad(id_number::text, greatest(4, pg_catalog.length(id_number::text)), '0');
$$;

-- ---------------------------------------------------------------------------
-- 3. Tables
-- ---------------------------------------------------------------------------

create table public.areas (
  slug text not null,
  name text not null,
  pincode text not null,
  summary text not null,
  description text not null,
  highlights text[] not null default '{}'::text[],
  parent_area text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint areas_pkey primary key (slug),
  constraint areas_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint areas_name_length
    check (char_length(btrim(name)) >= 3),
  constraint areas_pincode_format
    check (pincode ~ '^[0-9]{6}$'),
  constraint areas_summary_length
    check (char_length(btrim(summary)) >= 10),
  constraint areas_description_length
    check (char_length(btrim(description)) >= 20)
);

create table public.properties (
  id text not null
    default public.format_generated_id('MAD-', nextval('public.property_id_seq')),
  slug text not null,
  title text not null,
  summary text not null,
  description text[] not null,
  public_description text[] not null,
  type public.property_type not null,
  configuration public.property_configuration,
  listing_type public.listing_type not null,
  status public.property_status not null default 'draft',
  price numeric(14, 2) not null,
  price_negotiable boolean not null default false,
  bedrooms smallint,
  bathrooms smallint,
  built_up_area_sqft numeric(10, 2),
  carpet_area_sqft numeric(10, 2),
  uds_sqft numeric(10, 2),
  floor text,
  facing public.facing,
  building_age_years smallint,
  has_lift boolean,
  parking text,
  furnishing public.furnishing_status,
  approval_status public.approval_status,
  brokerage text,
  brokerage_type public.brokerage_type,
  brokerage_value numeric(14, 2),
  availability_note text,
  landmark text,
  address text,
  total_floors smallint,
  security_deposit numeric(14, 2),
  last_verified_at date,
  area_slug text not null,
  locality text not null,
  features text[] not null default '{}'::text[],
  is_featured boolean not null default false,
  verification_status public.verification_status not null default 'sample',
  whatsapp_reference text,
  listed_at date not null,
  updated_at date not null default current_date,

  constraint properties_pkey primary key (id),
  constraint properties_slug_key unique (slug),
  constraint properties_id_not_blank
    check (btrim(id) <> ''),
  constraint properties_slug_format
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint properties_title_length
    check (char_length(btrim(title)) >= 5),
  constraint properties_summary_length
    check (char_length(btrim(summary)) >= 10),
  constraint properties_description_not_empty
    check (cardinality(description) >= 1),
  constraint properties_price_positive
    check (price > 0),
  constraint properties_bedrooms_non_negative
    check (bedrooms is null or bedrooms >= 0),
  constraint properties_bathrooms_non_negative
    check (bathrooms is null or bathrooms >= 0),
  constraint properties_built_up_area_positive
    check (built_up_area_sqft is null or built_up_area_sqft > 0),
  constraint properties_carpet_area_non_negative
    check (carpet_area_sqft is null or carpet_area_sqft >= 0),
  constraint properties_uds_non_negative
    check (uds_sqft is null or uds_sqft >= 0),
  constraint properties_building_age_non_negative
    check (building_age_years is null or building_age_years >= 0),
  constraint properties_total_floors_non_negative
    check (total_floors is null or total_floors >= 0),
  constraint properties_security_deposit_non_negative
    check (security_deposit is null or security_deposit >= 0),
  constraint properties_brokerage_value_non_negative
    check (brokerage_value is null or brokerage_value >= 0),
  constraint properties_sample_not_approved
    check (not (approval_status = 'approved' and verification_status = 'sample')),
  constraint properties_broker_confirmed_verified
    check (verification_status <> 'broker-confirmed' or last_verified_at is not null),
  constraint properties_brokerage_value_required
    check (brokerage_type is null or brokerage_type = 'none' or brokerage_value is not null),
  constraint properties_brokerage_none_no_value
    check (brokerage_type is distinct from 'none' or brokerage_value is null),
  constraint properties_area_slug_fkey
    foreign key (area_slug) references public.areas (slug)
    on update cascade on delete restrict
);

create table public.leads (
  id text not null
    default public.format_generated_id('LEAD-', nextval('public.lead_id_seq')),
  name text not null,
  phone text not null,
  email text,
  message text not null,
  property_id text,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  source public.lead_source,
  is_demo boolean not null default false,
  updated_at timestamptz not null default now(),

  constraint leads_pkey primary key (id),
  constraint leads_id_not_blank
    check (btrim(id) <> ''),
  constraint leads_name_not_blank
    check (btrim(name) <> ''),
  constraint leads_phone_valid
    check (
      char_length(regexp_replace(phone, '[^0-9]', '', 'g'))
      between 10 and 15
    ),
  constraint leads_message_not_blank
    check (btrim(message) <> ''),
  constraint leads_property_id_fkey
    foreign key (property_id) references public.properties (id)
    on update cascade on delete restrict
);

create table public.lead_notes (
  id bigint generated always as identity,
  lead_id text not null,
  body text not null,
  created_at timestamptz not null default now(),

  constraint lead_notes_pkey primary key (id),
  constraint lead_notes_body_not_blank
    check (btrim(body) <> ''),
  constraint lead_notes_lead_id_fkey
    foreign key (lead_id) references public.leads (id)
    on delete cascade
);

create table public.lead_activities (
  id text not null,
  lead_id text not null,
  occurred_at timestamptz not null,
  label text not null,
  detail text,

  constraint lead_activities_pkey primary key (id),
  constraint lead_activities_id_not_blank
    check (btrim(id) <> ''),
  constraint lead_activities_label_not_blank
    check (btrim(label) <> ''),
  constraint lead_activities_lead_id_fkey
    foreign key (lead_id) references public.leads (id)
    on delete cascade
);

alter sequence public.property_id_seq owned by public.properties.id;
alter sequence public.lead_id_seq owned by public.leads.id;

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

create index properties_area_slug_idx
  on public.properties (area_slug);

create index properties_status_idx
  on public.properties (status);

create index properties_public_browse_idx
  on public.properties (listing_type, price)
  where status in ('available', 'under-offer');

create index properties_public_featured_idx
  on public.properties (is_featured)
  where is_featured and status in ('available', 'under-offer');

create index properties_updated_at_idx
  on public.properties (updated_at desc);

create index areas_active_idx
  on public.areas (is_active)
  where is_active;

create index leads_status_idx
  on public.leads (status);

create index leads_created_at_idx
  on public.leads (created_at desc);

create index leads_property_id_idx
  on public.leads (property_id);

create index lead_notes_lead_created_idx
  on public.lead_notes (lead_id, created_at);

create index lead_activities_lead_occurred_idx
  on public.lead_activities (lead_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 5. Updated-at triggers
--
-- Areas and leads use timestamptz. Properties deliberately keep the existing
-- date-based domain field.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_updated_at_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = current_date;
  return new;
end;
$$;

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at_date();

-- ---------------------------------------------------------------------------
-- 6. Broker helper
--
-- app_metadata is server-controlled. Clients can edit user_metadata, but not
-- app_metadata, so a broker role cannot be self-assigned through the API.
-- ---------------------------------------------------------------------------

create or replace function public.is_broker()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'broker',
    false
  );
$$;

revoke all on function public.is_broker() from public;
grant execute on function public.is_broker() to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.areas enable row level security;
alter table public.properties enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_activities enable row level security;

-- Anonymous visitors: active areas and publicly eligible properties only.
-- Public policies intentionally target anon only. Non-broker authenticated
-- users therefore inherit no public read access either.

create policy areas_public_read
  on public.areas
  for select
  to anon
  using (is_active = true);

create policy properties_public_read
  on public.properties
  for select
  to anon
  using (status in ('available', 'under-offer'));

-- Authenticated broker: full management of every table.

create policy areas_broker_all
  on public.areas
  for all
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

create policy properties_broker_all
  on public.properties
  for all
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

create policy leads_broker_all
  on public.leads
  for all
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

create policy lead_notes_broker_all
  on public.lead_notes
  for all
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

create policy lead_activities_broker_all
  on public.lead_activities
  for all
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

-- ---------------------------------------------------------------------------
-- 8. Explicit grants
--
-- RLS filters rows; grants control columns and operations. The anon property
-- grant deliberately omits description, address and whatsapp_reference. Public queries
-- must select explicit columns rather than *.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on public.areas from anon, authenticated;
grant select on public.areas to anon;
grant select, insert, update, delete on public.areas to authenticated;

revoke all on public.properties from public, anon, authenticated;
revoke select (description, address, whatsapp_reference)
  on public.properties from public, anon;
grant select (
  id,
  slug,
  title,
  summary,
  public_description,
  type,
  configuration,
  listing_type,
  status,
  price,
  price_negotiable,
  bedrooms,
  bathrooms,
  built_up_area_sqft,
  carpet_area_sqft,
  uds_sqft,
  floor,
  facing,
  building_age_years,
  has_lift,
  parking,
  furnishing,
  approval_status,
  brokerage,
  brokerage_type,
  brokerage_value,
  availability_note,
  landmark,
  total_floors,
  security_deposit,
  last_verified_at,
  area_slug,
  locality,
  features,
  is_featured,
  verification_status,
  listed_at,
  updated_at
) on public.properties to anon;
grant select, insert, update, delete on public.properties to authenticated;

revoke all on public.leads from anon, authenticated;
grant select, insert, update, delete on public.leads to authenticated;

revoke all on public.lead_notes from anon, authenticated;
grant select, insert, update, delete on public.lead_notes to authenticated;

revoke all on public.lead_activities from anon, authenticated;
grant select, insert, update, delete on public.lead_activities to authenticated;

-- Sequence usage is required for default-generated IDs and identity columns.
grant usage on sequence public.property_id_seq to authenticated;
grant usage on sequence public.lead_id_seq to authenticated;
grant usage on sequence public.lead_notes_id_seq to authenticated;
