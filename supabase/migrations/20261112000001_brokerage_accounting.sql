-- Chennai Real Estates
-- Brokerage accounting and closed-deals ledger foundation.
--
-- One converted lead can become exactly one deal. A deal records the finalized
-- property transaction and the agreed brokerage. Actual money received is
-- recorded only in brokerage_payments; a deal never stores a manually editable
-- collected total.
--
-- This migration is database-only. It does not add a deal or payment UI,
-- invoice generation, GST/tax calculations, bank integrations or a financial
-- dashboard.
--
-- All monetary amounts are INR and use numeric(14, 2), matching the existing
-- property price convention. Apply through Supabase migration tooling. Do not
-- run this ad hoc against a live project.

-- ---------------------------------------------------------------------------
-- 1. Enumerated domain values
-- ---------------------------------------------------------------------------

create type public.deal_status as enum (
  'pending',
  'partially_paid',
  'fully_paid',
  'cancelled'
);

create type public.payment_method as enum (
  'cash',
  'upi',
  'bank_transfer',
  'cheque',
  'other'
);

comment on type public.deal_status
  is 'Stored deal payment state. Non-cancelled values are derived from brokerage payments; cancellation is explicit.';
comment on type public.payment_method
  is 'Supported actual brokerage collection methods for the initial INR-only ledger.';

-- ---------------------------------------------------------------------------
-- 2. Concurrency-safe deal and payment identifiers
--
-- Deals and payments use the same text business-ID convention as properties,
-- leads and customers. Explicit imports do not consume sequence values.
-- ---------------------------------------------------------------------------

create sequence public.deal_id_seq as bigint start with 1;
create sequence public.brokerage_payment_id_seq as bigint start with 1;

-- ---------------------------------------------------------------------------
-- 3. Deals
--
-- lead_id is unique. A converted lead therefore has at most one deal, and a
-- duplicate is rejected by the database rather than silently replaced.
--
-- customer_id and property_id are required because a finalized deal is a
-- property transaction. The validation trigger requires both to match the
-- lead. A converted general enquiry with no property cannot become a deal.
-- ---------------------------------------------------------------------------

create table public.deals (
  id text not null
    default public.format_generated_id('DEAL-', nextval('public.deal_id_seq')),
  lead_id text not null,
  customer_id text not null,
  property_id text not null,
  transaction_amount numeric(14, 2) not null,
  expected_brokerage numeric(14, 2),
  agreed_brokerage numeric(14, 2) not null,
  invoice_number text,
  closing_date date not null,
  status public.deal_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint deals_pkey primary key (id),
  constraint deals_id_not_blank
    check (btrim(id) <> ''),
  constraint deals_lead_id_key unique (lead_id),
  constraint deals_lead_id_fkey
    foreign key (lead_id) references public.leads (id)
    on update cascade on delete restrict,
  constraint deals_customer_id_fkey
    foreign key (customer_id) references public.customers (id)
    on update cascade on delete restrict,
  constraint deals_property_id_fkey
    foreign key (property_id) references public.properties (id)
    on update cascade on delete restrict,
  constraint deals_transaction_amount_positive
    check (transaction_amount > 0),
  constraint deals_expected_brokerage_non_negative
    check (expected_brokerage is null or expected_brokerage >= 0),
  constraint deals_agreed_brokerage_non_negative
    check (agreed_brokerage >= 0),
  constraint deals_agreed_brokerage_within_transaction
    check (agreed_brokerage <= transaction_amount),
  constraint deals_invoice_number_not_blank
    check (invoice_number is null or btrim(invoice_number) <> ''),
  constraint deals_notes_not_blank
    check (notes is null or btrim(notes) <> '')
);

alter sequence public.deal_id_seq owned by public.deals.id;

-- ---------------------------------------------------------------------------
-- 4. Brokerage payments
--
-- Each row is an actual collection. Payments are append-only: update and
-- delete are blocked by trigger as well as by grants. A future correction
-- mechanism should post a reversal/void record rather than rewrite history.
-- ---------------------------------------------------------------------------

