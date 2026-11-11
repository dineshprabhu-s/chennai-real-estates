/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS SQL check */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20261112000000_customer_centric_enquiries.sql',
);
const previousPath = path.join(
  root,
  'supabase',
  'migrations',
  '20261111000000_broker_notifications.sql',
);

assert(fs.existsSync(migrationPath), 'customer-centric migration was not found');
assert(fs.existsSync(previousPath), 'previous notification migration was not found');

const sql = fs.readFileSync(migrationPath, 'utf8');
const previous = fs.readFileSync(previousPath, 'utf8');

// --- Forward-only -------------------------------------------------------
assert(!/\bdrop\s+table\b/i.test(sql), 'migration must not drop tables');
assert(!/\bdrop\s+column\b/i.test(sql), 'migration must not drop columns');
assert(!/\btruncate\b/i.test(sql), 'migration must not truncate data');

// --- Phone normalization helper ----------------------------------------
assert.match(sql, /create or replace function public\.normalize_customer_phone\(p_phone text\)/i);
assert.match(sql, /returns text/i);
assert.match(sql, /language sql/i);
assert.match(sql, /immutable/i);
assert.match(sql, /strict/i);
assert.match(sql, /set search_path = ''/i);
assert.match(sql, /regexp_replace\(p_phone, '\[\^0-9\]', '', 'g'\)/i);
assert.match(sql, /substr\(d\.digits, 1, 2\) = '91'/i);
assert.match(sql, /substr\(d\.digits, 1, 1\) = '0'/i);
assert.match(sql, /char_length\(d\.digits\) not between 10 and 15/i);
assert.match(sql, /grant execute on function public\.normalize_customer_phone\(text\)\s+to authenticated/i);
assert.match(sql, /revoke all on function public\.normalize_customer_phone\(text\)\s+from public, anon, authenticated/i);

// --- Customers table ---------------------------------------------------
assert.match(sql, /create table public\.customers/i);
assert.match(sql, /id text not null/i);
assert.match(sql, /name text not null/i);
assert.match(sql, /phone text not null/i);
assert.match(sql, /normalized_phone text\s+generated always as \(public\.normalize_customer_phone\(phone\)\) stored/i);
assert.match(sql, /customers_normalized_phone_valid/i);
assert.match(sql, /normalized_phone is not null and normalized_phone ~ '\^\[0-9\]\{10,15\}\$'/i);
assert.match(sql, /unique \(normalized_phone\)/i);
assert.match(sql, /create trigger customers_set_updated_at/i);
assert.match(sql, /alter table public\.customers enable row level security/i);
assert.match(sql, /create policy customers_broker_all[\s\S]*?to authenticated[\s\S]*?public\.is_broker\(\)/i);
assert.match(sql, /revoke all on public\.customers from public, anon, authenticated/i);
assert.match(sql, /grant select, update on public\.customers to authenticated/i);
assert.match(sql, /revoke all on sequence public\.customer_id_seq from public, anon, authenticated/i);

// --- Lead link and historical backfill --------------------------------
assert.match(sql, /alter table public\.leads\s+add column customer_id text/i);
assert.match(sql, /foreign key \(customer_id\) references public\.customers \(id\)/i);
assert.match(sql, /on update cascade on delete restrict/i);
assert.match(sql, /create index leads_customer_created_idx/i);
assert.match(sql, /insert into public\.customers/i);
assert.match(sql, /group by public\.normalize_customer_phone\(l\.phone\)/i);
assert.match(sql, /alter table public\.leads disable trigger leads_set_updated_at/i);
assert.match(sql, /update public\.leads l\s+set customer_id = c\.id\s+from public\.customers c\s+where c\.normalized_phone = public\.normalize_customer_phone\(l\.phone\)/i);
assert.match(sql, /alter table public\.leads enable trigger leads_set_updated_at/i);
const backfillUpdate = sql.slice(sql.indexOf('update public.leads l'), sql.indexOf('alter table public.leads enable trigger'));
assert(!/\bset\s+id\s*=/i.test(backfillUpdate), 'backfill must not rewrite lead IDs');
assert(!/\bset\s+status\s*=/i.test(backfillUpdate), 'backfill must not rewrite statuses');
assert(!/\bset\s+message\s*=/i.test(backfillUpdate), 'backfill must not rewrite messages');
assert(!/\bset\s+created_at\s*=/i.test(backfillUpdate), 'backfill must not rewrite createdAt');

