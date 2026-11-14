-- Chennai Real Estates
-- Brokerage accounting verification.
--
-- Run only against a disposable local or staging Supabase database with all
-- migrations and seed data applied. Do not run against production.
--
-- This script uses only SQL (no psql meta-commands), so it can be pasted into
-- the Supabase SQL Editor. It creates records and rolls the whole transaction
-- back. Sequences can still be consumed by rolled-back calls.
--
-- Run as the migration/table owner (postgres in Supabase). The script does not
-- modify pre-existing customers, leads, properties, deals or payments.
--
-- Concurrency: this script is sequential, not a real multi-session test. The
-- payment insert trigger takes a row lock on the parent deal before summing
-- existing payments, so concurrent payment submissions for the same deal
-- serialize under the Supabase default READ COMMITTED isolation level. To test
-- that separately, open two sessions, start a transaction in each, insert
-- payments that fit individually but overpay together, and confirm the second
-- session waits and then fails with SQLSTATE P0006 after the first commits.

begin;

-- ---------------------------------------------------------------------------
-- 1. Schema, constraints, triggers, RLS, grants and reporting views
-- ---------------------------------------------------------------------------

do $$
declare
  v_view_options text[];
begin
  if to_regclass('public.deals') is null then
    raise exception 'FAIL: public.deals does not exist';
  end if;
  if to_regclass('public.brokerage_payments') is null then
    raise exception 'FAIL: public.brokerage_payments does not exist';
  end if;
  if to_regtype('public.deal_status') is null then
    raise exception 'FAIL: public.deal_status enum is missing';
  end if;
  if to_regtype('public.payment_method') is null then
    raise exception 'FAIL: public.payment_method enum is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_lead_id_key' and contype = 'u'
  ) then
    raise exception 'FAIL: deals.lead_id uniqueness is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deals'
      and column_name = 'transaction_amount'
      and data_type = 'numeric' and numeric_precision = 14 and numeric_scale = 2
  ) then
    raise exception 'FAIL: deals.transaction_amount is not numeric(14,2)';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deals'
      and column_name = 'agreed_brokerage'
      and data_type = 'numeric' and numeric_precision = 14 and numeric_scale = 2
  ) then
    raise exception 'FAIL: deals.agreed_brokerage is not numeric(14,2)';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'brokerage_payments'
      and column_name = 'amount'
      and data_type = 'numeric' and numeric_precision = 14 and numeric_scale = 2
  ) then
    raise exception 'FAIL: brokerage_payments.amount is not numeric(14,2)';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'brokerage_payments'
      and column_name = 'payment_date' and is_nullable = 'NO'
  ) then
    raise exception 'FAIL: brokerage_payments.payment_date must be required';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'deals'
      and column_name = 'collected_brokerage'
  ) then
    raise exception 'FAIL: deals must not store a manual collected_brokerage';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_transaction_amount_positive'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_expected_brokerage_non_negative'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_agreed_brokerage_non_negative'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_agreed_brokerage_within_transaction'
  ) then
    raise exception 'FAIL: deal financial check constraints are incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_payments'::regclass
      and conname = 'brokerage_payments_amount_positive'
  ) then
    raise exception 'FAIL: payment amount check is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_lead_id_fkey'
      and confrelid = 'public.leads'::regclass
      and confdeltype = 'r'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_customer_id_fkey'
      and confrelid = 'public.customers'::regclass
      and confdeltype = 'r'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_property_id_fkey'
      and confrelid = 'public.properties'::regclass
      and confdeltype = 'r'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.brokerage_payments'::regclass
      and conname = 'brokerage_payments_deal_id_fkey'
      and confrelid = 'public.deals'::regclass
      and confdeltype = 'r'
  ) then
    raise exception 'FAIL: deal/payment foreign keys or delete restrictions are missing';
  end if;

  if to_regclass('public.deals_customer_idx') is null
     or to_regclass('public.deals_property_idx') is null
     or to_regclass('public.deals_closing_date_idx') is null
     or to_regclass('public.deals_status_idx') is null
     or to_regclass('public.brokerage_payments_deal_paid_idx') is null
     or to_regclass('public.brokerage_payments_payment_date_idx') is null then
    raise exception 'FAIL: deal or payment index is missing';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.deals'::regclass
      and tgname = 'deals_validate_relationship' and tgenabled <> 'D'
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.brokerage_payments'::regclass
      and tgname = 'brokerage_payments_validate_insert' and tgenabled <> 'D'
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.brokerage_payments'::regclass
      and tgname = 'brokerage_payments_apply_status' and tgenabled <> 'D'
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.brokerage_payments'::regclass
      and tgname = 'brokerage_payments_append_only' and tgenabled <> 'D'
  ) then
    raise exception 'FAIL: deal or payment trigger is missing';
  end if;

  if not exists (
    select 1 from pg_proc
    where oid = 'public.validate_deal()'::regprocedure
      and prosecdef
      and array_to_string(proconfig, ',') = 'search_path=""'
      and pg_get_userbyid(proowner) = 'postgres'
  ) or not exists (
    select 1 from pg_proc
    where oid = 'public.validate_brokerage_payment()'::regprocedure
      and prosecdef
      and array_to_string(proconfig, ',') = 'search_path=""'
      and pg_get_userbyid(proowner) = 'postgres'
  ) or not exists (
    select 1 from pg_proc
    where oid = 'public.apply_brokerage_payment_status()'::regprocedure
      and prosecdef
      and array_to_string(proconfig, ',') = 'search_path=""'
      and pg_get_userbyid(proowner) = 'postgres'
  ) or not exists (
    select 1 from pg_proc
    where oid = 'public.prevent_brokerage_payment_mutation()'::regprocedure
      and prosecdef
      and array_to_string(proconfig, ',') = 'search_path=""'
      and pg_get_userbyid(proowner) = 'postgres'
  ) then
    raise exception 'FAIL: integrity trigger security configuration is wrong';
  end if;

  if not exists (
    select 1 from pg_class
    where oid = 'public.deals'::regclass and relrowsecurity
  ) or not exists (
    select 1 from pg_class
    where oid = 'public.brokerage_payments'::regclass and relrowsecurity
  ) then
    raise exception 'FAIL: financial table RLS is not enabled';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'deals'
      and policyname = 'deals_broker_select'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'deals'
      and policyname = 'deals_broker_insert'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'deals'
      and policyname = 'deals_broker_update'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brokerage_payments'
      and policyname = 'brokerage_payments_broker_select'
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brokerage_payments'
      and policyname = 'brokerage_payments_broker_insert'
  ) then
    raise exception 'FAIL: broker RLS policy is missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('deals', 'brokerage_payments')
      and cmd = 'DELETE'
  ) then
    raise exception 'FAIL: a delete policy exists on a financial table';
  end if;

  if has_table_privilege('anon', 'public.deals', 'select')
     or has_table_privilege('anon', 'public.deals', 'insert')
     or has_table_privilege('anon', 'public.deals', 'update')
     or has_table_privilege('anon', 'public.deals', 'delete')
     or has_table_privilege('anon', 'public.brokerage_payments', 'select')
     or has_table_privilege('anon', 'public.brokerage_payments', 'insert')
     or has_table_privilege('anon', 'public.brokerage_payments', 'update')
     or has_table_privilege('anon', 'public.brokerage_payments', 'delete') then
    raise exception 'FAIL: anonymous financial table privilege leaked';
  end if;

  if not has_table_privilege('authenticated', 'public.deals', 'select')
     or not has_table_privilege('authenticated', 'public.deals', 'insert')
     or has_table_privilege('authenticated', 'public.deals', 'delete')
     or not has_column_privilege('authenticated', 'public.deals', 'status', 'update')
     or not has_column_privilege('authenticated', 'public.deals', 'agreed_brokerage', 'update')
     or has_column_privilege('authenticated', 'public.deals', 'id', 'update')
     or has_column_privilege('authenticated', 'public.deals', 'lead_id', 'update')
     or has_column_privilege('authenticated', 'public.deals', 'customer_id', 'update')
     or has_column_privilege('authenticated', 'public.deals', 'property_id', 'update')
     or has_column_privilege('authenticated', 'public.deals', 'created_at', 'update') then
    raise exception 'FAIL: broker deal grants are not least-privilege';
  end if;

  if not has_table_privilege('authenticated', 'public.brokerage_payments', 'select')
     or not has_table_privilege('authenticated', 'public.brokerage_payments', 'insert')
     or has_table_privilege('authenticated', 'public.brokerage_payments', 'update')
     or has_table_privilege('authenticated', 'public.brokerage_payments', 'delete') then
    raise exception 'FAIL: broker payment grants are too broad';
  end if;

  if has_table_privilege('service_role', 'public.deals', 'delete')
     or has_table_privilege('service_role', 'public.deals', 'truncate')
     or has_table_privilege('service_role', 'public.brokerage_payments', 'update')
     or has_table_privilege('service_role', 'public.brokerage_payments', 'delete')
     or has_table_privilege('service_role', 'public.brokerage_payments', 'truncate') then
    raise exception 'FAIL: service_role financial history privilege leaked';
  end if;

  if has_sequence_privilege('anon', 'public.deal_id_seq', 'usage')
     or has_sequence_privilege('anon', 'public.brokerage_payment_id_seq', 'usage')
     or not has_sequence_privilege('authenticated', 'public.deal_id_seq', 'usage')
     or not has_sequence_privilege('authenticated', 'public.brokerage_payment_id_seq', 'usage') then
    raise exception 'FAIL: financial sequence grants are wrong';
  end if;

  if has_function_privilege('anon', 'public.validate_deal()', 'execute')
     or not has_function_privilege('authenticated', 'public.validate_deal()', 'execute')
     or has_function_privilege('anon', 'public.validate_brokerage_payment()', 'execute')
     or not has_function_privilege('authenticated', 'public.validate_brokerage_payment()', 'execute') then
    raise exception 'FAIL: integrity trigger execute grants are wrong';
  end if;

  if to_regclass('public.broker_deal_summary') is null
     or to_regclass('public.broker_brokerage_monthly') is null then
    raise exception 'FAIL: reporting view is missing';
  end if;

  select reloptions into v_view_options
  from pg_class where oid = 'public.broker_deal_summary'::regclass;
  if v_view_options is null
     or not ('security_invoker=true' = any(v_view_options)) then
    raise exception 'FAIL: broker_deal_summary is not security_invoker';
  end if;

  select reloptions into v_view_options
  from pg_class where oid = 'public.broker_brokerage_monthly'::regclass;
  if v_view_options is null
     or not ('security_invoker=true' = any(v_view_options)) then
    raise exception 'FAIL: broker_brokerage_monthly is not security_invoker';
  end if;

  if has_table_privilege('anon', 'public.broker_deal_summary', 'select')
     or has_table_privilege('anon', 'public.broker_brokerage_monthly', 'select')
     or not has_table_privilege('authenticated', 'public.broker_deal_summary', 'select')
     or not has_table_privilege('authenticated', 'public.broker_brokerage_monthly', 'select') then
    raise exception 'FAIL: reporting view grants are wrong';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Disposable test fixtures
