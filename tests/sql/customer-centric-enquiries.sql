-- Chennai Real Estates
-- Customer-centric enquiry verification.
--
-- Run only against a disposable local or staging Supabase database with all
-- migrations and seed data applied. Do not run against production.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/customer-centric-enquiries.sql
--
-- Run as the migration/table owner (postgres in Supabase). The script creates
-- records and then rolls the whole transaction back. Sequences can still be
-- consumed by rolled-back calls.

begin;

-- 1. Customer schema, view, constraints and privileges

do $$
declare
  v_view_options text[];
begin
  if to_regclass('public.customers') is null then
    raise exception 'FAIL: public.customers does not exist';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers'
      and column_name = 'normalized_phone' and is_generated = 'ALWAYS'
  ) then
    raise exception 'FAIL: normalized_phone is not a generated column';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_normalized_phone_key' and contype = 'u'
  ) then
    raise exception 'FAIL: normalized phone uniqueness is missing';
  end if;

  if not exists (
    select 1 from pg_class
    where oid = 'public.customers'::regclass and relrowsecurity
  ) then
    raise exception 'FAIL: customers RLS is not enabled';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'customers'
      and policyname = 'customers_broker_all'
  ) then
    raise exception 'FAIL: customers broker policy is missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.leads'::regclass
      and conname = 'leads_customer_id_fkey' and contype = 'f'
  ) then
    raise exception 'FAIL: leads.customer_id foreign key is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'customer_id'
      and is_nullable = 'YES'
  ) then
    raise exception 'FAIL: leads.customer_id must be nullable';
  end if;

  if to_regclass('public.broker_customer_summary') is null then
    raise exception 'FAIL: broker_customer_summary view is missing';
  end if;

  select reloptions into v_view_options
  from pg_class where oid = 'public.broker_customer_summary'::regclass;

  if v_view_options is null or not ('security_invoker=true' = any(v_view_options)) then
    raise exception 'FAIL: summary view is not security_invoker (%)', v_view_options;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'broker_notifications'
      and column_name = 'customer_context'
  ) then
    raise exception 'FAIL: notification customer_context is missing';
  end if;
end $$;

do $$
begin
  if has_table_privilege('anon', 'public.customers', 'select')
     or has_table_privilege('anon', 'public.customers', 'insert')
     or has_table_privilege('anon', 'public.customers', 'update')
     or has_table_privilege('anon', 'public.customers', 'delete') then
    raise exception 'FAIL: anonymous customer table privilege leaked';
  end if;

  if has_table_privilege('anon', 'public.broker_customer_summary', 'select') then
    raise exception 'FAIL: anonymous summary view privilege leaked';
  end if;

  if not has_table_privilege('authenticated', 'public.customers', 'select')
     or not has_table_privilege('authenticated', 'public.customers', 'update') then
    raise exception 'FAIL: broker customer read/update grant is missing';
  end if;

  if has_table_privilege('authenticated', 'public.customers', 'insert')
     or has_table_privilege('authenticated', 'public.customers', 'delete') then
    raise exception 'FAIL: broker customer insert/delete grant is too broad';
  end if;

  if not has_table_privilege('authenticated', 'public.broker_customer_summary', 'select') then
    raise exception 'FAIL: broker summary view grant is missing';
  end if;

  if has_table_privilege('anon', 'public.broker_customer_summary', 'insert') then
    raise exception 'FAIL: anonymous summary view write privilege leaked';
  end if;

  if has_sequence_privilege('anon', 'public.customer_id_seq', 'usage')
     or has_sequence_privilege('authenticated', 'public.customer_id_seq', 'usage') then
    raise exception 'FAIL: browser role can use the customer sequence';
  end if;
end $$;

-- 2. Phone normalization

