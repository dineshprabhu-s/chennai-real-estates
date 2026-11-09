-- Chennai Real Estates
-- Public lead submission RPC verification.
--
-- Run only against a disposable local or staging Supabase database with the
-- initial migration and seed applied. Do not run against production.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sql/public-lead-rpc.sql
--
-- Run as the migration/table owner (postgres in Supabase). Each record-creating
-- section uses a transaction that ends in ROLLBACK. The manual atomicity check
-- at the bottom is documentation only and is not executed.

\set ON_ERROR_STOP on

\echo '1. Function metadata and function privileges'

do $$
declare
  v_oid oid := 'public.submit_public_lead(text,text,text,text,text)'::regprocedure;
  v_proc pg_proc%rowtype;
begin
  select * into v_proc from pg_proc where oid = v_oid;

  if v_proc.oid is null then
    raise exception 'FAIL: public.submit_public_lead(...) does not exist';
  end if;
  if v_proc.prorettype <> 'void'::regtype then
    raise exception 'FAIL: return type is %, expected void', v_proc.prorettype::regtype;
  end if;
  if not v_proc.prosecdef then
    raise exception 'FAIL: function is not SECURITY DEFINER';
  end if;
  if pg_get_userbyid(v_proc.proowner) <> 'postgres' then
    raise exception 'FAIL: owner is %, expected postgres', pg_get_userbyid(v_proc.proowner);
  end if;
  if not exists (
    select 1
    from unnest(v_proc.proconfig) cfg
    where cfg in ('search_path=', 'search_path=""')
  ) then
    raise exception 'FAIL: fixed empty search_path not configured (%)', v_proc.proconfig;
  end if;
  if not has_function_privilege('anon', v_oid, 'execute') then
    raise exception 'FAIL: anon cannot execute the function';
  end if;
  if has_function_privilege('authenticated', v_oid, 'execute') then
    raise exception 'FAIL: authenticated can execute the function';
  end if;
  if exists (
    select 1
    from aclexplode(coalesce(v_proc.proacl, acldefault('f', v_proc.proowner))) acl
    where acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'FAIL: PUBLIC retains execute privilege';
  end if;
  if position('pg_advisory_xact_lock' in pg_get_functiondef(v_oid)) = 0 then
    raise exception 'FAIL: transaction-scoped duplicate lock is missing';
  end if;
end $$;

\echo '2. Authenticated callers cannot execute the RPC'

begin;
set local role authenticated;

do $$
begin
  begin
    perform public.submit_public_lead(
      'Authenticated Test',
      '9000012399',
      null,
      'This submission must not be allowed.',
      null
    );
    raise exception 'FAIL: authenticated executed the function';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;
rollback;

\echo '3. Anonymous table and sequence privileges'

do $$
begin
  if has_table_privilege('anon', 'public.leads', 'select') then raise exception 'FAIL: anon can select leads'; end if;
  if has_table_privilege('anon', 'public.leads', 'insert') then raise exception 'FAIL: anon can insert leads'; end if;
  if has_table_privilege('anon', 'public.leads', 'update') then raise exception 'FAIL: anon can update leads'; end if;
  if has_table_privilege('anon', 'public.leads', 'delete') then raise exception 'FAIL: anon can delete leads'; end if;
  if has_table_privilege('anon', 'public.lead_notes', 'select') then raise exception 'FAIL: anon can select lead_notes'; end if;
  if has_table_privilege('anon', 'public.lead_notes', 'insert') then raise exception 'FAIL: anon can insert lead_notes'; end if;
  if has_table_privilege('anon', 'public.lead_notes', 'update') then raise exception 'FAIL: anon can update lead_notes'; end if;
  if has_table_privilege('anon', 'public.lead_notes', 'delete') then raise exception 'FAIL: anon can delete lead_notes'; end if;
  if has_table_privilege('anon', 'public.lead_activities', 'select') then raise exception 'FAIL: anon can select lead_activities'; end if;
  if has_table_privilege('anon', 'public.lead_activities', 'insert') then raise exception 'FAIL: anon can insert lead_activities'; end if;
  if has_table_privilege('anon', 'public.lead_activities', 'update') then raise exception 'FAIL: anon can update lead_activities'; end if;
  if has_table_privilege('anon', 'public.lead_activities', 'delete') then raise exception 'FAIL: anon can delete lead_activities'; end if;
  if has_sequence_privilege('anon', 'public.lead_id_seq', 'usage') then raise exception 'FAIL: anon has lead_id_seq usage'; end if;
  if has_sequence_privilege('anon', 'public.lead_id_seq', 'select') then raise exception 'FAIL: anon has lead_id_seq select'; end if;
  if has_sequence_privilege('anon', 'public.lead_id_seq', 'update') then raise exception 'FAIL: anon has lead_id_seq update'; end if;
end $$;

\echo '4. Valid general submission as anon (rolled back)'

begin;
set local role anon;
select public.submit_public_lead(
  '  Test General  ',
  ' +91 90000 12345 ',
  '   ',
  '  This is a valid general enquiry message.  ',
  null
);
reset role;

do $$
declare
  v_phone text := '919000012345';
  v_lead_id text;
begin
  select id into v_lead_id
  from public.leads
  where phone = v_phone
  order by created_at desc
  limit 1;

  if v_lead_id is null then
    raise exception 'FAIL: general submission did not create a lead';
  end if;

  if not exists (
    select 1 from public.leads
    where id = v_lead_id
      and name = 'Test General'
      and phone = v_phone
      and email is null
      and message = 'This is a valid general enquiry message.'
      and property_id is null
      and status = 'new'
      and source = 'website-form'
      and is_demo = false
      and id like 'LEAD-%'
      and created_at is not null
      and updated_at is not null
  ) then
    raise exception 'FAIL: general submission fields are incorrect';
  end if;

  if not exists (
    select 1 from public.lead_activities
    where lead_id = v_lead_id
      and label = 'Enquiry received'
      and detail = 'New enquiry submitted from the public contact form.'
      and occurred_at is not null
      and id is not null
  ) then
    raise exception 'FAIL: general submission activity is incorrect';
  end if;
end $$;

rollback;

\echo '5. Valid property submission as anon (rolled back)'

begin;
set local role anon;
select public.submit_public_lead(
  'Test Property',
  '+91 90000 12346',
  'test@example.com',
  'This is a valid property enquiry message.',
  '  MAD-0001  '
);
reset role;

do $$
declare
  v_phone text := '919000012346';
  v_lead_id text;
begin
  select id into v_lead_id
  from public.leads
  where phone = v_phone
  order by created_at desc
  limit 1;

  if v_lead_id is null then
    raise exception 'FAIL: property submission did not create a lead';
  end if;

  if not exists (
    select 1 from public.leads
    where id = v_lead_id
      and name = 'Test Property'
      and phone = v_phone
      and email = 'test@example.com'
      and message = 'This is a valid property enquiry message.'
      and property_id = 'MAD-0001'
      and status = 'new'
      and source = 'property-enquiry'
      and is_demo = false
  ) then
    raise exception 'FAIL: property submission fields are incorrect';
  end if;

  if not exists (
    select 1 from public.lead_activities
    where lead_id = v_lead_id
      and label = 'Enquiry received'
      and detail = 'New enquiry submitted from a property page.'
      and occurred_at is not null
  ) then
    raise exception 'FAIL: property submission activity is incorrect';
  end if;
end $$;

rollback;

\echo '6. Invalid input rejection as anon (rolled back)'

begin;
set local role anon;

do $$
begin
  begin
    perform public.submit_public_lead('A', '9000012347', null, 'This is a valid message.', null);
    raise exception 'FAIL: short name was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead(repeat('a', 121), '9000012347', null, 'This is a valid message.', null);
    raise exception 'FAIL: long name was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '12345', null, 'This is a valid message.', null);
    raise exception 'FAIL: short phone was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '1234567890123456', null, 'This is a valid message.', null);
    raise exception 'FAIL: long phone was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', 'not-an-email', 'This is a valid message.', null);
    raise exception 'FAIL: invalid email was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, 'short', null);
    raise exception 'FAIL: short message was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, repeat('m', 4001), null);
    raise exception 'FAIL: long message was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, 'This is a valid message.', '');
    raise exception 'FAIL: empty property ID was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, 'This is a valid message.', E' \t\n\r');
    raise exception 'FAIL: whitespace-only property ID was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, 'This is a valid message.', pg_catalog.chr(11));
    raise exception 'FAIL: vertical-tab-only property ID was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, 'This is a valid message.', repeat('P', 65));
    raise exception 'FAIL: long property ID was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_public_lead('Test', '9000012347', null, 'This is a valid message.', 'MAD-9999');
    raise exception 'FAIL: missing property was accepted';
  exception when sqlstate 'P0001' then null;
  end;
