-- Chennai Real Estates
-- Public lead submission RPC.
--
-- This migration adds the only anonymous write path for public enquiries. It
-- does not change existing table grants, RLS policies, authentication helpers,
-- or seed data.
--
-- Apply through Supabase migration tooling. Do not run this ad hoc against a
-- live project.

-- ---------------------------------------------------------------------------
-- 1. Public submission RPC
--
-- The function is owned by the trusted migration/table-owner role (postgres in
-- Supabase) so it can insert under SECURITY DEFINER while anon has no direct
-- table privileges. It returns void: no lead row or ID is exposed.
--
-- Requires PostgreSQL 13+ for pg_catalog.gen_random_uuid(), which Supabase
-- projects provide.
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
  v_property_id text := case
    when p_property_id is null
      or pg_catalog.btrim(p_property_id, E' \t\n\r\f\v') = '' then null
    else pg_catalog.btrim(p_property_id, E' \t\n\r\f\v')
  end;
  v_phone_digits text;
  v_source public.lead_source;
  v_lead_id text;
begin
  -- Name: required, 2-120 characters.
  if v_name is null
     or pg_catalog.char_length(v_name) < 2
     or pg_catalog.char_length(v_name) > 120 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  -- Phone: required, 10-15 digits after removing formatting. Store digits only.
  if v_phone is null
     or pg_catalog.char_length(v_phone) > 64 then
    raise exception 'Invalid enquiry' using errcode = '22023';
  end if;

  v_phone_digits := pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g');

  if v_phone_digits is null
     or pg_catalog.char_length(v_phone_digits) not between 10 and 15 then
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

  -- Serialize concurrent submissions for the same normalized phone/property
  -- combination, then reject an equivalent recent submission. This is a
  -- minimal duplicate guard, not a replacement for edge/WAF rate limiting.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(v_phone_digits),
    pg_catalog.hashtext(
      case when v_property_id is null then '' else v_property_id end
    )
  );

  if exists (
    select 1
    from public.leads l
    where pg_catalog.regexp_replace(l.phone, '[^0-9]', '', 'g') = v_phone_digits
      and l.property_id is not distinct from v_property_id
      and l.created_at > pg_catalog.now() - interval '60 seconds'
  ) then
    raise exception 'Duplicate enquiry' using errcode = 'P0002';
  end if;

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

  return;
end;
$$;

-- The function is owned by the migration/table-owner role used by Supabase.
alter function public.submit_public_lead(text, text, text, text, text)
  owner to postgres;

-- Only anonymous visitors may execute this RPC. No table or sequence grants
-- are added; anon still has no direct access to leads, notes, or activities.
revoke all on function public.submit_public_lead(text, text, text, text, text)
  from public;
revoke all on function public.submit_public_lead(text, text, text, text, text)
  from anon, authenticated;
grant execute on function public.submit_public_lead(text, text, text, text, text)
  to anon;

comment on function public.submit_public_lead(text, text, text, text, text)
  is 'Narrow anonymous entry point for public enquiries. Inserts a non-demo lead with a server-derived source and no returned row.';