do $$
begin
  if public.normalize_customer_phone('9876543210') is distinct from '9876543210'
     or public.normalize_customer_phone('+91 98765 43210') is distinct from '9876543210'
     or public.normalize_customer_phone('91-9876543210') is distinct from '9876543210'
     or public.normalize_customer_phone('09876543210') is distinct from '9876543210'
     or public.normalize_customer_phone('98765-43210') is distinct from '9876543210' then
    raise exception 'FAIL: requested Indian mobile normalization cases';
  end if;
  if public.normalize_customer_phone('+91 90000 12345') <> '9000012345' then
    raise exception 'FAIL: +91 normalization';
  end if;
  if public.normalize_customer_phone('91-90000-12345') <> '9000012345' then
    raise exception 'FAIL: 91 prefix normalization';
  end if;
  if public.normalize_customer_phone('0919000012345') <> '0919000012345' then
    raise exception 'FAIL: 13-digit value must not be guessed at';
  end if;
  if public.normalize_customer_phone('09000012345') <> '9000012345' then
    raise exception 'FAIL: national trunk normalization';
  end if;
  if public.normalize_customer_phone('(044) 2345 6789') <> '04423456789' then
    raise exception 'FAIL: landline fallback normalization';
  end if;
  if public.normalize_customer_phone('12345') is not null then
    raise exception 'FAIL: short phone was normalized';
  end if;
  if public.normalize_customer_phone('+1 415 555 1234') <> '14155551234' then
    raise exception 'FAIL: ambiguous number fallback';
  end if;
end $$;

-- 3. Link integrity; historical snapshots require a separate pre-migration baseline.

do $$
begin
  if exists (
    select 1 from public.leads l
    left join public.customers c on c.id = l.customer_id
    where l.customer_id is not null and c.id is null
  ) then
    raise exception 'FAIL: dangling customer link';
  end if;
end $$;

-- 4. Public RPC creates one customer for repeat enquiries (rolled back)

-- Resolve the test property and the pre-test customer count once. They are
-- stored as transaction-local settings so the anonymous calls below can run
-- outside the DO block, matching the other SQL verification scripts.
do $$
declare
  v_pid text;
begin
  select id into v_pid from public.properties
  where status in ('available', 'under-offer')
  order by id limit 1;

  if v_pid is null then
    raise exception 'A public test property is required';
  end if;

  if exists (select 1 from public.customers where normalized_phone in
      ('999000123456801', '999000123456803', '9990001234'))
     or exists (select 1 from public.leads where public.normalize_customer_phone(phone) in
      ('999000123456801', '999000123456803')) then
    raise exception 'FAIL: test phone already exists; choose unused fixtures';
  end if;

  perform pg_catalog.set_config('cre_test.property', v_pid, true);
  perform pg_catalog.set_config(
    'cre_test.customers_before',
    (select count(*)::text from public.customers),
    true
  );
end $$;

-- A general enquiry from an anonymous visitor creates the customer.
set local role anon;
select public.submit_public_lead(
  'Customer General Test',
  '999000123456801',
  null,
  'A valid general enquiry message for a new customer.',
  null
);
reset role;

do $$
declare
  v_phone text := '999000123456801';
  v_customer_id text;
  v_lead_general text;
begin
  select id into v_customer_id from public.customers
  where normalized_phone = public.normalize_customer_phone(v_phone);

  if v_customer_id is null then
    raise exception 'FAIL: customer was not created';
  end if;

  if (select count(*) from public.customers)
     <> current_setting('cre_test.customers_before')::bigint + 1 then
    raise exception 'FAIL: more than one customer was created';
  end if;

  select id into v_lead_general from public.leads
  where customer_id = v_customer_id order by created_at desc limit 1;

  if v_lead_general is null then
    raise exception 'FAIL: general enquiry lead was not linked';
  end if;

  if not exists (
    select 1 from public.leads
    where id = v_lead_general
      and phone = v_phone
      and name = 'Customer General Test'
      and property_id is null
      and status = 'new'
      and source = 'website-form'
      and is_demo = false
  ) then
    raise exception 'FAIL: general enquiry fields changed';
  end if;

  if not exists (
    select 1 from public.broker_notifications
    where lead_id = v_lead_general and customer_context = 'new'
  ) then
    raise exception 'FAIL: new-customer notification context is missing';
  end if;
  if not exists (select 1 from public.lead_activities
                 where lead_id = v_lead_general and label = 'Enquiry received') then
    raise exception 'FAIL: initial activity is missing';
  end if;