end $$;

reset role;
rollback;

\echo '7. Non-public property rejection as anon (rolled back)'

begin;
update public.properties
set status = 'draft'
where id = 'MAD-0001';

set local role anon;

do $$
begin
  begin
    perform public.submit_public_lead(
      'Test',
      '9000012348',
      null,
      'This is a valid property enquiry message.',
      'MAD-0001'
    );
    raise exception 'FAIL: draft property was accepted';
  exception when sqlstate 'P0001' then
    null;
  end;
end $$;

reset role;
rollback;

\echo '8. Duplicate submission rejection as anon (rolled back)'
-- The second call must raise SQLSTATE P0002 with the generic message
-- 'Duplicate enquiry' and must not reveal the existing lead ID.

begin;
set local role anon;

do $$
begin
  perform public.submit_public_lead(
    'Duplicate Test',
    '+91 90000 12349',
    null,
    'This is the first duplicate test message.',
    null
  );

  begin
    perform public.submit_public_lead(
      'Duplicate Test',
      '919000012349',
      null,
      'This is the second duplicate test message.',
      null
    );
    raise exception 'FAIL: duplicate submission was accepted';
  exception when sqlstate 'P0002' then
    null;
  end;
end $$;

reset role;
rollback;

\echo '9. Seeded demo rows unchanged'