--
-- All fixtures are created inside this transaction and are not committed. The
-- script uses existing properties only; it requires seed data and at least two
-- properties.
-- ---------------------------------------------------------------------------

do $$
declare
  v_customer text;
  v_customer_other text;
  v_property text;
  v_property_other text;
  v_lead_main text;
  v_lead_nonconverted text;
  v_lead_cancel text;
  v_lead_broker text;
  v_lead_monthly text;
  v_lead_finance text;
  v_lead_unlinked text;
  v_lead_no_property text;
  v_lead_rls text;
  v_lead_drift text;
  v_lead_zero text;
  v_deal_main text;
  v_deal_cancel text;
  v_deal_monthly text;
  v_deal_rls text;
  v_deal_drift text;
  v_deal_zero text;
begin
  if exists (
    select 1 from public.customers
    where normalized_phone in ('999000990001', '999000990002')
  ) or exists (
    select 1 from public.leads
    where public.normalize_customer_phone(phone)
      in ('999000990001', '999000990002')
  ) then
    raise exception 'FAIL: brokerage test phone already exists; choose unused fixtures';
  end if;

  select id into v_property
  from public.properties
  where status in ('available', 'under-offer')
  order by id
  limit 1;

  if v_property is null then
    raise exception 'A public test property is required';
  end if;

  select id into v_property_other
  from public.properties
  where id <> v_property
  order by id
  limit 1;

  if v_property_other is null then
    raise exception 'A second test property is required';
  end if;

  insert into public.customers (name, phone, email)
  values (
    'Brokerage Test Customer',
    '999000990001',
    'brokerage.test@example.test'
  )
  returning id into v_customer;

  insert into public.customers (name, phone, email)
  values ('Brokerage Other Customer', '999000990002', null)
  returning id into v_customer_other;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Test Customer',
    '999000990001',
    null,
    'A valid converted lead for the brokerage accounting test.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_main;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Non-converted Customer',
    '999000990003',
    null,
    'A valid but non-converted lead for the brokerage accounting test.',
    v_property,
    v_customer,
    'contacted',
    'property-enquiry',
    false
  )
  returning id into v_lead_nonconverted;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Cancel Customer',
    '999000990004',
    null,
    'A valid converted lead used to verify cancellation rules.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_cancel;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Broker Customer',
    '999000990005',
    null,
    'A valid converted lead used to verify broker RLS writes.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_broker;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Monthly Customer',
    '999000990006',
    null,
    'A valid converted lead used to verify monthly payment reporting.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_monthly;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Finance Customer',
    '999000990007',
    null,
    'A valid converted lead used to verify financial constraints.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_finance;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Unlinked Customer',
    '999000990008',
    null,
    'A valid converted lead with no customer link for the brokerage test.',
    v_property,
    null,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_unlinked;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage General Customer',
    '999000990009',
    null,
    'A valid converted general lead with no property for the brokerage test.',
    null,
    v_customer,
    'converted',
    'website-form',
    false
  )
  returning id into v_lead_no_property;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage RLS Customer',
    '999000990010',
    null,
    'A valid converted lead used to verify payment RLS.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_rls;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Drift Customer',
    '999000990011',
    null,
    'A valid converted lead whose associations change after the deal exists.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_drift;

  insert into public.leads (
    name, phone, email, message, property_id, customer_id, status, source, is_demo
  )
  values (
    'Brokerage Zero Customer',
    '999000990012',
    null,
    'A valid converted lead used to verify a zero agreed brokerage deal.',
    v_property,
    v_customer,
    'converted',
    'property-enquiry',
    false
  )
  returning id into v_lead_zero;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount, expected_brokerage,
    agreed_brokerage, invoice_number, closing_date, status, notes
  )
  values (
    v_lead_main, v_customer, v_property, 5000000, 100000,
    120000, 'INV-TEST-001', date '2026-10-15', 'pending',
    'Brokerage accounting test deal.'
  )
  returning id into v_deal_main;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount, expected_brokerage,
    agreed_brokerage, invoice_number, closing_date, status, notes
  )
  values (
    v_lead_cancel, v_customer, v_property, 100000, null,
    1000, null, date '2026-10-16', 'pending',
    'Cancellation test deal.'
  )
  returning id into v_deal_cancel;

  update public.deals
  set status = 'cancelled'
  where id = v_deal_cancel;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount, expected_brokerage,
    agreed_brokerage, invoice_number, closing_date, status, notes
  )
  values (
    v_lead_monthly, v_customer, v_property, 100000, null,
    1000, null, date '2199-10-15', 'pending',
    'Monthly reporting test deal.'
  )
  returning id into v_deal_monthly;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount, expected_brokerage,
    agreed_brokerage, invoice_number, closing_date, status, notes
  )
  values (
    v_lead_rls, v_customer, v_property, 100000, null,
    1000, null, date '2026-10-17', 'pending',
    'RLS test deal with room for a payment.'
  )
  returning id into v_deal_rls;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount, expected_brokerage,
    agreed_brokerage, invoice_number, closing_date, status, notes
  )
  values (
    v_lead_drift, v_customer, v_property, 1000000, null,
    10000, null, date '2026-10-18', 'pending',
    'Lead-drift regression deal.'
  )
  returning id into v_deal_drift;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount, expected_brokerage,
    agreed_brokerage, invoice_number, closing_date, status, notes
  )
  values (
    v_lead_zero, v_customer, v_property, 500000, null,
    0, null, date '2026-10-19', 'fully_paid',
    'Zero agreed brokerage regression deal.'
  )
  returning id into v_deal_zero;

  perform pg_catalog.set_config('ba_test.customer', v_customer, true);
  perform pg_catalog.set_config('ba_test.customer_other', v_customer_other, true);
  perform pg_catalog.set_config('ba_test.property', v_property, true);
  perform pg_catalog.set_config('ba_test.property_other', v_property_other, true);
  perform pg_catalog.set_config('ba_test.lead_main', v_lead_main, true);
  perform pg_catalog.set_config('ba_test.lead_nonconverted', v_lead_nonconverted, true);
  perform pg_catalog.set_config('ba_test.lead_cancel', v_lead_cancel, true);
  perform pg_catalog.set_config('ba_test.lead_broker', v_lead_broker, true);
  perform pg_catalog.set_config('ba_test.lead_monthly', v_lead_monthly, true);
  perform pg_catalog.set_config('ba_test.lead_finance', v_lead_finance, true);
  perform pg_catalog.set_config('ba_test.lead_unlinked', v_lead_unlinked, true);
  perform pg_catalog.set_config('ba_test.lead_no_property', v_lead_no_property, true);
  perform pg_catalog.set_config('ba_test.lead_rls', v_lead_rls, true);
  perform pg_catalog.set_config('ba_test.lead_drift', v_lead_drift, true);
  perform pg_catalog.set_config('ba_test.lead_zero', v_lead_zero, true);
  perform pg_catalog.set_config('ba_test.deal_main', v_deal_main, true);
  perform pg_catalog.set_config('ba_test.deal_cancel', v_deal_cancel, true);
  perform pg_catalog.set_config('ba_test.deal_monthly', v_deal_monthly, true);
  perform pg_catalog.set_config('ba_test.deal_rls', v_deal_rls, true);
  perform pg_catalog.set_config('ba_test.deal_drift', v_deal_drift, true);
  perform pg_catalog.set_config('ba_test.deal_zero', v_deal_zero, true);
