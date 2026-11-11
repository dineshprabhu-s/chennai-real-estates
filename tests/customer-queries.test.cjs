/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS test harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function load(file, imports = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => imports[name] ?? (name === 'server-only' ? {} : require(name)),
    Object, Array, String, Number, Boolean, Error, TypeError, Promise, Map, Math, Date, RegExp,
  });
  return exports;
}

let calls;
let store;
let authorized;
let errorFor;

function reset() {
  calls = [];
  authorized = true;
  errorFor = {};
  store = {
    broker_customer_summary: [],
    leads: [],
    lead_notes: [],
    lead_activities: [],
  };
}

function unescapeLike(value) {
  return value.replace(/\\(["%_])/g, '$1');
}

function applyFilters(row, filters) {
  return filters.every((filter) => {
    if (filter.kind === 'eq') return row[filter.column] === filter.value;
    if (filter.kind === 'in') return filter.value.includes(row[filter.column]);
    if (filter.kind === 'gt') return Number(row[filter.column]) > Number(filter.value);
    if (filter.kind === 'gte') {
      const left = row[filter.column];
      const right = filter.value;
      if (typeof left === 'string' && typeof right === 'string' && /^\d{4}-/.test(right)) {
        return left >= right;
      }
      return Number(left) >= Number(right);
    }
    if (filter.kind === 'or') {
      return filter.fields.some((field) => {
        const current = field.split('.').reduce((value, key) => value?.[key], row);
        return String(current ?? '').toLowerCase().includes(filter.term.toLowerCase());
      });
    }
    throw new Error(`Unsupported filter ${filter.kind}`);
  });
}

function compare(left, right, ascending, nullsFirst) {
  const leftNull = left === null || left === undefined;
  const rightNull = right === null || right === undefined;
  if (leftNull || rightNull) {
    if (leftNull && rightNull) return 0;
    const first = nullsFirst ?? !ascending;
    return leftNull === first ? -1 : 1;
  }
  const a = typeof left === 'number' ? left : String(left);
  const b = typeof right === 'number' ? right : String(right);
  const compared = a < b ? -1 : a > b ? 1 : 0;
  return ascending ? compared : -compared;
}

function execute(state) {
  const failure = errorFor[state.table];
  if (failure) return { data: null, count: null, error: failure };

  const source = store[state.table] ?? [];
  let rows = source.filter((row) => applyFilters(row, state.filters));
  const count = rows.length;

  rows = [...rows];
  if (state.orders.length > 0) {
    rows.sort((left, right) => {
      for (const [column, ascending, nullsFirst] of state.orders) {
        const compared = compare(left[column], right[column], ascending, nullsFirst);
        if (compared !== 0) return compared;
      }
      return 0;
    });
  }

  if (state.single) return { data: rows[0] ?? null, count: null, error: null };
  if (state.options?.head) return { data: null, count, error: null };

  if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1);
  else if (typeof state.limit === 'number') rows = rows.slice(0, state.limit);

  return { data: rows, count: state.options?.count ? count : null, error: null };
}

function makeQuery(state) {
  const query = {
    select(columns, options) {
      state.columns = columns;
      state.options = options ?? null;
      return query;
    },
    eq(column, value) {
      state.filters.push({ kind: 'eq', column, value });
      return query;
    },
    in(column, values) {
      state.filters.push({ kind: 'in', column, value: values });
      return query;
    },
    gt(column, value) {
      state.filters.push({ kind: 'gt', column, value });
      return query;
    },
    gte(column, value) {
      state.filters.push({ kind: 'gte', column, value });
      return query;
    },
    or(expression) {
      const matches = [...expression.matchAll(/([\w.]+)\.ilike\."(.*?)"/g)];
      state.filters.push({
        kind: 'or',
        expression,
        fields: matches.map((match) => match[1]),
        term: matches.length > 0 ? unescapeLike(matches[0][2].slice(1, -1)) : '',
      });
      return query;
    },
    order(column, options) {
      state.orders.push([column, options?.ascending !== false, options?.nullsFirst]);
      return query;
    },
    range(from, to) {
      state.range = [from, to];
      return query;
    },
    limit(value) {
      state.limit = value;
      return query;
    },
    maybeSingle() {
      state.single = true;
      return query;
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
      table, columns: null, options: null, filters: [], orders: [],
      range: null, limit: null, single: false,
    };
    calls.push(state);
    return makeQuery(state);
  },
};

const constants = load('src/modules/leads/constants.ts');
const customerConstants = load('src/modules/customers/constants.ts');
const leadMapper = load('src/lib/supabase/mappers/broker-lead.ts');
const customerMapper = load('src/lib/supabase/mappers/broker-customer.ts');

const leadQueries = load('src/lib/supabase/queries/broker-leads.ts', {
  '@/lib/auth/broker': {
    requireBroker: async () => {
      calls.push({ table: 'auth' });
      if (!authorized) throw new Error('redirect denied');
    },
  },
  '@/lib/supabase/server': {
    createSupabaseServerClient: async () => {
      calls.push({ table: 'client' });
      return fakeClient;
    },
  },
  '@/lib/supabase/mappers/broker-lead': leadMapper,
  '@/modules/leads/constants': constants,
});

const queries = load('src/lib/supabase/queries/broker-customers.ts', {
  '@/lib/auth/broker': {
    requireBroker: async () => {
      calls.push({ table: 'auth' });
      if (!authorized) throw new Error('redirect denied');
    },
  },
  '@/lib/supabase/server': {
    createSupabaseServerClient: async () => {
      calls.push({ table: 'client' });
      return fakeClient;
    },
  },
  '@/lib/supabase/mappers/broker-lead': leadMapper,
  '@/lib/supabase/mappers/broker-customer': customerMapper,
  '@/lib/supabase/queries/broker-leads': leadQueries,
  '@/modules/customers/constants': customerConstants,
});

function customer(index, extra = {}) {
  const padded = String(index).padStart(4, '0');
  return {
    id: `CUST-${padded}`,
    name: `Customer ${padded}`,
    phone: `900001${padded}`,
    email: `customer${padded}@example.test`,
    normalized_phone: `900001${padded}`,
    created_at: `2026-10-${String((index % 28) + 1).padStart(2, '0')}T00:00:00+00:00`,
    updated_at: '2026-11-01T00:00:00+00:00',
    enquiry_count: 1,
    active_enquiry_count: 0,
    latest_enquiry_at: `2026-11-${String((index % 28) + 1).padStart(2, '0')}T00:00:00+00:00`,
    is_demo: false,
    latest_activity_label: 'Enquiry received',
    latest_activity_at: `2026-11-${String((index % 28) + 1).padStart(2, '0')}T01:00:00+00:00`,
    ...extra,
  };
}

function lead(id, customerId, createdAt, extra = {}) {
  return {
    id,
    name: `Snapshot ${id}`,
    phone: '919000012345',
    email: 'snapshot@example.test',
    message: 'Please share more details about this property.',
    property_id: 'MAD-0001',
    customer_id: customerId,
    customers: { name: 'Current Customer', phone: '9000012345', email: 'current@example.test' },
    status: 'new',
    created_at: createdAt,
    source: 'property-enquiry',
    is_demo: false,
    updated_at: createdAt,
    ...extra,
  };
}

function note(id, leadId, createdAt, body = `Note ${id}`) {
  return { id, lead_id: leadId, body, created_at: createdAt };
}

function activity(id, leadId, occurredAt, label = 'Enquiry received', detail = null) {
  return { id, lead_id: leadId, occurred_at: occurredAt, label, detail };
}

function tableCalls(table) {
  return calls.filter((call) => call && call.table === table);
}

async function main() {
  // --- Listing, pagination and ordering ---------------------------------
  reset();
  store.broker_customer_summary = Array.from({ length: 60 }, (_, index) =>
    customer(index + 1, {
      latest_enquiry_at: new Date(Date.UTC(2026, 10, 1, 0, 0, index)).toISOString(),
    }),
  );
  let page = await queries.getBrokerCustomerPage({ page: 1, query: '', sort: 'recent-enquiry' });
  assert.equal(page.total, 60);
  assert.equal(page.matchingTotal, 60);
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 25);
  assert.equal(page.customers.length, 25);
  assert.equal(page.customers[0].id, 'CUST-0060');
  assert.equal(page.customers[0].enquiryCount, 1);

  page = await queries.getBrokerCustomerPage({ page: 3, query: '', sort: 'recent-enquiry' });
  assert.equal(page.customers.length, 10);
  assert.equal(page.customers[0].id, 'CUST-0010');
  assert.equal(page.customers[9].id, 'CUST-0001');

  // Invalid page numbers are clamped to page 1.
  page = await queries.getBrokerCustomerPage({ page: -4, query: '', sort: 'recent-enquiry' });
  assert.equal(page.page, 1);

  // --- Search across customer identity ---------------------------------
  reset();
  store.broker_customer_summary = [
    customer(1, { name: 'Ravi Kumar' }),
    customer(2, { name: 'Meena' }),
    customer(3, { email: 'special@example.test' }),
  ];
  assert.equal((await queries.getBrokerCustomerPage({ page: 1, query: 'Ravi', sort: 'name' })).matchingTotal, 1);
  assert.equal((await queries.getBrokerCustomerPage({ page: 1, query: 'CUST-0002', sort: 'name' })).matchingTotal, 1);
  assert.equal((await queries.getBrokerCustomerPage({ page: 1, query: 'special@', sort: 'name' })).matchingTotal, 1);
  assert.equal((await queries.getBrokerCustomerPage({ page: 1, query: '9000010001', sort: 'name' })).matchingTotal, 1);
  assert.equal((await queries.getBrokerCustomerPage({ page: 1, query: 'no such customer', sort: 'name' })).matchingTotal, 0);

  await queries.getBrokerCustomerPage({ page: 1, query: 'a,b"%_', sort: 'name' });
  const searchCalls = tableCalls('broker_customer_summary').filter((call) =>
    call.filters.some((filter) => filter.kind === 'or'),
  );
  assert(searchCalls.length > 0, 'search must use a PostgREST or filter');
  const searchFilter = searchCalls.at(-1).filters.find((filter) => filter.kind === 'or');
  assert(searchFilter.expression.includes('\\"'));
  assert(searchFilter.expression.includes('\\%'));
  assert(searchFilter.expression.includes('\\_'));

  // --- Sorting ----------------------------------------------------------
  reset();
  store.broker_customer_summary = [
    customer(1, { name: 'Zara', latest_activity_at: null }),
    customer(2, { name: 'Aarav', latest_activity_at: '2026-11-02T00:00:00+00:00' }),
    customer(3, { name: 'Meena', latest_activity_at: '2026-11-03T00:00:00+00:00' }),
  ];
  let sorted = await queries.getBrokerCustomerPage({ page: 1, query: '', sort: 'name' });
  assert.deepEqual(Array.from(sorted.customers, (row) => row.name), ['Aarav', 'Meena', 'Zara']);
  sorted = await queries.getBrokerCustomerPage({ page: 1, query: '', sort: 'recent-activity' });
  assert.deepEqual(Array.from(sorted.customers, (row) => row.name), ['Meena', 'Aarav', 'Zara']);
  assert.deepEqual(
    Array.from(tableCalls('broker_customer_summary').at(-2).orders),
    [['latest_activity_at', false, false], ['latest_enquiry_at', false, false], ['id', false, undefined]],
  );

  await assert.rejects(
    () => queries.getBrokerCustomerPage({ page: 1, query: '', sort: 'unknown' }),
    /Invalid customer sort/,
  );

  // --- Statistics -------------------------------------------------------
  reset();
  const now = new Date();
  const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const old = '2020-01-01T00:00:00+00:00';
  store.broker_customer_summary = [
    customer(1, { enquiry_count: 3, active_enquiry_count: 1, created_at: recent }),
    customer(2, { enquiry_count: 2, active_enquiry_count: 0, created_at: recent }),
    customer(3, { enquiry_count: 1, active_enquiry_count: 0, created_at: old }),
  ];
  const stats = await queries.getBrokerCustomerStats();
  assert.deepEqual(JSON.parse(JSON.stringify(stats)), { total: 3, withActiveEnquiries: 1, repeatCustomers: 2, newLast30Days: 2 });

  // --- Detail with full enquiry history --------------------------------
  reset();
  store.broker_customer_summary = [
    customer(1, { enquiry_count: '2', active_enquiry_count: '1', latest_enquiry_at: '2026-11-02T00:00:00+00:00' }),
  ];
  store.leads = [
    lead('LEAD-0001', 'CUST-0001', '2026-11-01T00:00:00+00:00'),
    lead('LEAD-0002', 'CUST-0001', '2026-11-02T00:00:00+00:00', { status: 'contacted' }),
    lead('LEAD-0003', 'CUST-0002', '2026-11-03T00:00:00+00:00'),
  ];
  store.lead_notes = [
    note(1, 'LEAD-0001', '2026-11-01T02:00:00+00:00', 'Later note'),
    note(2, 'LEAD-0001', '2026-11-01T01:00:00+00:00', 'Earlier note'),
  ];
  store.lead_activities = [
    activity('ACT-2', 'LEAD-0001', '2026-11-01T02:00:00+00:00', 'Called'),
    activity('ACT-1', 'LEAD-0001', '2026-11-01T01:00:00+00:00', 'Received'),
  ];

  const detail = await queries.getBrokerCustomerById('CUST-0001');
  assert.equal(detail.id, 'CUST-0001');
  assert.equal(detail.enquiryCount, 2);
  assert.equal(detail.activeEnquiryCount, 1);
  assert.deepEqual(Array.from(detail.enquiries, (row) => row.id), ['LEAD-0002', 'LEAD-0001']);
  assert.equal(detail.enquiries[1].name, 'Current Customer');
  assert.equal(detail.enquiries[1].message, 'Please share more details about this property.');
  assert.deepEqual(Array.from(detail.enquiries[1].notes, (row) => row.body), ['Earlier note', 'Later note']);
  assert.deepEqual(Array.from(detail.enquiries[1].activities, (row) => row.id), ['ACT-1', 'ACT-2']);

  assert.equal(await queries.getBrokerCustomerById('CUST-9999'), null);
  await assert.rejects(() => queries.getBrokerCustomerById('../CUST-0001'), TypeError);
  await assert.rejects(() => queries.getBrokerCustomerById('LEAD-0001'), TypeError);

  reset();
  errorFor.broker_customer_summary = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  await assert.rejects(() => queries.getBrokerCustomerById('CUST-0001'), (error) => {
    assert.match(error.message, /Failed to fetch broker customer by ID/);
    assert(!error.message.includes('PRIVATE SQL SECRET'));
    return true;
  });

  // --- Authorization precedes every database access ---------------------
  for (const run of [
    () => queries.getBrokerCustomerPage({ page: 1, query: '', sort: 'recent-enquiry' }),
    () => queries.getBrokerCustomerStats(),
    () => queries.getBrokerCustomerById('CUST-0001'),
  ]) {
    reset();
    authorized = false;
    await assert.rejects(run, /redirect denied/);
    assert.deepEqual(calls, [{ table: 'auth' }]);
  }

  // --- Static security checks ------------------------------------------
  const source = fs.readFileSync(path.join(root, 'src/lib/supabase/queries/broker-customers.ts'), 'utf8');
  assert(!source.includes('createPublicSupabaseClient'));
  assert(!source.includes('public-server'));
  assert(!source.includes('SERVICE_ROLE'));
  assert(!/service_role/i.test(source));
  assert(!/\.select\(\s*["'`]\*/.test(source));
  assert(source.includes('await requireBroker()'));
  assert(source.includes('createSupabaseServerClient'));
  assert(source.includes('broker_customer_summary'));
  assert(source.includes('latest_enquiry_at'));
  assert(source.includes('customer_id'));

  // --- UI wiring -------------------------------------------------------
  const listing = fs.readFileSync(path.join(root, 'src/app/admin/(dashboard)/customers/admin-customers-client.tsx'), 'utf8');
  assert(listing.includes('loadBrokerCustomerHistory'));
  assert(listing.includes('setPage'));
  assert(listing.includes('setSort'));
  assert(listing.includes('Previous'));
  assert(listing.includes('Next'));
  assert(listing.includes('350'));
  assert(listing.includes('/admin/customers/'));

  const detailPage = fs.readFileSync(path.join(root, 'src/app/admin/(dashboard)/customers/[id]/page.tsx'), 'utf8');
  assert(detailPage.includes('getBrokerCustomerById'));
  assert(detailPage.includes('/admin/leads?lead='));
  assert(detailPage.includes('CustomerEditForm'));
  assert(detailPage.includes('notFound'));

  const navigation = fs.readFileSync(path.join(root, 'src/config/admin-navigation.ts'), 'utf8');
  assert(navigation.includes('/admin/customers'));
  assert(navigation.includes('Customers'));

  console.log('Customer listing, search, sorting, pagination, metrics, details, guards and UI checks passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
