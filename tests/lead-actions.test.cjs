/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS test harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const actionsPath = 'src/app/admin/(dashboard)/leads/actions.ts';

function load(file, imports = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => imports[name] ?? (name === 'server-only' ? {} : require(name)),
    Object, Array, String, Number, Error, TypeError, Promise, Math, Date, RegExp,
  });
  return exports;
}

const constants = load('src/modules/leads/constants.ts');

let events;
let scenario;
let authorized;
let revalidateThrows;

function reset() {
  events = [];
  authorized = true;
  revalidateThrows = false;
  scenario = {
    lead: { id: 'LEAD-2001', status: 'new', is_demo: false },
    updated: { id: 'LEAD-2001', status: 'contacted' },
    errors: {},
  };
}

function write(table, operation, value, filters) {
  events.push(['write', table, operation, value, filters]);
}

function execute(state) {
  if (state.operation === 'select') {
    const error = state.table === 'leads' ? scenario.errors.leadsRead : undefined;
    if (error) return { data: null, error };
    return { data: scenario.lead, error: null };
  }

  if (state.operation === 'update') {
    if (scenario.errors.leadsUpdate) return { data: null, error: scenario.errors.leadsUpdate };
    write(state.table, 'update', state.value, state.filters);
    return { data: scenario.updated, error: null };
  }

  if (state.operation === 'insert') {
    if (state.table === 'lead_notes' && scenario.errors.noteInsert) {
      return { data: null, error: scenario.errors.noteInsert };
    }
    if (state.table === 'lead_activities' && scenario.errors.activityInsert) {
      return { data: null, error: scenario.errors.activityInsert };
    }
    write(state.table, 'insert', state.value);
    return { data: null, error: null };
  }

  throw new Error(`Unexpected fake query operation: ${state.operation}`);
}

function makeQuery(state) {
  const query = {
    select(columns) {
      state.columns = columns;
      return query;
    },
    eq(column, value) {
      state.filters.push([column, value]);
      return query;
    },
    update(value) {
      state.operation = 'update';
      state.value = value;
      return query;
    },
    insert(value) {
      state.operation = 'insert';
      state.value = value;
      return query;
    },
    maybeSingle() {
      return Promise.resolve(execute(state));
    },
    then(resolve, reject) {
      return Promise.resolve(execute(state)).then(resolve, reject);
    },
  };
  return query;
}

const fakeClient = {
  from(table) {
    const state = {
      table, operation: 'select', columns: null, value: null, filters: [],
    };
    events.push(['from', table]);
    return makeQuery(state);
  },
};

const actions = load(actionsPath, {
  'next/cache': {
    revalidatePath: (value) => {
      events.push(['revalidate', value]);
      if (revalidateThrows) throw new Error('PRIVATE CACHE FAILURE');
    },
  },
  '@/lib/auth/broker': {
    requireBroker: async () => {
      events.push(['auth']);
      if (!authorized) throw new Error('redirect denied');
    },
  },
  '@/lib/supabase/server': {
    createSupabaseServerClient: async () => {
      events.push(['client']);
      return fakeClient;
    },
  },
  '@/modules/leads/constants': constants,
});