end $$;

-- ---------------------------------------------------------------------------
-- 3. One deal per lead and converted-lead enforcement
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_main'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, 1000, current_date
    );
    raise exception 'FAIL: a second deal for the same lead was accepted';
  exception when unique_violation then
    null;
  end;
end $$;

do $$
begin
  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_nonconverted'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, 1000, current_date
    );
    raise exception 'FAIL: a deal for a non-converted lead was accepted';
  exception when sqlstate 'P0005' then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Lead, customer and property relationship consistency
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_main'),
      current_setting('ba_test.customer_other'),
      current_setting('ba_test.property'),
      100000, 1000, current_date
    );
    raise exception 'FAIL: a deal with a mismatched customer was accepted';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_main'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property_other'),
      100000, 1000, current_date
    );
    raise exception 'FAIL: a deal with a mismatched property was accepted';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_unlinked'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, 1000, current_date
    );
    raise exception 'FAIL: a deal linked to a lead without a customer was accepted';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_no_property'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, 1000, current_date
    );
    raise exception 'FAIL: a deal linked to a lead without a property was accepted';
  exception when sqlstate 'P0005' then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Financial amount constraints
--
-- The created status is supplied where needed so the status-derivation guard
-- does not fire before the amount check under test.
-- ---------------------------------------------------------------------------

