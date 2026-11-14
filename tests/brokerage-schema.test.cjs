/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS SQL check */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20261112000001_brokerage_accounting.sql',
);
const customerMigrationPath = path.join(
  root,
  'supabase',
  'migrations',
  '20261112000000_customer_centric_enquiries.sql',
);
const sqlTestPath = path.join(root, 'tests', 'sql', 'brokerage-accounting.sql');

assert(fs.existsSync(migrationPath), 'brokerage accounting migration was not found');
assert(
  fs.existsSync(customerMigrationPath),
  'customer-centric migration was not found',
);
assert(fs.existsSync(sqlTestPath), 'brokerage SQL verification script is missing');

const sql = fs.readFileSync(migrationPath, 'utf8');
const customerSql = fs.readFileSync(customerMigrationPath, 'utf8');
const sqlTest = fs.readFileSync(sqlTestPath, 'utf8');

// --- Forward-only and scoped -------------------------------------------
assert(!/\bdrop\s+table\b/i.test(sql), 'migration must not drop tables');
assert(!/\bdrop\s+column\b/i.test(sql), 'migration must not drop columns');
assert(!/\btruncate\s+(table\s+)?public\./i.test(sql), 'migration must not truncate data');
assert(
  !/alter table public\.(leads|customers|properties)\b/i.test(sql),
  'brokerage migration must not alter existing customer, lead or property tables',
);
assert(
  !/create or replace function public\.submit_public_lead/i.test(sql),
  'brokerage migration must not change the public lead RPC',
);

// The existing customer migration must still contain its customer table and
// summary view; this migration only adds financial tables.
assert.match(customerSql, /create table public\.customers/i);
assert.match(customerSql, /create view public\.broker_customer_summary/i);

// --- Enumerations -------------------------------------------------------
assert.match(
  sql,
  /create type public\.deal_status as enum \(\s*'pending',\s*'partially_paid',\s*'fully_paid',\s*'cancelled'\s*\)/i,
);
assert.match(
  sql,
  /create type public\.payment_method as enum \(\s*'cash',\s*'upi',\s*'bank_transfer',\s*'cheque',\s*'other'\s*\)/i,
);

// --- Deals --------------------------------------------------------------
assert.match(sql, /create table public\.deals/i);
assert.match(sql, /transaction_amount numeric\(14, 2\) not null/i);
assert.match(sql, /expected_brokerage numeric\(14, 2\)/i);
assert.match(sql, /agreed_brokerage numeric\(14, 2\) not null/i);
assert.match(sql, /closing_date date not null/i);
assert.match(sql, /status public\.deal_status not null default 'pending'/i);
assert.match(sql, /constraint deals_lead_id_key unique \(lead_id\)/i);
assert.match(sql, /constraint deals_transaction_amount_positive\s+check \(transaction_amount > 0\)/i);
assert.match(
  sql,
  /constraint deals_expected_brokerage_non_negative\s+check \(expected_brokerage is null or expected_brokerage >= 0\)/i,
);
assert.match(
  sql,
  /constraint deals_agreed_brokerage_non_negative\s+check \(agreed_brokerage >= 0\)/i,
);
assert.match(
  sql,
  /constraint deals_agreed_brokerage_within_transaction\s+check \(agreed_brokerage <= transaction_amount\)/i,
);
assert.match(
  sql,
  /constraint deals_lead_id_fkey\s+foreign key \(lead_id\) references public\.leads \(id\)\s+on update cascade on delete restrict/i,
);
assert.match(
  sql,
  /constraint deals_customer_id_fkey\s+foreign key \(customer_id\) references public\.customers \(id\)\s+on update cascade on delete restrict/i,
);
assert.match(
  sql,
  /constraint deals_property_id_fkey\s+foreign key \(property_id\) references public\.properties \(id\)\s+on update cascade on delete restrict/i,
);
assert(
  !/collected_brokerage/.test(
    sql.slice(sql.indexOf('create table public.deals'), sql.indexOf('create table public.brokerage_payments')),
  ),
  'deals must not store a manually editable collected total',
);