create table public.brokerage_payments (
  id text not null
    default public.format_generated_id(
      'PAY-',
      nextval('public.brokerage_payment_id_seq')
    ),
  deal_id text not null,
  amount numeric(14, 2) not null,
  payment_date timestamptz not null,
  payment_method public.payment_method not null,
  receipt_number text,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),

  constraint brokerage_payments_pkey primary key (id),
  constraint brokerage_payments_id_not_blank
    check (btrim(id) <> ''),
  constraint brokerage_payments_deal_id_fkey
    foreign key (deal_id) references public.deals (id)
    on update cascade on delete restrict,
  constraint brokerage_payments_amount_positive
    check (amount > 0),
  constraint brokerage_payments_receipt_number_not_blank
    check (receipt_number is null or btrim(receipt_number) <> ''),
  constraint brokerage_payments_payment_reference_not_blank
    check (payment_reference is null or btrim(payment_reference) <> ''),
  constraint brokerage_payments_notes_not_blank
    check (notes is null or btrim(notes) <> '')
);

alter sequence public.brokerage_payment_id_seq
  owned by public.brokerage_payments.id;

-- ---------------------------------------------------------------------------
-- 5. Indexes
--
-- The lead_id unique constraint already provides its index. The payment index
-- on (deal_id, payment_date) supports per-deal collection history and totals;
-- the payment_date index supports monthly reporting.
-- ---------------------------------------------------------------------------

create index deals_customer_idx
  on public.deals (customer_id);

create index deals_property_idx
  on public.deals (property_id);

create index deals_closing_date_idx
  on public.deals (closing_date desc);

create index deals_status_idx
  on public.deals (status);

create index brokerage_payments_deal_paid_idx
  on public.brokerage_payments (deal_id, payment_date desc, id desc);

create index brokerage_payments_payment_date_idx
  on public.brokerage_payments (payment_date desc);

-- ---------------------------------------------------------------------------
-- 6. Deal validation
--
-- Enforces the relationship between a deal and its converted lead at creation.
-- The lead is not read again on deal updates: this phase does not add a trigger
-- to the existing lead workflow, so a later lead status, customer or property
-- change must not make an existing deal unmaintainable. The deal keeps the
-- customer and property association captured at creation. The same migration
-- documents these limitations.
--
-- Identity and association fields are immutable. The non-cancelled status is
-- derived from payment totals. Cancellation is explicit, is allowed only before
-- any payment, and cannot be reversed. Because a zero agreed brokerage derives
-- to fully_paid, such a deal must be created with status 'fully_paid' rather
-- than the default 'pending'.
-- ---------------------------------------------------------------------------