end $$;

-- The same phone with a different property is a separate enquiry on the same
-- customer, not a duplicate.
set local role anon;
select public.submit_public_lead(
  'Customer Property Test',
  '999000123456801',
  null,
  'A valid property enquiry message for the same customer.',
  current_setting('cre_test.property')
);
reset role;

do $$
declare
  v_phone text := '999000123456801';
  v_customer_id text;
  v_lead_property text;
begin
  select id into v_customer_id from public.customers
  where normalized_phone = public.normalize_customer_phone(v_phone);

  if v_customer_id is null then
    raise exception 'FAIL: repeat enquiry did not resolve the existing customer';
  end if;

  if (select count(*) from public.customers
      where normalized_phone = public.normalize_customer_phone(v_phone)) <> 1 then
    raise exception 'FAIL: repeat enquiry created a second customer';
  end if;

  select id into v_lead_property from public.leads
  where customer_id = v_customer_id
    and property_id = current_setting('cre_test.property')
  order by created_at desc limit 1;

  if v_lead_property is null then
    raise exception 'FAIL: property enquiry was not linked to the existing customer';
  end if;

  if (select count(*) from public.leads where customer_id = v_customer_id) <> 2 then
    raise exception 'FAIL: expected two linked enquiries for the customer';
  end if;

  if not exists (
    select 1 from public.broker_notifications
    where lead_id = v_lead_property and customer_context = 'existing'
  ) then
    raise exception 'FAIL: existing-customer notification context is missing';
  end if;

  if (select count(*) from public.broker_notifications n
      join public.leads l on l.id = n.lead_id
      where l.customer_id = v_customer_id) <> 2 then
    raise exception 'FAIL: unexpected notification count for the test customer';
  end if;
end $$;

-- 4b. Duplicate cooldown for the same phone and property

-- The first submission succeeds; the second is expected to raise P0002. The
-- expected failure runs inside its own block so it does not abort the script.
set local role anon;
select public.submit_public_lead(
  'Duplicate Customer Test',
  '999000123456803',
  null,
  'This is the first duplicate customer test message.',
  current_setting('cre_test.property')
);

do $$
begin
  begin
    perform public.submit_public_lead(
      'Duplicate Customer Test',
      '999000123456803',
      null,
      'This is the second duplicate customer test message.',
      current_setting('cre_test.property')
    );
    raise exception 'FAIL: same phone and property within cooldown was accepted';
  exception when sqlstate 'P0002' then
    null;
  end;
end $$;
reset role;

-- Invalid submissions must fail with the intended SQLSTATE, not a generic error.
set local role anon;
do $$
begin
  begin
    perform public.submit_public_lead('Test', '123', null, 'Valid message for invalid phone', null);
    raise exception 'FAIL: invalid phone accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.submit_public_lead('Test', '999000123456804', null, 'Valid message for blank property', ' ');
    raise exception 'FAIL: blank property accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.submit_public_lead('Test', '999000123456804', null, 'Valid message for missing property', 'NONEXISTENT-TEST-ID');
    raise exception 'FAIL: missing property accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Property unavailable' then raise; end if;
  end;
end $$;
reset role;

-- 5. Customer edits never rewrite or merge enquiry history

do $$
declare
  v_customer_id text;
  v_other_phone text;
  v_before_ids text[];
  v_before_status text[];
  v_before_messages text[];
  v_after_ids text[];
  v_after_status text[];
  v_after_messages text[];