do $$
begin
  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date, status
    )
    values (
      current_setting('ba_test.lead_finance'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      0, 0, current_date, 'fully_paid'
    );
    raise exception 'FAIL: zero transaction amount was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date, status
    )
    values (
      current_setting('ba_test.lead_finance'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      -1, 0, current_date, 'fully_paid'
    );
    raise exception 'FAIL: a negative transaction amount was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      expected_brokerage, agreed_brokerage, closing_date, status
    )
    values (
      current_setting('ba_test.lead_finance'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, -1, 0, current_date, 'fully_paid'
    );
    raise exception 'FAIL: a negative expected brokerage was accepted';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date, status
    )
    values (
      current_setting('ba_test.lead_finance'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, -1, current_date, 'fully_paid'
    );
    raise exception 'FAIL: a negative agreed brokerage was accepted';
  exception when check_violation or sqlstate 'P0006' then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date, status
    )
    values (
      current_setting('ba_test.lead_finance'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, 100001, current_date, 'pending'
    );
    raise exception 'FAIL: agreed brokerage above the transaction amount was accepted';
  exception when check_violation then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Partial payments, derived status and totals
-- ---------------------------------------------------------------------------

do $$
declare
  v_deal text := current_setting('ba_test.deal_main');
  v_payment text;
begin
  insert into public.brokerage_payments (
    deal_id, amount, payment_date, payment_method, receipt_number,
    payment_reference, notes
  )
  values (
    v_deal, 40000, timestamptz '2026-11-01 10:00:00+05:30', 'upi',
    'RCPT-TEST-001', 'UPI-TEST-001', 'First installment'
  )
  returning id into v_payment;
  perform pg_catalog.set_config('ba_test.payment1', v_payment, true);

  insert into public.brokerage_payments (
    deal_id, amount, payment_date, payment_method, receipt_number,
    payment_reference, notes
  )
  values (
    v_deal, 30000, timestamptz '2026-11-02 11:00:00+05:30', 'bank_transfer',
    'RCPT-TEST-002', 'BANK-TEST-002', 'Second installment'
  )
  returning id into v_payment;
  perform pg_catalog.set_config('ba_test.payment2', v_payment, true);

  if (select coalesce(sum(amount), 0)
      from public.brokerage_payments where deal_id = v_deal) is distinct from 70000 then
    raise exception 'FAIL: partial payment total is incorrect';
  end if;

  if (select status from public.deals where id = v_deal) is distinct from 'partially_paid' then
    raise exception 'FAIL: deal status is not partially_paid after two installments';
  end if;

  if (select collected_brokerage from public.broker_deal_summary
      where id = v_deal) is distinct from 70000 then
    raise exception 'FAIL: summary collected brokerage is incorrect';
  end if;

  if (select pending_brokerage from public.broker_deal_summary
      where id = v_deal) is distinct from 50000 then
    raise exception 'FAIL: summary pending brokerage is incorrect';
  end if;

  if (select payment_count from public.broker_deal_summary
      where id = v_deal) is distinct from 2 then
    raise exception 'FAIL: summary payment count is incorrect';
  end if;
end $$;

-- Manual status changes cannot claim full payment before the payments match,
-- and the agreed amount cannot be reduced below the collected total.
do $$
begin
  begin
    update public.deals
    set status = 'fully_paid'
    where id = current_setting('ba_test.deal_main');
    raise exception 'FAIL: a deal was marked fully paid before payments matched';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    update public.deals
    set agreed_brokerage = 60000
    where id = current_setting('ba_test.deal_main');
    raise exception 'FAIL: agreed brokerage was reduced below collected payments';
  exception when sqlstate 'P0006' then
    null;
  end;

  if (select agreed_brokerage from public.deals
      where id = current_setting('ba_test.deal_main')) is distinct from 120000 then
    raise exception 'FAIL: a rejected agreed-brokerage update changed the deal';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Overpayment, invalid method and final settlement
-- ---------------------------------------------------------------------------

do $$
declare
  v_deal text := current_setting('ba_test.deal_main');
  v_payment text;
begin
  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method, receipt_number
    )
    values (
      v_deal, 50001, timestamptz '2026-11-04 09:00:00+05:30', 'upi',
      'RCPT-TEST-OVERPAY'
    );
    raise exception 'FAIL: an overpaying installment was accepted';
  exception when sqlstate 'P0006' then
    null;
  end;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      v_deal, 1000, timestamptz '2026-11-04 09:30:00+05:30', 'bitcoin'
    );
    raise exception 'FAIL: an invalid payment method was accepted';
  exception when invalid_text_representation then
    null;
  end;

  insert into public.brokerage_payments (
    deal_id, amount, payment_date, payment_method, receipt_number,
    payment_reference, notes
  )
  values (
    v_deal, 50000, timestamptz '2026-11-03 12:00:00+05:30', 'cash',
    'RCPT-TEST-003', null, 'Final installment'
  )
  returning id into v_payment;
  perform pg_catalog.set_config('ba_test.payment3', v_payment, true);

  if (select status from public.deals where id = v_deal) is distinct from 'fully_paid' then
    raise exception 'FAIL: deal is not fully_paid after the final installment';
  end if;

  if (select collected_brokerage from public.broker_deal_summary
      where id = v_deal) is distinct from 120000 then
    raise exception 'FAIL: fully paid collected total is incorrect';
  end if;

  if (select pending_brokerage from public.broker_deal_summary
      where id = v_deal) is distinct from 0 then
    raise exception 'FAIL: fully paid pending brokerage is not zero';
  end if;

  if (select payment_count from public.broker_deal_summary
      where id = v_deal) is distinct from 3 then
    raise exception 'FAIL: fully paid payment count is incorrect';
  end if;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      v_deal, 1, timestamptz '2026-11-04 10:00:00+05:30', 'upi'
    );
    raise exception 'FAIL: a payment was accepted after full settlement';
  exception when sqlstate 'P0006' then
    null;
  end;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      v_deal, 0, timestamptz '2026-11-04 10:00:00+05:30', 'upi'
    );
    raise exception 'FAIL: a zero payment was accepted';
  exception when sqlstate 'P0006' then
    null;
  end;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      v_deal, -1, timestamptz '2026-11-04 10:00:00+05:30', 'upi'
    );
    raise exception 'FAIL: a negative payment was accepted';
  exception when sqlstate 'P0006' then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Append-only payments and referential history protection
