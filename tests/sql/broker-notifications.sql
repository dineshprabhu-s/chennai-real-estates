-- Run only as migration owner against a disposable local/staging database.
-- This test rolls back changes but sequence values can still be consumed.
\set ON_ERROR_STOP on
begin;
do $$
declare pid text; lead_general text; lead_property text; before_count bigint;
begin
  select id into pid from public.properties where status in ('available','under-offer') order by id limit 1;
  if pid is null then raise exception 'A public test property is required'; end if;
  select count(*) into before_count from public.broker_notifications;
  perform public.submit_public_lead('Notification General Test', '999000123456701', null, 'A valid general enquiry message', null);
  select id into lead_general from public.leads where phone = '999000123456701';
  perform public.submit_public_lead('Notification Property Test', '999000123456702', null, 'A valid property enquiry message', pid);
  select id into lead_property from public.leads where phone = '999000123456702';
  if (select count(*) from public.broker_notifications where lead_id in (lead_general,lead_property) and read_at is null) <> 2 then raise exception 'Notification association/unread failure'; end if;
  if (select count(*) from public.lead_activities where lead_id in (lead_general,lead_property)) <> 2 then raise exception 'Initial activity failure'; end if;
  begin perform public.submit_public_lead('Notification General Test', '999000123456701', null, 'A valid general enquiry message', null); raise exception 'Duplicate accepted'; exception when sqlstate 'P0002' then null; end;
  begin perform public.submit_public_lead('X', '999000123456703', null, 'A valid general enquiry message', null); raise exception 'Invalid enquiry accepted'; exception when sqlstate '22023' then null; end;
  begin perform public.submit_public_lead('Notification Invalid Test', '999000123456704', null, 'A valid property enquiry message', 'DOES-NOT-EXIST'); raise exception 'Invalid property accepted'; exception when sqlstate 'P0001' then null; end;
  if (select count(*) from public.broker_notifications) <> before_count + 2 then raise exception 'Unexpected notification'; end if;
  if exists (select 1 from public.broker_notifications n join public.leads l on l.id = n.lead_id where l.is_demo) then raise exception 'Demo lead has a notification'; end if;
end $$;
create function pg_temp.fail_notification() returns trigger language plpgsql as $$ begin raise exception 'simulated notification failure'; end $$;
create trigger test_notification_failure before insert on public.broker_notifications for each row execute function pg_temp.fail_notification();
do $$
declare before_activities bigint; before_notifications bigint;
begin
  select count(*) into before_activities from public.lead_activities;
  select count(*) into before_notifications from public.broker_notifications;
  begin perform public.submit_public_lead('Notification Failure Test','999000123456705',null,'A valid general enquiry message',null); raise exception 'Failure not raised';
  exception when raise_exception then if sqlerrm <> 'simulated notification failure' then raise; end if; end;
  if exists (select 1 from public.leads where phone = '999000123456705') then raise exception 'Lead was not rolled back'; end if;
  if (select count(*) from public.lead_activities) <> before_activities or (select count(*) from public.broker_notifications) <> before_notifications then raise exception 'Activity or notification was not rolled back'; end if;
end $$;
drop trigger test_notification_failure on public.broker_notifications;
do $$ begin
  if has_table_privilege('anon','public.broker_notifications','select') or has_column_privilege('anon','public.broker_notifications','read_at','update') then raise exception 'Anonymous privilege leaked'; end if;
  if has_column_privilege('authenticated','public.broker_notifications','lead_id','update') then raise exception 'Content update privilege leaked'; end if;
end $$;
set local role authenticated;
select pg_catalog.set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{}}', true);
do $$ begin
  if exists (select 1 from public.broker_notifications) then raise exception 'Non-broker read leaked'; end if;
  update public.broker_notifications set read_at=pg_catalog.now();
  if found then raise exception 'Non-broker update leaked'; end if;
end $$;
select pg_catalog.set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"broker"}}', true);
do $$ begin
  if not exists (select 1 from public.broker_notifications where read_at is null) then raise exception 'Broker cannot read'; end if;
  update public.broker_notifications set read_at=pg_catalog.now() where read_at is null;
  if not found then raise exception 'Broker cannot update'; end if;
end $$;
reset role;
rollback;
