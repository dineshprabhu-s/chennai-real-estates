-- Chennai Real Estates
-- Customer-centric enquiry management.
--
-- One customer may have many independently managed leads/enquiries. Existing
-- lead rows keep their IDs and continue to hold the enquiry-specific message,
-- property, status, notes and activity history.
--
-- Apply through Supabase migration tooling. Do not run this ad hoc against a
-- live project.

-- ---------------------------------------------------------------------------
-- 1. Customer phone normalization
--
-- India-focused matching: strip formatting, accept an optional +91/91 or
-- leading 0 prefix only when the remaining value is a 10-digit Indian mobile
-- number. Other 10-15 digit values are retained as-is rather than guessed at,
-- so ambiguous historical numbers are not merged with unrelated numbers.
-- ---------------------------------------------------------------------------

create or replace function public.normalize_customer_phone(p_phone text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when d.digits is null
      or pg_catalog.char_length(d.digits) not between 10 and 15 then null
    when pg_catalog.char_length(d.digits) = 12
      and pg_catalog.substr(d.digits, 1, 2) = '91'
      and pg_catalog.substr(d.digits, 3, 10) ~ '^[6-9][0-9]{9}$'
      then pg_catalog.substr(d.digits, 3, 10)
    when pg_catalog.char_length(d.digits) = 11
      and pg_catalog.substr(d.digits, 1, 1) = '0'
      and pg_catalog.substr(d.digits, 2, 10) ~ '^[6-9][0-9]{9}$'
      then pg_catalog.substr(d.digits, 2, 10)
    else d.digits
  end
  from (
    select pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g') as digits
  ) d;
$$;

-- The expression is evaluated for broker updates to customers.phone, so
-- authenticated brokers need execute on this pure normalization helper.
-- Anonymous callers do not need it; the public RPC runs as its owner.
revoke all on function public.normalize_customer_phone(text)
  from public, anon, authenticated;
grant execute on function public.normalize_customer_phone(text)
  to authenticated;

comment on function public.normalize_customer_phone(text)
  is 'Normalizes India-focused phone input for customer matching without guessing at ambiguous numbers.';

-- ---------------------------------------------------------------------------
-- 2. Customers
-- ---------------------------------------------------------------------------

create sequence public.customer_id_seq as bigint start with 1;

create table public.customers (
  id text not null
    default public.format_generated_id('CUST-', nextval('public.customer_id_seq')),
  name text not null,
  phone text not null,
  normalized_phone text
    generated always as (public.normalize_customer_phone(phone)) stored,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customers_pkey primary key (id),
  constraint customers_id_not_blank
    check (btrim(id) <> ''),
  constraint customers_name_not_blank
    check (btrim(name) <> ''),
  constraint customers_phone_not_blank
    check (btrim(phone) <> ''),
  constraint customers_normalized_phone_valid
    check (normalized_phone is not null and normalized_phone ~ '^[0-9]{10,15}$'),
  constraint customers_normalized_phone_key
    unique (normalized_phone)
);

alter sequence public.customer_id_seq owned by public.customers.id;

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

create policy customers_broker_all
  on public.customers
  for all
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

revoke all on public.customers from public, anon, authenticated;
grant select, update on public.customers to authenticated;

-- No browser role creates customers directly; the security-definer public RPC
-- owns customer creation and uses this sequence as its owner.
revoke all on sequence public.customer_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Lead-to-customer link and historical backfill
--
-- The leads updated-at trigger is disabled only for this backfill so adding
-- customer_id does not rewrite historical lead timestamps. The migration runs
-- in one transaction, so a failure restores the trigger state with the rest of
-- the migration.
-- ---------------------------------------------------------------------------

alter table public.leads
  add column customer_id text;

alter table public.leads
  add constraint leads_customer_id_fkey
  foreign key (customer_id) references public.customers (id)
  on update cascade on delete restrict;

create index leads_customer_created_idx
  on public.leads (customer_id, created_at desc, id desc);

insert into public.customers (
  name,
  phone,
  email,
  created_at,
  updated_at
)
select
  grouped.name,
  grouped.normalized_phone,
  grouped.email,
  grouped.created_at,
  grouped.updated_at
from (
  select
    public.normalize_customer_phone(l.phone) as normalized_phone,
    (array_agg(l.name order by l.created_at asc, l.id asc))[1] as name,
    (array_agg(l.email order by l.created_at asc, l.id asc)
      filter (where l.email is not null))[1] as email,
    min(l.created_at) as created_at,
    max(l.updated_at) as updated_at
  from public.leads l
  group by public.normalize_customer_phone(l.phone)
) grouped
where grouped.normalized_phone is not null;

alter table public.leads disable trigger leads_set_updated_at;

update public.leads l
set customer_id = c.id
from public.customers c
where c.normalized_phone = public.normalize_customer_phone(l.phone);

alter table public.leads enable trigger leads_set_updated_at;

-- Leads whose phone cannot be safely normalized remain unlinked rather than
-- being forced into a customer. The current leads phone check requires 10-15
-- digits, so in practice this should be empty.

-- ---------------------------------------------------------------------------
-- 4. Broker customer summary
--
-- security_invoker keeps the underlying customers/leads/activity RLS policies
-- in force. Anonymous users receive no grant on the view.
-- ---------------------------------------------------------------------------

create view public.broker_customer_summary
with (security_invoker = true)
as
select
  c.id,
  c.name,
  c.phone,
  c.email,
  c.normalized_phone,
  c.created_at,
  c.updated_at,
  count(l.id)::bigint as enquiry_count,
  count(l.id) filter (
    where l.status in ('new', 'contacted', 'visit-scheduled', 'negotiation')
  )::bigint as active_enquiry_count,
  max(l.created_at) as latest_enquiry_at,
  coalesce(
    bool_and(l.is_demo) filter (where l.id is not null),
    false
  ) as is_demo,
  activity.label as latest_activity_label,
  activity.occurred_at as latest_activity_at
from public.customers c
left join public.leads l on l.customer_id = c.id
left join lateral (
  select a.label, a.occurred_at
  from public.leads la
  join public.lead_activities a on a.lead_id = la.id
  where la.customer_id = c.id
  order by a.occurred_at desc, a.id desc
  limit 1
) activity on true
group by c.id, activity.label, activity.occurred_at;

revoke all on public.broker_customer_summary
  from public, anon, authenticated;
grant select on public.broker_customer_summary to authenticated;

comment on view public.broker_customer_summary
  is 'Broker-only customer listing metrics. security_invoker keeps customer and lead RLS in force.';

-- ---------------------------------------------------------------------------
-- 5. Notification customer context
-- ---------------------------------------------------------------------------

alter table public.broker_notifications
  add column customer_context text;

alter table public.broker_notifications
  add constraint broker_notifications_customer_context_check
  check (customer_context is null or customer_context in ('new', 'existing'));

comment on column public.broker_notifications.customer_context
  is 'Whether the associated customer was created by this enquiry (new) or already existed (existing). Historical rows may be null.';

-- ---------------------------------------------------------------------------
-- 6. Public submission RPC
--
-- Signature, return type, validation, duplicate window, source derivation,
-- property visibility, initial activity and anon-only execute are preserved.
-- Customer resolution is added in the same transaction as the lead.
-- ---------------------------------------------------------------------------

create or replace function public.submit_public_lead(
  p_name text,
  p_phone text,
  p_email text,
  p_message text,
  p_property_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := pg_catalog.btrim(p_name, E' \t\n\r\f\v');
  v_phone text := pg_catalog.btrim(p_phone, E' \t\n\r\f\v');
  v_email text := case
    when p_email is null
      or pg_catalog.btrim(p_email, E' \t\n\r\f\v') = '' then null
    else pg_catalog.btrim(p_email, E' \t\n\r\f\v')
  end;
  v_message text := pg_catalog.btrim(p_message, E' \t\n\r\f\v');
  v_property_id text := pg_catalog.btrim(
    p_property_id,
    E' \t\n\r\f' || pg_catalog.chr(11)
  );
  v_phone_digits text;
  v_normalized_phone text;
  v_source public.lead_source;
  v_lead_id text;
  v_customer_id text;
  v_customer_context text;
begin
  -- Name: required, 2-120 characters.
  if v_name is null
     or pg_catalog.char_length(v_name) < 2
     or pg_catalog.char_length(v_name) > 120 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  -- Phone: required, 10-15 digits after removing formatting. Store digits only
  -- on the lead; the customer record keeps a canonical matching value.
  if v_phone is null
     or pg_catalog.char_length(v_phone) > 64 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  v_phone_digits := pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g');

  if v_phone_digits is null
     or pg_catalog.char_length(v_phone_digits) not between 10 and 15 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  v_normalized_phone := public.normalize_customer_phone(v_phone_digits);

  if v_normalized_phone is null then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  -- Email: optional, 254 characters maximum, basic shape.
  if v_email is not null and (
       pg_catalog.char_length(v_email) > 254
       or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     ) then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  -- Message: required, 10-4000 characters.
  if v_message is null
     or pg_catalog.char_length(v_message) < 10
     or pg_catalog.char_length(v_message) > 4000 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  -- NULL means a general enquiry; an explicitly blank reference is invalid.
  if p_property_id is not null and v_property_id = '' then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  -- Property: optional. When supplied, it must be publicly visible.
  if v_property_id is not null then
    if pg_catalog.char_length(v_property_id) > 64 then
      raise exception 'Invalid enquiry' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.properties p
      where p.id = v_property_id
        and p.status in ('available', 'under-offer')
    ) then
      raise exception 'Property unavailable' using errcode = 'P0001';
    end if;
  end if;

  -- Serialize equivalent submissions for the same normalized phone/property
  -- combination, then reject an equivalent recent submission. This is a
  -- minimal duplicate guard, not a replacement for edge/WAF rate limiting.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_normalized_phone),
    pg_catalog.hashtext(
      case when v_property_id is null then '' else v_property_id end
    )
  );

  if exists (
    select 1
    from public.leads l
    left join public.customers c on c.id = l.customer_id
    where l.property_id is not distinct from v_property_id
      and l.created_at > pg_catalog.now() - interval '60 seconds'
      and (
        public.normalize_customer_phone(l.phone) = v_normalized_phone
        or c.normalized_phone = v_normalized_phone
      )
  ) then
    raise exception 'Duplicate enquiry' using errcode = 'P0002';
  end if;

  -- Serialize customer creation per normalized phone. The unique constraint is
  -- the final guard against duplicate customer rows.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('customer:' || v_normalized_phone)
  );

  select c.id into v_customer_id
  from public.customers c
  where c.normalized_phone = v_normalized_phone;

  v_customer_context := case
    when v_customer_id is null then 'new'
    else 'existing'
  end;

  insert into public.customers as c (name, phone, email)
  values (v_name, v_normalized_phone, v_email)
  on conflict (normalized_phone) do update
    set email = coalesce(c.email, excluded.email),
        updated_at = pg_catalog.now()
  returning id into v_customer_id;

  v_source := case
    when v_property_id is null then 'website-form'::public.lead_source
    else 'property-enquiry'::public.lead_source
  end;

  insert into public.leads (
    name,
    phone,
    email,
    message,
    property_id,
    customer_id,
    status,
    source,
    is_demo
  )
  values (
    v_name,
    v_phone_digits,
    v_email,
    v_message,
    v_property_id,
    v_customer_id,
    'new'::public.lead_status,
    v_source,
    false
  )
  returning id into v_lead_id;

  insert into public.lead_activities (
    id,
    lead_id,
    occurred_at,
    label,
    detail
  )
  values (
    pg_catalog.gen_random_uuid()::text,
    v_lead_id,
    pg_catalog.now(),
    'Enquiry received',
    case
      when v_property_id is null
        then 'New enquiry submitted from the public contact form.'
      else 'New enquiry submitted from a property page.'
    end
  );

  -- This insert is part of the same transaction as the customer, lead and
  -- activity. The notification still points at the individual enquiry.
  insert into public.broker_notifications (
    lead_id,
    notification_type,
    customer_context
  )
  values (
    v_lead_id,
    'new_enquiry',
    v_customer_context
  );

  return;
end;
$$;

-- The function is owned by the migration/table-owner role used by Supabase.
alter function public.submit_public_lead(text, text, text, text, text)
  owner to postgres;

-- Only anonymous visitors may execute this RPC. No table or sequence grants
-- are added; anon still has no direct access to customers, leads, notes, or
-- activities.
revoke all on function public.submit_public_lead(text, text, text, text, text)
  from public;
revoke all on function public.submit_public_lead(text, text, text, text, text)
  from anon, authenticated;
grant execute on function public.submit_public_lead(text, text, text, text, text)
  to anon;

comment on function public.submit_public_lead(text, text, text, text, text)
  is 'Narrow anonymous entry point for public enquiries. Resolves or creates a customer, inserts a non-demo lead, initial activity and notification in one transaction, and returns no row or ID.';