-- ---------------------------------------------------------------------------

do $$
declare
  v_deal text := current_setting('ba_test.deal_main');
  v_payment text := current_setting('ba_test.payment1');
  v_before_count bigint;
  v_before_total numeric;
  v_before_amount numeric;
begin
  select count(*), coalesce(sum(amount), 0)
  into v_before_count, v_before_total
  from public.brokerage_payments
  where deal_id = v_deal;

  select amount into v_before_amount
  from public.brokerage_payments
  where id = v_payment;

  begin
    update public.brokerage_payments
    set amount = amount + 1
    where id = v_payment;
    raise exception 'FAIL: a brokerage payment was updated';
  exception when sqlstate 'P0007' then
    null;
  end;

  begin
    delete from public.brokerage_payments
    where id = v_payment;
    raise exception 'FAIL: a brokerage payment was deleted';
  exception when sqlstate 'P0007' then
    null;
  end;

  if not exists (
    select 1 from public.brokerage_payments where id = v_payment
  ) then
    raise exception 'FAIL: a payment row disappeared after a blocked mutation';
  end if;

  if (select amount from public.brokerage_payments where id = v_payment)
     is distinct from v_before_amount then
    raise exception 'FAIL: a blocked payment update changed the stored amount';
  end if;

  if (select count(*) from public.brokerage_payments where deal_id = v_deal)
     <> v_before_count
     or (select coalesce(sum(amount), 0)
         from public.brokerage_payments where deal_id = v_deal)
        <> v_before_total then
    raise exception 'FAIL: payment history changed after blocked mutations';
  end if;

  -- Identity and association fields are immutable even for the owner.
  begin
    update public.deals
    set lead_id = current_setting('ba_test.lead_rls')
    where id = v_deal;
    raise exception 'FAIL: a deal lead association was changed';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    update public.deals
    set created_at = created_at - interval '1 day'
    where id = v_deal;
    raise exception 'FAIL: a deal creation timestamp was changed';
  exception when sqlstate 'P0005' then
    null;
  end;

  -- A payment must carry an explicit collection timestamp.
  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_method
    )
    values (current_setting('ba_test.deal_rls'), 10, 'cash');
    raise exception 'FAIL: a payment without a payment date was accepted';
  exception when not_null_violation then
    null;
  end;

  -- Deleting a deal with payment history is blocked by the payment foreign key.
  begin
    delete from public.deals where id = v_deal;
    raise exception 'FAIL: a deal with payments was deleted';
  exception when foreign_key_violation then
    null;
  end;

  -- Deleting financial parents is restricted rather than cascading.
  begin
    delete from public.leads where id = current_setting('ba_test.lead_main');
    raise exception 'FAIL: a lead with a deal was deleted';
  exception when foreign_key_violation then
    null;
  end;

  begin
    delete from public.customers where id = current_setting('ba_test.customer');
    raise exception 'FAIL: a customer with deals was deleted';
  exception when foreign_key_violation then
    null;
  end;

  begin
    delete from public.properties where id = current_setting('ba_test.property');
    raise exception 'FAIL: a property with a deal was deleted';
  exception when foreign_key_violation then
    null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Cancellation rules
