/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS SQL check */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migrationDir = path.join(root, 'supabase', 'migrations');
const originalMigration = fs
  .readdirSync(migrationDir)
  .find((name) => name.endsWith('_public_lead_submission.sql'));

assert(originalMigration, 'public lead submission migration was not found');
const correctiveMigration = '20261110000000_reject_blank_public_lead_property_id.sql';
assert(fs.existsSync(path.join(migrationDir, correctiveMigration)), 'corrective migration was not found');

function verifyMigration(migrationName) {
const migrationPath = path.join(migrationDir, migrationName);
const sql = fs.readFileSync(migrationPath, 'utf8');
const compact = sql.replace(/\s+/g, ' ').trim();
const sqlTestPath = path.join(root, 'tests', 'sql', 'public-lead-rpc.sql');
const sqlTest = fs.readFileSync(sqlTestPath, 'utf8');

// --- Function signature and deployment characteristics ---------------------
assert.match(
  compact,
  /create or replace function public\.submit_public_lead\s*\(\s*p_name text, p_phone text, p_email text, p_message text, p_property_id text default null\s*\) returns void language plpgsql security definer set search_path = ''/i,
  'function signature, return type, language, security, or fixed search path is incorrect',
);

assert.match(
  compact,
  /alter function public\.submit_public_lead\(text, text, text, text, text\) owner to postgres/i,
  'function owner is not explicitly set to the trusted migration role',
);

// --- Privileges ------------------------------------------------------------
assert.match(
  compact,
  /revoke all on function public\.submit_public_lead\(text, text, text, text, text\) from public/i,
  'PUBLIC execute was not revoked',
);
assert.match(
  compact,
  /revoke all on function public\.submit_public_lead\(text, text, text, text, text\) from anon, authenticated/i,
  'anon/authenticated execute was not revoked before granting',
);
assert.match(
  compact,
  /grant execute on function public\.submit_public_lead\(text, text, text, text, text\) to anon/i,
  'anon execute was not granted',
);
assert.doesNotMatch(
  compact,
  /grant execute on function public\.submit_public_lead\([^)]*\) to (authenticated|public)/i,
  'execute must not be granted to authenticated or PUBLIC',
);

// --- No table/RLS/sequence changes -----------------------------------------
for (const forbidden of [
  /create policy/i,
  /alter policy/i,
  /drop policy/i,
  /alter table public\.(leads|lead_notes|lead_activities|properties)/i,
  /create table/i,
  /drop table/i,
  /grant (select|insert|update|delete|all) on (table )?public\.(leads|lead_notes|lead_activities)/i,
  /revoke (select|insert|update|delete|all) on (table )?public\.(leads|lead_notes|lead_activities)/i,
  /grant (usage|select|update) on sequence public\.lead_id_seq/i,
  /grant usage on schema/i,
  /create role/i,
  /alter role/i,
  /set role/i,
]) {
  assert.doesNotMatch(sql, forbidden, `migration must not contain ${forbidden}`);
}

// --- Approved parameters only ----------------------------------------------
for (const forbidden of [
  'p_source',
  'p_status',
  'p_is_demo',
  'p_id',
  'p_created_at',
  'p_updated_at',
]) {
  assert.equal(sql.includes(forbidden), false, `${forbidden} must not be a caller parameter`);
}