// --- Broker summary view ----------------------------------------------
assert.match(sql, /create view public\.broker_customer_summary/i);
assert.match(sql, /with \(security_invoker = true\)/i);
assert.match(sql, /enquiry_count/i);
assert.match(sql, /active_enquiry_count/i);
assert.match(sql, /latest_enquiry_at/i);
assert.match(sql, /latest_activity_label/i);
assert.match(sql, /bool_and\(l\.is_demo\)/i);
assert.match(sql, /revoke all on public\.broker_customer_summary\s+from public, anon, authenticated/i);
assert.match(sql, /grant select on public\.broker_customer_summary to authenticated/i);

// --- Notification context ---------------------------------------------
assert.match(sql, /alter table public\.broker_notifications\s+add column customer_context text/i);
assert.match(sql, /check \(customer_context is null or customer_context in \('new', 'existing'\)\)/i);

// --- RPC signature and security ---------------------------------------
const rpcStart = sql.indexOf('create or replace function public.submit_public_lead(');
assert(rpcStart >= 0, 'RPC definition is missing');
const rpc = sql.slice(rpcStart);
assert.match(rpc, /p_name text,\s+p_phone text,\s+p_email text,\s+p_message text,\s+p_property_id text default null/i);
assert.match(rpc, /returns void/i);
assert.match(rpc, /language plpgsql/i);
assert.match(rpc, /security definer/i);
assert.match(rpc, /set search_path = ''/i);
assert.match(rpc, /pg_catalog\.btrim\(p_name/i);
assert.match(rpc, /char_length\(v_name\) < 2/i);
assert.match(rpc, /char_length\(v_name\) > 120/i);
assert.match(rpc, /char_length\(v_phone\) > 64/i);
assert.match(rpc, /char_length\(v_phone_digits\) not between 10 and 15/i);
assert.match(rpc, /v_normalized_phone := public\.normalize_customer_phone\(v_phone_digits\)/i);
assert.match(rpc, /char_length\(v_email\) > 254/i);
assert.match(rpc, /char_length\(v_message\) < 10/i);
assert.match(rpc, /char_length\(v_message\) > 4000/i);
assert.match(rpc, /p_property_id is not null and v_property_id = ''/i);
assert.match(rpc, /status in \('available', 'under-offer'\)/i);
assert.match(rpc, /errcode = 'P0001'/i);
assert.match(rpc, /pg_advisory_xact_lock/i);
assert.match(rpc, /interval '60 seconds'/i);
assert.match(rpc, /errcode = 'P0002'/i);
assert.match(rpc, /errcode = '22023'/i);
assert.match(rpc, /v_customer_context := case\s+when v_customer_id is null then 'new'\s+else 'existing'\s+end/i);
assert.match(rpc, /insert into public\.customers as c \(name, phone, email\)/i);
assert.match(rpc, /on conflict \(normalized_phone\) do update/i);
assert.match(rpc, /customer_id/i);
assert.match(rpc, /'new'::public\.lead_status/i);
assert.match(rpc, /case\s+when v_property_id is null then 'website-form'::public\.lead_source\s+else 'property-enquiry'::public\.lead_source\s+end/i);
assert.match(rpc, /'Enquiry received'/i);
assert.match(rpc, /'New enquiry submitted from the public contact form\.'/i);
assert.match(rpc, /'New enquiry submitted from a property page\.'/i);
assert.match(rpc, /customer_context/i);
assert.match(rpc, /return;/i);
assert(!/\breturn\s+query\b/i.test(rpc), 'RPC must not return rows');
assert(rpc.indexOf('insert into public.lead_activities') < rpc.indexOf('insert into public.broker_notifications ('));
assert(rpc.indexOf('insert into public.customers as c') < rpc.indexOf('insert into public.leads ('));

// Customer creation happens in the same RPC transaction and the unique
// constraint remains the final concurrency guard.
assert.match(rpc, /on conflict \(normalized_phone\) do update/i);

// --- Owner and execution privileges -----------------------------------
assert.match(sql, /alter function public\.submit_public_lead\(text, text, text, text, text\)\s+owner to postgres/i);
assert.match(sql, /revoke all on function public\.submit_public_lead\(text, text, text, text, text\)\s+from public/i);
assert.match(sql, /revoke all on function public\.submit_public_lead\(text, text, text, text, text\)\s+from anon, authenticated/i);
assert.match(sql, /grant execute on function public\.submit_public_lead\(text, text, text, text, text\)\s+to anon/i);

// --- Previous migration semantics remain intact -----------------------
assert.match(previous, /create table public\.broker_notifications/i);
assert(!/customers/i.test(previous), 'previous migration must remain unchanged');

// --- Documentation and SQL verification exist -------------------------
assert(fs.existsSync(path.join(root, 'tests', 'sql', 'customer-centric-enquiries.sql')), 'SQL verification script is missing');

const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
assert(!packageJson.includes('service_role'), 'no service-role key may be added');

console.log('Customer migration schema, backfill, RPC, authorization and notification checks passed.');