create function public.validate_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead_customer_id text;
  v_lead_property_id text;
  v_lead_status public.lead_status;
  v_paid numeric(14, 2);
  v_derived_status public.deal_status;
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id then
      raise exception 'Deal IDs cannot be changed'
        using errcode = 'P0005';
    end if;

    if new.created_at is distinct from old.created_at then
      raise exception 'Deal creation timestamps cannot be changed'
        using errcode = 'P0005';
    end if;

    if new.lead_id is distinct from old.lead_id
       or new.customer_id is distinct from old.customer_id
       or new.property_id is distinct from old.property_id then
      raise exception 'Deal enquiry, customer and property cannot be changed'
        using errcode = 'P0005';
    end if;

    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'Cancelled deals cannot be reopened'
        using errcode = 'P0005';
    end if;

    -- The lead is intentionally not consulted on update. Its customer,
    -- property and status may have changed since the deal was created, and the
    -- deal must remain maintainable while retaining its original associations.
  else
    select l.customer_id, l.property_id, l.status
    into v_lead_customer_id, v_lead_property_id, v_lead_status
    from public.leads l
    where l.id = new.lead_id;

    if not found then
      raise exception 'Deal lead does not exist'
        using errcode = 'P0005';
    end if;

    if v_lead_customer_id is null or v_lead_property_id is null then
      raise exception 'Deals require a lead with a customer and property'
        using errcode = 'P0005';
    end if;

    if new.customer_id <> v_lead_customer_id
       or new.property_id <> v_lead_property_id then
      raise exception 'Deal customer and property must match the lead'
        using errcode = 'P0005';
    end if;

    if v_lead_status <> 'converted' then
      raise exception 'Deals require a converted lead'
        using errcode = 'P0005';
    end if;
  end if;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.brokerage_payments p
  where p.deal_id = new.id;

  if new.agreed_brokerage >= 0
     and v_paid > new.agreed_brokerage then
    raise exception 'Collected brokerage exceeds the agreed amount'
      using errcode = 'P0006';
  end if;

  if new.status = 'cancelled' then
    if tg_op = 'UPDATE'
       and old.status <> 'cancelled'
       and v_paid > 0 then
      raise exception 'Deals with payments cannot be cancelled'
        using errcode = 'P0005';
    end if;

    return new;
  end if;

  v_derived_status := case
    when v_paid >= new.agreed_brokerage
      then 'fully_paid'::public.deal_status
    when v_paid > 0
      then 'partially_paid'::public.deal_status
    else 'pending'::public.deal_status
  end;

  if new.status <> v_derived_status then
    raise exception 'Deal status is derived from brokerage payments'
      using errcode = 'P0005';
  end if;

  return new;
end;
$$;

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create trigger deals_validate_relationship
  before insert or update on public.deals
  for each row execute function public.validate_deal();

-- ---------------------------------------------------------------------------
-- 7. Payment integrity
--
-- The insert trigger takes a row lock on the parent deal before summing valid
-- payments. Concurrent inserts for the same deal therefore serialize, and a
-- payment that would overpay is rejected even when two submissions fit
-- individually. The sum is a separate statement after the lock is acquired, so
-- it sees payments committed by the transaction that held the lock before it.
--
-- The after-insert trigger refreshes the stored payment status for reporting.
-- The deal validation trigger rechecks that derived status in the same
-- transaction. Direct manual status changes below the collected total fail.
-- ---------------------------------------------------------------------------

create function public.validate_brokerage_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agreed numeric(14, 2);
  v_status public.deal_status;
  v_paid numeric(14, 2);
begin
  if new.amount <= 0 then
    raise exception 'Payment amount must be greater than zero'
      using errcode = 'P0006';
  end if;

  select d.agreed_brokerage, d.status
  into v_agreed, v_status
  from public.deals d
  where d.id = new.deal_id
  for update;

  if not found then
    raise exception 'Deal does not exist'
      using errcode = 'P0006';
  end if;

  if v_status = 'cancelled' then
    raise exception 'Payments cannot be recorded against a cancelled deal'
      using errcode = 'P0006';
  end if;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.brokerage_payments p
  where p.deal_id = new.deal_id;

  if v_paid + new.amount > v_agreed then
    raise exception 'Payment exceeds the agreed brokerage'
      using errcode = 'P0006';
  end if;

  return new;
end;
$$;

create function public.apply_brokerage_payment_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agreed numeric(14, 2);
  v_status public.deal_status;
  v_paid numeric(14, 2);
  v_derived_status public.deal_status;
begin
  select d.agreed_brokerage, d.status
  into v_agreed, v_status
  from public.deals d
  where d.id = new.deal_id;

  if not found or v_status = 'cancelled' then
    return null;
  end if;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.brokerage_payments p
  where p.deal_id = new.deal_id;

  v_derived_status := case
    when v_paid >= v_agreed
      then 'fully_paid'::public.deal_status
    when v_paid > 0
      then 'partially_paid'::public.deal_status
    else 'pending'::public.deal_status
  end;

  if v_status <> v_derived_status then
    update public.deals
    set status = v_derived_status
    where id = new.deal_id;
  end if;

  return null;
