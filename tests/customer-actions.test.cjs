/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS test harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const actionsPath = 'src/app/admin/(dashboard)/customers/actions.ts';

function load(file, imports = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => imports[name] ?? (name === 'server-only' ? {} : require(name)),
    Object, Array, String, Number, Boolean, Error, TypeError, Promise, Math, Date, RegExp,
  });
  return exports;
}

const validation = load('src/lib/validation/customer.ts');

let events;
let scenario;
let authorized;
let revalidateThrows;

function reset() {
  events = [];
  authorized = true;
  revalidateThrows = false;
  scenario = {
    customer: {
      id: 'CUST-0001',
      name: 'Ravi Kumar',
      phone: '9000012345',
      email: 'ravi@example.com',
      is_demo: false,
    },
    updated: { id: 'CUST-0001' },
    readError: null,
    updateError: null,
  };
}

function execute(state) {
  if (state.table === 'broker_customer_summary' && state.operation === 'select') {
    if (scenario.readError) return { data: null, error: scenario.readError };
    return { data: scenario.customer, error: null };
  }

  if (state.table === 'customers' && state.operation === 'update') {
    if (scenario.updateError) return { data: null, error: scenario.updateError };
    events.push(['write', state.value, state.filters]);
    return { data: scenario.updated, error: null };
  }

  throw new Error(`Unexpected fake query: ${state.table}/${state.operation}`);
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
    const state = { table, operation: 'select', columns: null, value: null, filters: [] };
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
  '@/lib/validation/customer': validation,
});

const writes = () => events.filter((event) => event[0] === 'write');
const revalidated = () => events.filter((event) => event[0] === 'revalidate').map((event) => event[1]);
const form = () => fs.readFileSync(path.join(root, 'src/app/admin/(dashboard)/customers/[id]/customer-edit-form.tsx'), 'utf8');

async function main() {
  const valid = { name: 'Ravi Kumar', phone: '9000012345', email: 'ravi@example.com' };

  // --- Authorization precedes client and database access ----------------
  reset();
  authorized = false;
  await assert.rejects(() => actions.updateBrokerCustomer('CUST-0001', valid), /redirect denied/);
  assert.deepEqual(events, [['auth']]);

  // --- Valid update -----------------------------------------------------
  reset();
  let result = await actions.updateBrokerCustomer('CUST-0001', {
    name: '  Ravi Kumar  ',
    phone: ' +91 90000 12345 ',
    email: ' ravi@example.com ',
  });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.deepEqual(events.slice(0, 2), [['auth'], ['client']]);
  assert.equal(writes().length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(writes()[0][1])), {
    name: 'Ravi Kumar',
    phone: '+91 90000 12345',
    email: 'ravi@example.com',
  });
  assert.deepEqual(writes()[0][2], [['id', 'CUST-0001']]);
  assert.deepEqual(revalidated(), [
    '/admin/customers',
    '/admin/customers/CUST-0001',
    '/admin/leads',
    '/admin/dashboard',
  ]);

  // --- Validation never reaches the database ----------------------------
  for (const [id, input, field] of [
    ['', valid, 'id'],
    ['../CUST-0001', valid, 'id'],
    ['CUST-0001', { name: 'A', phone: '9000012345' }, 'name'],
    ['CUST-0001', { name: 'Ravi', phone: '12345' }, 'phone'],
    ['CUST-0001', { name: 'Ravi', phone: '9000012345', email: 'bad' }, 'email'],
  ]) {
    reset();
    result = await actions.updateBrokerCustomer(id, input);
    assert.equal(result.ok, false, field);
    assert.equal(result.kind, 'validation', field);
    assert(result.fields[field], `${field} must be reported`);
    assert.deepEqual(events, [['auth']]);
  }

  // --- Missing and demo customers --------------------------------------
  reset();
  scenario.customer = null;
  result = await actions.updateBrokerCustomer('CUST-9999', valid);
  assert.equal(result.kind, 'not-found');
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  reset();
  scenario.customer = { ...scenario.customer, is_demo: true };
  result = await actions.updateBrokerCustomer('CUST-1001', valid);
  assert.equal(result.kind, 'demo');
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  // A caller cannot claim a customer is not demo: only the database row counts.
  reset();
  scenario.customer = { ...scenario.customer, is_demo: true };
  result = await actions.updateBrokerCustomer('CUST-1001', { ...valid, isDemo: false });
  assert.equal(result.kind, 'demo');
  assert.equal(writes().length, 0);

  // --- Unchanged values are a no-op ------------------------------------
  reset();
  result = await actions.updateBrokerCustomer('CUST-0001', valid);
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(writes().length, 0);
  assert.deepEqual(revalidated(), []);

  // --- Phone conflict is rejected, and no auto-merge happens ------------
  reset();
  scenario.updateError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  result = await actions.updateBrokerCustomer('CUST-0001', { ...valid, phone: '9000012346' });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'conflict');
  assert.match(result.message, /already uses this phone number/);
  assert.equal(result.fields.phone, 'This phone number belongs to another customer.');
  assert.deepEqual(revalidated(), []);

  // --- Concurrent deletion/update conflict -----------------------------
  reset();
  scenario.updated = null;
  result = await actions.updateBrokerCustomer('CUST-0001', { ...valid, phone: '9000012346' });
  assert.equal(result.kind, 'conflict');
  assert.deepEqual(revalidated(), []);

  // --- Database failures are sanitized ---------------------------------
  reset();
  scenario.readError = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.updateBrokerCustomer('CUST-0001', valid);
  assert.equal(result.kind, 'database');
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));
  assert.equal(writes().length, 0);

  reset();
  scenario.updateError = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  result = await actions.updateBrokerCustomer('CUST-0001', { ...valid, phone: '9000012346' });
  assert.equal(result.kind, 'database');
  assert(!JSON.stringify(result).includes('PRIVATE SQL SECRET'));

  // --- Cache refresh failure still reports the saved write --------------
  reset();
  revalidateThrows = true;
  result = await actions.updateBrokerCustomer('CUST-0001', { ...valid, phone: '9000012346' });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.match(result.warning, /could not be refreshed/);

  // --- Static security checks ------------------------------------------
  const source = fs.readFileSync(path.join(root, actionsPath), 'utf8');
  assert(!source.includes('createPublicSupabaseClient'));
  assert(!source.includes('public-server'));
  assert(!source.includes('SERVICE_ROLE'));
  assert(!/service_role/i.test(source));
  assert(!/\.select\(\s*["'`]\*/.test(source));
  assert(source.includes('await requireBroker()'));
  assert(source.includes('createSupabaseServerClient'));
  assert(source.includes('broker_customer_summary'));
  assert(source.includes('is_demo'));
  assert(source.includes('updateBrokerCustomer'));
  assert(!source.includes('delete'));

  // --- Form wiring ------------------------------------------------------
  const editForm = form();
  assert(editForm.includes('updateBrokerCustomer'));
  assert(editForm.includes('from "../actions"'));
  assert(editForm.includes('customer.isDemo'));
  assert(editForm.includes('fields.phone'));
  assert(!editForm.includes('router.push'));

  const detailPage = fs.readFileSync(path.join(root, 'src/app/admin/(dashboard)/customers/[id]/page.tsx'), 'utf8');
  assert(detailPage.includes('CustomerEditForm'));
  assert(detailPage.includes('formatDate'));

  console.log('Customer update validation, conflict, demo, partial-success, security and UI wiring tests passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