// --- No dynamic SQL --------------------------------------------------------
assert.doesNotMatch(sql, /execute\s+format/i, 'dynamic SQL is not allowed');
assert.doesNotMatch(sql, /\bexecute\s+'/i, 'dynamic SQL is not allowed');
assert.doesNotMatch(sql, /\bformat\s*\(/i, 'format() must not be used to build SQL');

// --- Input validation ------------------------------------------------------
assert.match(compact, /pg_catalog\.btrim\(p_name, E' \\t\\n\\r\\f\\v'\)/i, 'name is not whitespace-trimmed');
assert.match(compact, /pg_catalog\.char_length\(v_name\) < 2/i, 'name minimum is missing');
assert.match(compact, /pg_catalog\.char_length\(v_name\) > 120/i, 'name maximum is missing');
assert.match(compact, /pg_catalog\.regexp_replace\(v_phone, '\[\^0-9\]', '', 'g'\)/i, 'phone is not normalized to digits');
assert.match(compact, /pg_catalog\.char_length\(v_phone_digits\) not between 10 and 15/i, 'phone digit range is missing');
assert.match(compact, /v_email is not null and \( pg_catalog\.char_length\(v_email\) > 254/i, 'email maximum is missing');
assert.match(compact, /v_email !~ '\^\[\^\[:space:\]@\]\+@\[\^\[:space:\]@\]\+\[\.\]\[\^\[:space:\]@\]\+\$'/i, 'email shape check is missing');
assert.match(compact, /pg_catalog\.char_length\(v_message\) < 10/i, 'message minimum is missing');
assert.match(compact, /pg_catalog\.char_length\(v_message\) > 4000/i, 'message maximum is missing');
assert.match(compact, /pg_catalog\.char_length\(v_property_id\) > 64/i, 'property ID maximum is missing');
if (migrationName === correctiveMigration) {
  assert.match(compact, /v_property_id text := pg_catalog\.btrim\(\s*p_property_id,\s*E' \\t\\n\\r\\f' \|\| pg_catalog\.chr\(11\)\s*\)/i, 'property ID must trim vertical tabs while preserving NULL');
  assert.match(compact, /if p_property_id is not null and v_property_id = '' then raise exception 'Invalid enquiry' using errcode = '22023'/i, 'explicit blank property IDs must be rejected');
  assert.doesNotMatch(compact, /when p_property_id is null or pg_catalog\.btrim\(p_property_id[^)]*\) = '' then null/i, 'blank property IDs must not become NULL');
}

// --- Property visibility ---------------------------------------------------
assert.match(
  compact,
  /from public\.properties p where p\.id = v_property_id and p\.status in \('available', 'under-offer'\)/i,
  'public property visibility check is missing',
);
assert.match(compact, /raise exception 'Property unavailable' using errcode = 'P0001'/i, 'unavailable property error is missing');

// --- Source, status, demo flag ---------------------------------------------
assert.match(compact, /when v_property_id is null then 'website-form'::public\.lead_source/i, 'website-form source is missing');
assert.match(compact, /else 'property-enquiry'::public\.lead_source/i, 'property-enquiry source is missing');
assert.match(compact, /'new'::public\.lead_status/i, 'new status is not forced');
assert.match(
  compact,
  /insert into public\.leads \( name, phone, email, message, property_id, status, source, is_demo \) values \( v_name, v_phone_digits, v_email, v_message, v_property_id, 'new'::public\.lead_status, v_source, false \)/i,
  'lead insert must use only approved fields and force status/is_demo',
);
assert.match(compact, /returning id into v_lead_id/i, 'generated lead ID is not captured internally');
assert.match(compact, /returns void/i, 'function must return void');
assert.doesNotMatch(compact, /returns table/i, 'function must not return a table');
assert.doesNotMatch(compact, /return v_lead_id/i, 'function must not return the lead ID');

// --- Duplicate guard and concurrency --------------------------------------
assert.match(compact, /pg_catalog\.pg_advisory_xact_lock\(/i, 'transaction-scoped advisory lock is missing');
assert.match(compact, /pg_catalog\.hashtext\(v_phone_digits\)/i, 'phone is not part of the advisory lock key');
assert.match(compact, /l\.property_id is not distinct from v_property_id/i, 'null-safe property comparison is missing');
assert.match(compact, /l\.created_at > pg_catalog\.now\(\) - interval '60 seconds'/i, '60-second duplicate window is missing');
assert.match(compact, /raise exception 'Duplicate enquiry' using errcode = 'P0002'/i, 'duplicate error is missing');

// --- Atomic initial activity ----------------------------------------------
assert.match(compact, /insert into public\.lead_activities \( id, lead_id, occurred_at, label, detail \) values \( pg_catalog\.gen_random_uuid\(\)::text, v_lead_id, pg_catalog\.now\(\), 'Enquiry received'/i, 'initial activity insert is missing or incomplete');
assert.match(compact, /New enquiry submitted from the public contact form\./i, 'general activity detail is missing');
assert.match(compact, /New enquiry submitted from a property page\./i, 'property activity detail is missing');
assert.doesNotMatch(compact, /insert into public\.lead_notes/i, 'public submission must not create a note');

// --- Generic exception text -----------------------------------------------
for (const line of sql.split(/\r?\n/)) {
  if (/raise exception/i.test(line)) {
    assert.doesNotMatch(line, /v_name|v_phone|v_email|v_message|v_property_id|p_name|p_phone|p_email|p_message|p_property_id/i, `exception text may contain PII: ${line.trim()}`);
  }
}

// --- No secrets or unrelated changes --------------------------------------
for (const forbidden of ['service_role', 'SERVICE_ROLE', 'SUPABASE_SECRET', '.env.local', 'create extension']) {
  assert.equal(sql.includes(forbidden), false, `migration must not reference ${forbidden}`);
}

// --- SQL verification script coverage -------------------------------------
for (const required of [
  'SECURITY DEFINER',
  'search_path',
  'owner',
  'has_function_privilege',
  'has_table_privilege',
  'has_sequence_privilege',
  'pg_advisory_xact_lock',
  'Duplicate enquiry',
  'Enquiry received',
  'New enquiry submitted from the public contact form.',
  'New enquiry submitted from a property page.',
  'P0001',
  'P0002',
  'rollback',
  'Manual atomicity check',
  'empty property ID was accepted',
  'whitespace-only property ID was accepted',
  'vertical-tab-only property ID was accepted',
]) {
  assert.equal(sqlTest.includes(required), true, `SQL verification script is missing: ${required}`);
}
assert.match(sqlTest, /empty property ID was accepted';\s*exception when sqlstate '22023'/i);
assert.match(sqlTest, /whitespace-only property ID was accepted';\s*exception when sqlstate '22023'/i);
assert.match(sqlTest, /public\.submit_public_lead\([^;]*pg_catalog\.chr\(11\)\);\s*raise exception 'FAIL: vertical-tab-only property ID was accepted';\s*exception when sqlstate '22023'/i);

console.log(`Public lead submission RPC checks passed for ${migrationName}.`);
}

verifyMigration(originalMigration);
verifyMigration(correctiveMigration);
console.log('SQL verification script exists; no SQL was executed.');