end;
$$;

create function public.prevent_brokerage_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Brokerage payments are append-only; record a reversal instead'
    using errcode = 'P0007';
end;
$$;

create trigger brokerage_payments_validate_insert
  before insert on public.brokerage_payments
  for each row execute function public.validate_brokerage_payment();

create trigger brokerage_payments_apply_status
  after insert on public.brokerage_payments
  for each row execute function public.apply_brokerage_payment_status();

create trigger brokerage_payments_append_only
  before update or delete on public.brokerage_payments
  for each row execute function public.prevent_brokerage_payment_mutation();

-- Trigger functions run only as triggers. They are security-definer functions
-- owned by the migration/table-owner role, with an empty search path. Browser
-- roles receive execute only because the trigger invocation checks it; the
-- trigger return type prevents a useful direct call.
alter function public.validate_deal() owner to postgres;
alter function public.validate_brokerage_payment() owner to postgres;
alter function public.apply_brokerage_payment_status() owner to postgres;
alter function public.prevent_brokerage_payment_mutation() owner to postgres;

revoke all on function public.validate_deal()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_brokerage_payment()
  from public, anon, authenticated, service_role;
revoke all on function public.apply_brokerage_payment_status()
  from public, anon, authenticated, service_role;
revoke all on function public.prevent_brokerage_payment_mutation()
  from public, anon, authenticated, service_role;

grant execute on function public.validate_deal()
  to authenticated, service_role;
grant execute on function public.validate_brokerage_payment()
  to authenticated, service_role;
grant execute on function public.apply_brokerage_payment_status()
  to authenticated, service_role;
grant execute on function public.prevent_brokerage_payment_mutation()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Row Level Security and grants
--
-- Both tables contain confidential financial data. Anonymous users receive no
-- access. Authenticated brokers can read deals and payments and write through
-- broker RLS; deal updates are limited to mutable columns. No browser or
-- service role receives DELETE on deals or payments. Payments receive no UPDATE
-- grant, and the append-only trigger protects history from privileged direct
-- edits as well.
-- ---------------------------------------------------------------------------

alter table public.deals enable row level security;
alter table public.brokerage_payments enable row level security;

create policy deals_broker_select
  on public.deals
  for select
  to authenticated
  using (public.is_broker());

create policy deals_broker_insert
  on public.deals
  for insert
  to authenticated
  with check (public.is_broker());

create policy deals_broker_update
  on public.deals
  for update
  to authenticated
  using (public.is_broker())
  with check (public.is_broker());

create policy brokerage_payments_broker_select
  on public.brokerage_payments
  for select
  to authenticated
  using (public.is_broker());

create policy brokerage_payments_broker_insert
  on public.brokerage_payments
  for insert
  to authenticated
  with check (public.is_broker());

revoke all on public.deals from public, anon, authenticated;
revoke delete, truncate on public.deals from service_role;
grant select, insert on public.deals to authenticated;
grant update (
  transaction_amount,
  expected_brokerage,
  agreed_brokerage,
  invoice_number,
  closing_date,
  status,
  notes
) on public.deals to authenticated;

revoke all on public.brokerage_payments from public, anon, authenticated;
revoke update, delete, truncate on public.brokerage_payments from service_role;
grant select, insert on public.brokerage_payments to authenticated;

revoke all on sequence public.deal_id_seq
  from public, anon, authenticated;
revoke all on sequence public.brokerage_payment_id_seq
  from public, anon, authenticated;
grant usage on sequence public.deal_id_seq to authenticated;
grant usage on sequence public.brokerage_payment_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Reporting foundation
--
-- security_invoker keeps deal, customer, property and payment RLS in force.
-- Monthly collections are grouped by the payment date in Asia/Kolkata, never
-- by the deal closing date, so a payment collected in a later month appears in
-- that later month.
-- ---------------------------------------------------------------------------