// --- Payments -----------------------------------------------------------
assert.match(sql, /create table public\.brokerage_payments/i);
assert.match(sql, /amount numeric\(14, 2\) not null/i);
assert.match(sql, /payment_date timestamptz not null/i);
assert(
  !/payment_date timestamptz not null default/i.test(sql),
  'payment_date must be supplied explicitly, not defaulted to now()',
);
assert.match(sql, /payment_method public\.payment_method not null/i);
assert.match(sql, /constraint brokerage_payments_amount_positive\s+check \(amount > 0\)/i);
assert.match(
  sql,
  /constraint brokerage_payments_deal_id_fkey\s+foreign key \(deal_id\) references public\.deals \(id\)\s+on update cascade on delete restrict/i,
);
assert.match(
  sql,
  /create trigger brokerage_payments_append_only\s+before update or delete on public\.brokerage_payments/i,
);
assert.match(sql, /prevent_brokerage_payment_mutation/i);
assert.match(sql, /Brokerage payments are append-only/i);
assert.match(sql, /errcode = 'P0007'/i);

// --- Validation triggers and concurrency guard -------------------------
assert.match(sql, /create function public\.validate_deal\(\)/i);
assert.match(sql, /create trigger deals_validate_relationship\s+before insert or update on public\.deals/i);
assert.match(
  sql,
  /if tg_op = 'UPDATE' then[\s\S]*?\belse\b[\s\S]*?select l\.customer_id, l\.property_id, l\.status/i,
  'deal lead checks must run only on INSERT',
);
assert.match(sql, /if v_lead_status <> 'converted' then/i);
assert.match(sql, /Deals require a converted lead/i);
assert.match(sql, /Deal enquiry, customer and property cannot be changed/i);
assert.match(sql, /Cancelled deals cannot be reopened/i);
assert.match(sql, /Deals with payments cannot be cancelled/i);
assert.match(sql, /Deal status is derived from brokerage payments/i);

const validateDealSql = sql.slice(
  sql.indexOf('create function public.validate_deal()'),
  sql.indexOf('create trigger deals_set_updated_at'),
);
assert.equal(
  (validateDealSql.match(/from public\.leads l/g) || []).length,
  1,
  'the deal trigger must read the lead exactly once, on INSERT only',
);

assert.match(sql, /create function public\.validate_brokerage_payment\(\)/i);
assert.match(
  sql,
  /from public\.deals d\s+where d\.id = new\.deal_id\s+for update/i,
  'payment validation must lock the parent deal row',
);
assert.match(sql, /Payment exceeds the agreed brokerage/i);
assert.match(sql, /Payments cannot be recorded against a cancelled deal/i);
assert.match(sql, /create trigger brokerage_payments_validate_insert\s+before insert on public\.brokerage_payments/i);
assert.match(sql, /create function public\.apply_brokerage_payment_status\(\)/i);
assert.match(sql, /create trigger brokerage_payments_apply_status\s+after insert on public\.brokerage_payments/i);

// --- Security and grants ------------------------------------------------
assert.match(sql, /alter table public\.deals enable row level security/i);
assert.match(sql, /alter table public\.brokerage_payments enable row level security/i);
assert.match(sql, /create policy deals_broker_select[\s\S]*?to authenticated[\s\S]*?public\.is_broker\(\)/i);
assert.match(sql, /create policy deals_broker_insert[\s\S]*?to authenticated[\s\S]*?public\.is_broker\(\)/i);
assert.match(sql, /create policy deals_broker_update[\s\S]*?to authenticated[\s\S]*?public\.is_broker\(\)/i);
assert.match(
  sql,
  /create policy brokerage_payments_broker_select[\s\S]*?to authenticated[\s\S]*?public\.is_broker\(\)/i,
);
assert.match(
  sql,
  /create policy brokerage_payments_broker_insert[\s\S]*?to authenticated[\s\S]*?public\.is_broker\(\)/i,
);
assert(!/create policy\s+\w+\s+on public\.(deals|brokerage_payments)\s+for delete/i.test(sql), 'no delete policy may exist');