begin
  select c.id into v_customer_id
  from public.customers c
  join public.leads l on l.customer_id = c.id
  where c.normalized_phone = '999000123456801'
  limit 1;

  if v_customer_id is null then
    raise exception 'FAIL: test customer not found';
  end if;

  select array_agg(id order by id) into v_before_ids from public.leads where customer_id = v_customer_id;
  select array_agg(status::text order by id) into v_before_status from public.leads where customer_id = v_customer_id;
  select array_agg(message order by id) into v_before_messages from public.leads where customer_id = v_customer_id;

  update public.customers
  set name = 'Customer Renamed', phone = '+91 99900 01234', email = 'renamed@example.test'
  where id = v_customer_id;

  if (select normalized_phone from public.customers where id = v_customer_id) <> '9990001234' then
    raise exception 'FAIL: generated normalized phone was not recalculated';
  end if;

  select array_agg(id order by id) into v_after_ids from public.leads where customer_id = v_customer_id;
  select array_agg(status::text order by id) into v_after_status from public.leads where customer_id = v_customer_id;
  select array_agg(message order by id) into v_after_messages from public.leads where customer_id = v_customer_id;

  if v_before_ids <> v_after_ids then
    raise exception 'FAIL: customer edit changed lead IDs or links';
  end if;
  if v_before_status <> v_after_status then
    raise exception 'FAIL: customer edit changed lead statuses';
  end if;
  if v_before_messages <> v_after_messages then
    raise exception 'FAIL: customer edit changed enquiry messages';
  end if;

  -- A phone already owned by another customer must be rejected, never merged.
  select normalized_phone into v_other_phone
  from public.customers
  where normalized_phone <> '9990001234'
  limit 1;

  if v_other_phone is not null then
    begin
      update public.customers set phone = v_other_phone where id = v_customer_id;
      raise exception 'FAIL: duplicate customer phone was accepted';
    exception when unique_violation then
      null;
    end;
  end if;

  -- Deleting a customer with enquiries is blocked by the FK.
  begin
    delete from public.customers where id = v_customer_id;
    raise exception 'FAIL: customer with enquiries was deleted';
  exception when foreign_key_violation then
    null;
  end;
end $$;

-- 6. RLS and RPC execution privileges

-- A signed-in non-broker must not read or write customer data.
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"role":"authenticated","app_metadata":{}}',
  true
);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.customers) then
    raise exception 'FAIL: non-broker read customer rows';
  end if;
  if exists (select 1 from public.broker_customer_summary) then
    raise exception 'FAIL: non-broker read the summary view';
  end if;
  update public.customers set name = name where normalized_phone = '9990001234';
  if found then
    raise exception 'FAIL: non-broker updated a customer';
  end if;
end $$;

reset role;

-- A broker can read and update customers but cannot insert or delete them
-- directly, and cannot execute the public submission RPC.
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"role":"authenticated","app_metadata":{"role":"broker"}}',
  true
);
set local role authenticated;

do $$
begin
  if not exists (select 1 from public.customers limit 1) then
    raise exception 'FAIL: broker cannot read customers';
  end if;
  if not exists (select 1 from public.broker_customer_summary limit 1) then
    raise exception 'FAIL: broker cannot read the summary view';
  end if;
  update public.customers set name = name where normalized_phone = '9990001234';
  if not found then
    raise exception 'FAIL: broker cannot update a customer';
  end if;

  begin
    insert into public.customers (name, phone) values ('Illegal Insert', '999000199999');
    raise exception 'FAIL: broker inserted a customer directly';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.submit_public_lead('Broker Test', '999000123456804', null, 'A valid broker test message.', null);
    raise exception 'FAIL: authenticated caller executed the public RPC';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

do $$
begin
  if has_function_privilege('anon', 'public.normalize_customer_phone(text)', 'execute') then
    raise exception 'FAIL: anonymous caller can execute the normalization helper';
  end if;
  if not has_function_privilege('authenticated', 'public.normalize_customer_phone(text)', 'execute') then
    raise exception 'FAIL: broker cannot execute the normalization helper';
  end if;
end $$;

-- Successful execution reaches ROLLBACK. Sequence values may still advance.

rollback;