create view public.broker_deal_summary
with (security_invoker = true)
as
select
  d.id,
  d.lead_id,
  d.customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  d.property_id,
  p.title as property_title,
  d.transaction_amount,
  d.expected_brokerage,
  d.agreed_brokerage,
  coalesce(pay.collected_brokerage, 0)::numeric(14, 2)
    as collected_brokerage,
  (d.agreed_brokerage - coalesce(pay.collected_brokerage, 0))::numeric(14, 2)
    as pending_brokerage,
  coalesce(pay.payment_count, 0)::bigint as payment_count,
  pay.latest_payment_at,
  'INR'::text as currency,
  d.invoice_number,
  d.closing_date,
  d.status,
  d.notes,
  d.created_at,
  d.updated_at
from public.deals d
join public.customers c on c.id = d.customer_id
join public.properties p on p.id = d.property_id
left join lateral (
  select
    sum(bp.amount) as collected_brokerage,
    count(*) as payment_count,
    max(bp.payment_date) as latest_payment_at
  from public.brokerage_payments bp
  where bp.deal_id = d.id
) pay on true;

create view public.broker_brokerage_monthly
with (security_invoker = true)
as
select
  date_trunc(
    'month',
    bp.payment_date at time zone 'Asia/Kolkata'
  )::date as collection_month,
  'INR'::text as currency,
  sum(bp.amount)::numeric(14, 2) as collected_brokerage,
  count(*)::bigint as payment_count,
  count(distinct bp.deal_id)::bigint as deal_count
from public.brokerage_payments bp
group by 1, 2;

revoke all on public.broker_deal_summary
  from public, anon, authenticated;
grant select on public.broker_deal_summary to authenticated;

revoke all on public.broker_brokerage_monthly
  from public, anon, authenticated;
grant select on public.broker_brokerage_monthly to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Documentation attached to the schema
-- ---------------------------------------------------------------------------

comment on table public.deals
  is 'One finalized property transaction per converted lead. Amounts are INR. Actual collections are stored only in brokerage_payments.';

comment on column public.deals.lead_id
  is 'Converted lead that originated the deal; unique so a lead cannot have two deals.';

comment on column public.deals.expected_brokerage
  is 'Initial brokerage estimate; not money collected.';

comment on column public.deals.agreed_brokerage
  is 'Final agreed brokerage commitment; not money collected.';

comment on column public.deals.status
  is 'Derived from payment totals except cancelled. Cancellation is explicit, requires no payments, and cannot be reopened.';

comment on table public.brokerage_payments
  is 'Append-only actual brokerage collections in INR. Update and delete are blocked; a future reversal/void design is required for corrections.';

comment on column public.brokerage_payments.payment_method
  is 'Initial collection methods: cash, upi, bank_transfer, cheque or other.';

comment on column public.brokerage_payments.receipt_number
  is 'Optional receipt reference. Not unique in Phase 1 because one receipt may cover more than one installment.';

comment on column public.brokerage_payments.payment_date
  is 'Actual collection timestamp. Monthly revenue reporting uses this field, not deals.closing_date.';

comment on view public.broker_deal_summary
  is 'Broker-only per-deal ledger summary. security_invoker keeps deal, customer, property and payment RLS in force.';

comment on view public.broker_brokerage_monthly
  is 'Broker-only monthly collections grouped by brokerage_payments.payment_date in Asia/Kolkata, not by closing date.';

comment on function public.validate_deal()
  is 'Creates a deal only for a converted lead with a matching customer and property, freezes those associations, and keeps identity and derived payment status consistent on update without re-reading the lead.';

comment on function public.validate_brokerage_payment()
  is 'Locks the parent deal and rejects cancelled-deal payments and overpayment before a payment is stored.';

comment on function public.apply_brokerage_payment_status()
  is 'Refreshes the stored non-cancelled deal payment status after a payment insert.';