assert.match(sql, /revoke all on public\.deals from public, anon, authenticated/i);
assert.match(sql, /grant select, insert on public\.deals to authenticated/i);
assert.match(sql, /grant update \(\s*transaction_amount,\s*expected_brokerage,\s*agreed_brokerage,\s*invoice_number,\s*closing_date,\s*status,\s*notes\s*\) on public\.deals to authenticated/i);
assert(!/grant .*\bdelete\b.* on public\.deals/i.test(sql), 'no role may receive deal DELETE');
assert.match(sql, /revoke all on public\.brokerage_payments from public, anon, authenticated/i);
assert.match(sql, /grant select, insert on public\.brokerage_payments to authenticated/i);
assert(!/grant .*\bupdate\b.* on public\.brokerage_payments/i.test(sql), 'payments must not be updatable');
assert(!/grant .*\bdelete\b.* on public\.brokerage_payments/i.test(sql), 'payments must not be deletable');
assert.match(sql, /revoke delete, truncate on public\.deals from service_role/i);
assert.match(sql, /revoke update, delete, truncate on public\.brokerage_payments from service_role/i);
assert.match(sql, /alter function public\.validate_deal\(\) owner to postgres/i);

// --- Reporting foundation ----------------------------------------------
assert.match(sql, /create view public\.broker_deal_summary/i);
assert.match(sql, /create view public\.broker_brokerage_monthly/i);
assert.match(sql, /with \(security_invoker = true\)/i);
assert.match(sql, /date_trunc\(\s*'month',\s*bp\.payment_date at time zone 'Asia\/Kolkata'\s*\)/i);
assert(
  !/date_trunc\([\s\S]{0,80}closing_date/i.test(sql),
  'monthly revenue must not group by closing_date',
);
assert(!/d\.closing_date/.test(sql.slice(sql.indexOf('create view public.broker_brokerage_monthly'))), 'monthly view must not read closing_date');
assert.match(sql, /grant select on public\.broker_deal_summary to authenticated/i);
assert.match(sql, /grant select on public\.broker_brokerage_monthly to authenticated/i);
assert(!/grant select on public\.broker_deal_summary to anon/i.test(sql), 'anonymous deal summary access must not be granted');
assert(!/grant select on public\.broker_brokerage_monthly to anon/i.test(sql), 'anonymous revenue access must not be granted');

// --- SQL verification script shape -------------------------------------
assert.match(sqlTest, /^-- Chennai Real Estates/m);
assert.match(sqlTest, /\nbegin;/i);
assert.match(sqlTest, /\nrollback;\s*$/i);
assert.match(sqlTest, /deals_lead_id_key/);
assert.match(sqlTest, /non-converted lead/i);
assert.match(sqlTest, /overpaying installment/i);
assert.match(sqlTest, /monthly revenue did not use the payment date/i);
assert.match(sqlTest, /a deal update failed after the source lead changed/i);
assert.match(sqlTest, /lead drift changed the deal associations/i);
assert.match(sqlTest, /zero agreed brokerage deal accepted a payment/i);
assert.match(sqlTest, /brokerage payments are append-only|a brokerage payment was updated/i);
assert.match(sqlTest, /cancelled deal was reopened/i);
assert.match(sqlTest, /set local role anon/i);
assert.match(sqlTest, /set local role authenticated/i);
assert.match(sqlTest, /P0005/);
assert.match(sqlTest, /P0006/);
assert.match(sqlTest, /P0007/);
assert.match(sqlTest, /Sequential|sequential, not a real multi-session test/i);

const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
assert(!packageJson.includes('service_role'), 'no service-role key may be added');

console.log('Brokerage accounting migration schema, integrity, authorization and reporting checks passed.');