-- ---------------------------------------------------------------------------

do $$
declare
  v_paid_deal text := current_setting('ba_test.deal_main');
  v_cancelled_deal text := current_setting('ba_test.deal_cancel');
begin
  if (select status from public.deals where id = v_cancelled_deal)
     is distinct from 'cancelled' then
    raise exception 'FAIL: the cancellation fixture is not cancelled';
  end if;

  begin
    update public.deals
    set status = 'cancelled'
    where id = v_paid_deal;
    raise exception 'FAIL: a deal with payments was cancelled';
  exception when sqlstate 'P0005' then
    null;
  end;

  if (select status from public.deals where id = v_paid_deal) is distinct from 'fully_paid' then
    raise exception 'FAIL: a rejected cancellation changed a paid deal';
  end if;

  begin
    update public.deals
    set status = 'pending'
    where id = v_cancelled_deal;
    raise exception 'FAIL: a cancelled deal was reopened';
  exception when sqlstate 'P0005' then
    null;
  end;

  if (select status from public.deals where id = v_cancelled_deal)
     is distinct from 'cancelled' then
    raise exception 'FAIL: a cancelled deal changed status after a blocked reopen';
  end if;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      v_cancelled_deal, 100, timestamptz '2026-11-06 10:00:00+05:30', 'cash'
    );
    raise exception 'FAIL: a payment was recorded against a cancelled deal';
  exception when sqlstate 'P0006' then
    null;
  end;

  if exists (
    select 1 from public.brokerage_payments where deal_id = v_cancelled_deal
  ) then
    raise exception 'FAIL: a cancelled deal received payment history';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Lead drift and zero agreed brokerage
--
-- A deal freezes the customer and property captured at creation. Editing the
-- source lead afterwards must not block deal maintenance, and the deal must
-- still be usable for notes updates and payments. A deal with zero agreed
-- brokerage is settled on creation and cannot accept any positive payment.
-- ---------------------------------------------------------------------------

do $$
declare
  v_deal text := current_setting('ba_test.deal_drift');
  v_lead text := current_setting('ba_test.lead_drift');
  v_original_customer text := current_setting('ba_test.customer');
  v_original_property text := current_setting('ba_test.property');
begin
  update public.leads
  set customer_id = current_setting('ba_test.customer_other'),
      property_id = current_setting('ba_test.property_other')
  where id = v_lead;

  if (select customer_id from public.leads where id = v_lead)
       is distinct from current_setting('ba_test.customer_other')
     or (select property_id from public.leads where id = v_lead)
       is distinct from current_setting('ba_test.property_other') then
    raise exception 'FAIL: the lead drift fixture was not updated';
  end if;

  update public.deals
  set notes = 'Note updated after the source lead changed.'
  where id = v_deal;

  if not found then
    raise exception 'FAIL: a deal update failed after the source lead changed';
  end if;

  insert into public.brokerage_payments (
    deal_id, amount, payment_date, payment_method, receipt_number, notes
  )
  values (
    v_deal, 2500, timestamptz '2026-11-07 10:00:00+05:30', 'upi',
    'RCPT-DRIFT-001', 'Payment after the source lead changed'
  );

  if (select status from public.deals where id = v_deal)
       is distinct from 'partially_paid' then
    raise exception 'FAIL: a payment did not update a deal after lead drift';
  end if;

  if (select customer_id from public.deals where id = v_deal)
       is distinct from v_original_customer
     or (select property_id from public.deals where id = v_deal)
       is distinct from v_original_property
     or (select lead_id from public.deals where id = v_deal)
       is distinct from v_lead then
    raise exception 'FAIL: lead drift changed the deal associations';
  end if;

  begin
    update public.deals
    set customer_id = current_setting('ba_test.customer_other')
    where id = v_deal;
    raise exception 'FAIL: a deal customer was changed after lead drift';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    update public.deals
    set property_id = current_setting('ba_test.property_other')
    where id = v_deal;
    raise exception 'FAIL: a deal property was changed after lead drift';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    update public.deals
    set lead_id = current_setting('ba_test.lead_rls')
    where id = v_deal;
    raise exception 'FAIL: a deal lead was changed after lead drift';
  exception when sqlstate 'P0005' then
    null;
  end;

  if (select customer_id from public.deals where id = v_deal)
       is distinct from v_original_customer
     or (select property_id from public.deals where id = v_deal)
       is distinct from v_original_property
     or (select lead_id from public.deals where id = v_deal)
       is distinct from v_lead then
    raise exception 'FAIL: a rejected association change altered the deal';
  end if;