do $$
declare
  v_demo_count integer;
begin
  select count(*) into v_demo_count
  from public.leads
  where id in (
    'LEAD-1001', 'LEAD-1002', 'LEAD-1003', 'LEAD-1004',
    'LEAD-1005', 'LEAD-1006', 'LEAD-1007'
  )
    and is_demo = true;

  if v_demo_count <> 7 then
    raise exception 'FAIL: expected 7 seeded demo leads, found %', v_demo_count;
  end if;
end $$;

\echo 'All automated RPC checks passed. All test inserts were rolled back.'
\echo 'Run the manual atomicity check below on a disposable database.'

-- ---------------------------------------------------------------------------
-- Manual atomicity check (not executed by this script)
-- ---------------------------------------------------------------------------
--
-- The automated checks cannot force the activity insert to fail without
-- creating a trigger. On a disposable local/staging database, run as postgres:
--
--   begin;
--   create or replace function pg_temp.fail_activity_insert()
--   returns trigger
--   language plpgsql
--   as $$
--   begin
--     raise exception 'simulated activity failure';
--   end;
--   $$;
--   create trigger fail_activity_insert
--     before insert on public.lead_activities
--     for each row execute function pg_temp.fail_activity_insert();
--
--   -- Expect an error. The lead insert and activity insert must both roll back.
--   select public.submit_public_lead(
--     'Atomic Test',
--     '9000012350',
--     null,
--     'This is an atomicity test message.',
--     null
--   );
--
--   rollback;
--
-- After the rollback, verify there is no orphaned lead or activity:
--
--   select count(*) from public.leads where phone = '9000012350'; -- expected 0
--   select count(*)
--   from public.lead_activities a
--   join public.leads l on l.id = a.lead_id
--   where l.phone = '9000012350'; -- expected 0
--
-- The trigger and temporary function disappear with the rollback.