const writes = () => events.filter((event) => event[0] === 'write');
const revalidated = () => events.filter((event) => event[0] === 'revalidate').map((event) => event[1]);
const tablesTouched = () => events.filter((event) => event[0] === 'from').map((event) => event[1]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertIso(value) {
  assert.equal(typeof value, 'string');
  assert.equal(new Date(value).toISOString(), value);
}

async function main() {
  // --- Authorization precedes client and database access ----------------
  for (const [label, run] of [
    ['status', () => actions.updateBrokerLeadStatus('LEAD-2001', 'contacted')],
    ['note', () => actions.addBrokerLeadNote('LEAD-2001', 'Follow up')],
  ]) {
    reset();
    authorized = false;
    await assert.rejects(run, /redirect denied/, label);
    assert.deepEqual(events, [['auth']], label);
  }

  // --- Status: valid update ---------------------------------------------
  reset();
  scenario.lead = { id: 'LEAD-2001', status: 'new', is_demo: false };
  scenario.updated = { id: 'LEAD-2001', status: 'contacted' };
  let result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.deepEqual(events.slice(0, 2), [['auth'], ['client']]);
  assert.deepEqual(Array.from(writes(), (event) => [event[1], event[2]]), [
    ['leads', 'update'],
    ['lead_activities', 'insert'],
  ]);
  const statusUpdate = writes()[0][3];
  assert.deepEqual(Object.keys(statusUpdate), ['status']);
  assert.equal(statusUpdate.status, 'contacted');
  const statusActivity = writes()[1][3];
  assert.deepEqual(Object.keys(statusActivity).sort(), ['detail', 'id', 'label', 'lead_id', 'occurred_at']);
  assert.match(statusActivity.id, uuid);
  assertIso(statusActivity.occurred_at);
  assert.equal(statusActivity.lead_id, 'LEAD-2001');
  assert.equal(statusActivity.label, 'Status changed to Contacted');
  assert.equal(statusActivity.detail, 'Moved from New to Contacted.');
  assert.deepEqual(revalidated(), ['/admin/leads', '/admin/dashboard']);

  // Conditional update uses the previously read status.
  assert.deepEqual(Array.from(writes()[0][4]), [
    ['id', 'LEAD-2001'],
    ['status', 'new'],
  ]);

  // --- Status: all six allowed values -----------------------------------
  for (const status of constants.leadStatusOptions.map((option) => option.value)) {
    reset();
    const previous = status === 'new' ? 'contacted' : 'new';
    scenario.lead = { id: 'LEAD-2001', status: previous, is_demo: false };
    scenario.updated = { id: 'LEAD-2001', status };
    result = await actions.updateBrokerLeadStatus('LEAD-2001', status);
    assert.equal(result.ok, true, status);
    assert.equal(writes()[0][3].status, status, status);
    assert.equal(writes()[1][3].label, `Status changed to ${constants.leadStatusLabels[status]}`, status);
  }

  // --- Status: validation ----------------------------------------------
  reset();
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'archived');
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'validation');
  assert.deepEqual(events, [['auth']]);

  for (const badId of ['', ' LEAD-2001', 'LEAD-2001 ', '../LEAD-2001', 42]) {
    reset();
    result = await actions.updateBrokerLeadStatus(badId, 'contacted');
    assert.equal(result.kind, 'validation');
    assert.deepEqual(events, [['auth']]);
  }

  // --- Status: missing and demo leads ----------------------------------
  reset();
  scenario.lead = null;
  result = await actions.updateBrokerLeadStatus('LEAD-404', 'contacted');
  assert.equal(result.kind, 'not-found');
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  reset();
  scenario.lead = { id: 'LEAD-1001', status: 'new', is_demo: true };
  result = await actions.updateBrokerLeadStatus('LEAD-1001', 'contacted');
  assert.equal(result.kind, 'demo');
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  // Client-supplied demo flags are not part of the action input.
  reset();
  scenario.lead = { id: 'LEAD-1001', status: 'new', is_demo: true };
  result = await actions.updateBrokerLeadStatus('LEAD-1001', 'contacted', false);
  assert.equal(result.kind, 'demo');
  assert.equal(writes().length, 0);

  // --- Status: same value is a no-op -----------------------------------
  reset();
  scenario.lead = { id: 'LEAD-2001', status: 'contacted', is_demo: false };
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  // --- Status: conflict -------------------------------------------------
  reset();
  scenario.updated = null;
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.kind, 'conflict');
  assert.equal(writes().length, 1);
  assert.equal(tablesTouched().includes('lead_activities'), false);
  assert.deepEqual(revalidated(), []);

  // --- Status: read/update failures never log activity ------------------
  reset();
  scenario.errors.leadsRead = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.kind, 'database');
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.equal(writes().length, 0);

  reset();
  scenario.errors.leadsUpdate = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.kind, 'database');
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.equal(writes().length, 0);
  assert.equal(tablesTouched().includes('lead_activities'), false);
  assert.deepEqual(revalidated(), []);

  // --- Status: partial success when activity logging fails -------------
  reset();
  scenario.errors.activityInsert = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.match(result.warning, /activity entry could not be logged/);
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.deepEqual(revalidated(), ['/admin/leads', '/admin/dashboard']);

  // --- Status: cache refresh failure still reports the saved write ------
  reset();
  revalidateThrows = true;
  result = await actions.updateBrokerLeadStatus('LEAD-2001', 'contacted');
  assert.equal(result.ok, true);
  assert.match(result.warning, /could not be refreshed/);

  // --- Note: valid save -------------------------------------------------
  reset();
  result = await actions.addBrokerLeadNote('LEAD-2001', '  Follow up tomorrow.  ');
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.deepEqual(Array.from(writes(), (event) => [event[1], event[2]]), [
    ['lead_notes', 'insert'],
    ['lead_activities', 'insert'],
  ]);
  const noteInsert = writes()[0][3];
  assert.deepEqual(Object.keys(noteInsert).sort(), ['body', 'lead_id']);
  assert.equal(noteInsert.lead_id, 'LEAD-2001');
  assert.equal(noteInsert.body, 'Follow up tomorrow.');
  const noteActivity = writes()[1][3];
  assert.deepEqual(Object.keys(noteActivity).sort(), ['detail', 'id', 'label', 'lead_id', 'occurred_at']);
  assert.match(noteActivity.id, uuid);
  assertIso(noteActivity.occurred_at);
  assert.equal(noteActivity.label, 'Internal note added');
  assert.equal(noteActivity.detail, 'A broker note was added.');
  assert(!noteActivity.detail.includes('Follow up tomorrow.'));
  assert.deepEqual(revalidated(), ['/admin/leads', '/admin/dashboard']);

  // --- Note: validation -------------------------------------------------
  for (const body of ['', '   ', '\n\t', null, 42]) {
    reset();
    result = await actions.addBrokerLeadNote('LEAD-2001', body);
    assert.equal(result.kind, 'validation', String(body));
    assert.deepEqual(events, [['auth']], String(body));
  }

  for (const badId of ['', ' LEAD-2001', '../LEAD-2001', 42]) {
    reset();
    result = await actions.addBrokerLeadNote(badId, 'Valid note');
    assert.equal(result.kind, 'validation');
    assert.deepEqual(events, [['auth']]);
  }

  // --- Note: missing and demo leads ------------------------------------
  reset();
  scenario.lead = null;
  result = await actions.addBrokerLeadNote('LEAD-404', 'Valid note');
  assert.equal(result.kind, 'not-found');
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  reset();
  scenario.lead = { id: 'LEAD-1001', status: 'new', is_demo: true };
  result = await actions.addBrokerLeadNote('LEAD-1001', 'Valid note');
  assert.equal(result.kind, 'demo');
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  // --- Note: failures never create activity or partial success ----------
  reset();
  scenario.errors.leadsRead = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.addBrokerLeadNote('LEAD-2001', 'Valid note');
  assert.equal(result.kind, 'database');
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.equal(writes().length, 0);

  reset();
  scenario.errors.noteInsert = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.addBrokerLeadNote('LEAD-2001', 'Valid note');
  assert.equal(result.kind, 'database');
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.equal(writes().length, 0);
  assert.equal(tablesTouched().includes('lead_activities'), false);
  assert.deepEqual(revalidated(), []);

  reset();
  scenario.errors.activityInsert = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.addBrokerLeadNote('LEAD-2001', 'Valid note');
  assert.equal(result.ok, true);
  assert.match(result.warning, /activity entry could not be logged/);
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.deepEqual(revalidated(), ['/admin/leads', '/admin/dashboard']);

  reset();
  revalidateThrows = true;
  result = await actions.addBrokerLeadNote('LEAD-2001', 'Valid note');
  assert.equal(result.ok, true);
  assert.match(result.warning, /could not be refreshed/);

  // --- Static security checks ------------------------------------------
  const source = fs.readFileSync(path.join(root, actionsPath), 'utf8');
  assert(!source.includes('createPublicSupabaseClient'));
  assert(!source.includes('public-server'));
  assert(!source.includes('SERVICE_ROLE'));
  assert(!/service_role/i.test(source));
  assert(!/\.select\(\s*["'`]\*/.test(source));
  assert(!source.includes('use cache'));
  assert(source.includes('await requireBroker()'));
  assert(source.includes('createSupabaseServerClient'));
  assert(source.includes('randomUUID'));
  assert(source.includes('is_demo'));
  assert(source.includes('.eq("status", existing.status)'));

  // --- UI integration ---------------------------------------------------
  const clientPath = 'src/app/admin/(dashboard)/leads/admin-leads-client.tsx';
  const client = fs.readFileSync(path.join(root, clientPath), 'utf8');
  assert(client.includes('updateBrokerLeadStatus'));
  assert(client.includes('addBrokerLeadNote'));
  assert(client.includes('from "./actions"'));
  assert((client.match(/router\.refresh\(\)/g) ?? []).length === 2);
  assert(client.includes('pending !== null'));
  assert(client.includes('!selectedLead || pending !== null || selectedLead.isDemo'));
  assert(client.includes('selectedLead.isDemo'));
  assert(client.includes('initialStatus'));
  assert(client.includes('initialLeadId'));
  assert(client.includes('setPropertyId'));
  assert(client.includes('setStatus'));
  assert(client.includes('disabled={selectedLead.isDemo || pending !== null}'));
  assert(client.includes('(selectedLead.notes ?? []).map'));
  assert(client.includes('(selectedLead.activities ?? []).map'));
  assert(client.includes('note.createdAt'));
  assert(client.includes('activity.at'));
  assert(!client.includes('Preview change from the admin inbox.'));
  assert(!client.includes('browser preview only'));
  const clearIndex = client.indexOf('setNoteDraft("");');
  const successIndex = client.lastIndexOf('if (!result.ok) {');
  assert(clearIndex > successIndex && successIndex >= 0, 'note draft must clear after the success check');

  const pagePath = 'src/app/admin/(dashboard)/leads/page.tsx';
  const page = fs.readFileSync(path.join(root, pagePath), 'utf8');
  assert(page.includes('searchParams'));
  assert(page.includes('params.lead'));
  assert(page.includes('params.status'));
  assert(page.includes('getBrokerLeadPage'));
  assert(page.includes('getBrokerLeadById'));
  assert(!page.includes('modules/leads/queries'));

  console.log('Guarded lead status, note, activity, partial-success, demo, security and UI wiring tests passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