end $$;

do $$
declare
  v_deal text := current_setting('ba_test.deal_zero');
begin
  if (select status from public.deals where id = v_deal)
       is distinct from 'fully_paid'
     or (select agreed_brokerage from public.deals where id = v_deal)
       is distinct from 0 then
    raise exception 'FAIL: a zero agreed brokerage deal was not created fully paid';
  end if;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      v_deal, 1, timestamptz '2026-11-07 11:00:00+05:30', 'cash'
    );
    raise exception 'FAIL: a zero agreed brokerage deal accepted a payment';
  exception when sqlstate 'P0006' then
    null;
  end;

  if exists (
    select 1 from public.brokerage_payments where deal_id = v_deal
  ) then
    raise exception 'FAIL: a zero agreed brokerage deal received payment history';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Monthly revenue uses payment_date, not closing_date
--
-- The deal closes in October 2199 while the payment is collected in November
-- 2199. Revenue must appear in the November bucket and not in the closing
-- month.
-- ---------------------------------------------------------------------------

do $$
declare
  v_deal text := current_setting('ba_test.deal_monthly');
  v_before_nov_collected numeric;
  v_before_nov_payments bigint;
  v_before_nov_deals bigint;
  v_before_oct_collected numeric;
  v_before_oct_payments bigint;
  v_before_oct_deals bigint;
  v_after_nov_collected numeric;
  v_after_nov_payments bigint;
  v_after_nov_deals bigint;
  v_after_oct_collected numeric;
  v_after_oct_payments bigint;
  v_after_oct_deals bigint;
begin
  select coalesce(sum(collected_brokerage), 0),
         coalesce(sum(payment_count), 0),
         coalesce(sum(deal_count), 0)
  into v_before_nov_collected, v_before_nov_payments, v_before_nov_deals
  from public.broker_brokerage_monthly
  where collection_month = date '2199-11-01';

  select coalesce(sum(collected_brokerage), 0),
         coalesce(sum(payment_count), 0),
         coalesce(sum(deal_count), 0)
  into v_before_oct_collected, v_before_oct_payments, v_before_oct_deals
  from public.broker_brokerage_monthly
  where collection_month = date '2199-10-01';

  insert into public.brokerage_payments (
    deal_id, amount, payment_date, payment_method, receipt_number, notes
  )
  values (
    v_deal, 1000, timestamptz '2199-11-05 10:00:00+05:30', 'upi',
    'RCPT-MONTH-001', 'Collected a month after closing'
  );

  if (select status from public.deals where id = v_deal) is distinct from 'fully_paid' then
    raise exception 'FAIL: the monthly test deal is not fully paid';
  end if;

  select coalesce(sum(collected_brokerage), 0),
         coalesce(sum(payment_count), 0),
         coalesce(sum(deal_count), 0)
  into v_after_nov_collected, v_after_nov_payments, v_after_nov_deals
  from public.broker_brokerage_monthly
  where collection_month = date '2199-11-01';

  if v_after_nov_collected - v_before_nov_collected <> 1000 then
    raise exception 'FAIL: monthly revenue did not use the payment date';
  end if;

  if v_after_nov_payments - v_before_nov_payments <> 1
     or v_after_nov_deals - v_before_nov_deals <> 1 then
    raise exception 'FAIL: monthly payment or deal counts did not increase by one';
  end if;

  select coalesce(sum(collected_brokerage), 0),
         coalesce(sum(payment_count), 0),
         coalesce(sum(deal_count), 0)
  into v_after_oct_collected, v_after_oct_payments, v_after_oct_deals
  from public.broker_brokerage_monthly
  where collection_month = date '2199-10-01';

  if v_after_oct_collected <> v_before_oct_collected
     or v_after_oct_payments <> v_before_oct_payments
     or v_after_oct_deals <> v_before_oct_deals then
    raise exception 'FAIL: revenue was incorrectly grouped by the closing month';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 12. Anonymous access
-- ---------------------------------------------------------------------------

set local role anon;

do $$
begin
  begin
    perform 1 from public.deals limit 1;
    raise exception 'FAIL: anonymous caller read deals';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform 1 from public.brokerage_payments limit 1;
    raise exception 'FAIL: anonymous caller read payments';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform 1 from public.broker_deal_summary limit 1;
    raise exception 'FAIL: anonymous caller read the deal summary';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform 1 from public.broker_brokerage_monthly limit 1;
    raise exception 'FAIL: anonymous caller read monthly revenue';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_broker'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      100000, 500, current_date
    );
    raise exception 'FAIL: anonymous caller inserted a deal';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      current_setting('ba_test.deal_rls'), 10,
      timestamptz '2026-11-06 10:00:00+05:30', 'cash'
    );
    raise exception 'FAIL: anonymous caller inserted a payment';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 13. Authenticated non-broker access
-- ---------------------------------------------------------------------------

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"role":"authenticated","app_metadata":{}}',
  true
);

set local role authenticated;

do $$
declare
  v_deal text := current_setting('ba_test.deal_main');
  v_payment text := current_setting('ba_test.payment1');
begin
  if exists (select 1 from public.deals) then
    raise exception 'FAIL: a non-broker read deal rows';
  end if;

  if exists (select 1 from public.brokerage_payments) then
    raise exception 'FAIL: a non-broker read payment rows';
  end if;

  if exists (select 1 from public.broker_deal_summary) then
    raise exception 'FAIL: a non-broker read the deal summary';
  end if;

  if exists (select 1 from public.broker_brokerage_monthly) then
    raise exception 'FAIL: a non-broker read monthly revenue';
  end if;

  update public.deals set notes = notes where id = v_deal;
  if found then
    raise exception 'FAIL: a non-broker updated a deal';
  end if;

  begin
    insert into public.deals (
      lead_id, customer_id, property_id, transaction_amount,
      agreed_brokerage, closing_date
    )
    values (
      current_setting('ba_test.lead_broker'),
      current_setting('ba_test.customer'),
      current_setting('ba_test.property'),
      200000, 500, date '2026-11-05'
    );
    raise exception 'FAIL: a non-broker inserted a deal';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      current_setting('ba_test.deal_rls'), 10,
      timestamptz '2026-11-06 10:00:00+05:30', 'cash'
    );
    raise exception 'FAIL: a non-broker inserted a payment';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.brokerage_payments set amount = amount where id = v_payment;
    raise exception 'FAIL: a non-broker updated a payment';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.deals where id = v_deal;
    raise exception 'FAIL: a non-broker deleted a deal';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.brokerage_payments where id = v_payment;
    raise exception 'FAIL: a non-broker deleted a payment';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------------------
-- 14. Authenticated broker access
-- ---------------------------------------------------------------------------

select pg_catalog.set_config(
  'request.jwt.claims',
  '{"role":"authenticated","app_metadata":{"role":"broker"}}',
  true
);

set local role authenticated;

do $$
declare
  v_deal text;
  v_payment text;
begin
  if not exists (
    select 1 from public.deals where id = current_setting('ba_test.deal_main')
  ) then
    raise exception 'FAIL: a broker cannot read deals';
  end if;

  if not exists (
    select 1 from public.broker_deal_summary
    where id = current_setting('ba_test.deal_main')
  ) then
    raise exception 'FAIL: a broker cannot read the deal summary';
  end if;

  if not exists (
    select 1 from public.broker_brokerage_monthly
    where collection_month = date '2199-11-01'
  ) then
    raise exception 'FAIL: a broker cannot read monthly revenue';
  end if;

  insert into public.deals (
    lead_id, customer_id, property_id, transaction_amount,
    expected_brokerage, agreed_brokerage, invoice_number, closing_date, notes
  )
  values (
    current_setting('ba_test.lead_broker'),
    current_setting('ba_test.customer'),
    current_setting('ba_test.property'),
    200000, null, 500, 'INV-BROKER-001', date '2026-11-05',
    'Broker-created deal.'
  )
  returning id into v_deal;

  insert into public.brokerage_payments (
    deal_id, amount, payment_date, payment_method, receipt_number
  )
  values (
    v_deal, 100, timestamptz '2026-11-10 10:00:00+05:30', 'cash',
    'RCPT-BROKER-001'
  )
  returning id into v_payment;

  if (select status from public.deals where id = v_deal) is distinct from 'partially_paid' then
    raise exception 'FAIL: a broker payment did not update the deal status';
  end if;

  update public.deals set notes = 'Broker updated note.' where id = v_deal;
  if not found then
    raise exception 'FAIL: a broker cannot update mutable deal fields';
  end if;

  begin
    update public.deals set lead_id = lead_id where id = v_deal;
    raise exception 'FAIL: a broker changed the deal lead association';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.deals set status = 'fully_paid' where id = v_deal;
    raise exception 'FAIL: a broker forced fully_paid before payments matched';
  exception when sqlstate 'P0005' then
    null;
  end;

  begin
    delete from public.deals where id = v_deal;
    raise exception 'FAIL: a broker deleted a deal';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.brokerage_payments set amount = amount where id = v_payment;
    raise exception 'FAIL: a broker updated a payment';
  exception when insufficient_privilege then
    null;
  end;

  begin
    delete from public.brokerage_payments where id = v_payment;
    raise exception 'FAIL: a broker deleted a payment';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.brokerage_payments (
      deal_id, amount, payment_date, payment_method
    )
    values (
      current_setting('ba_test.deal_cancel'), 100,
      timestamptz '2026-11-11 10:00:00+05:30', 'upi'
    );
    raise exception 'FAIL: a broker paid a cancelled deal';
  exception when sqlstate 'P0006' then
    null;
  end;

  if (select status from public.deals where id = v_deal) is distinct from 'partially_paid' then
    raise exception 'FAIL: blocked broker writes changed the deal status';
  end if;
end $$;

reset role;

-- Successful execution reaches ROLLBACK. Sequence values may still advance.

rollback;
