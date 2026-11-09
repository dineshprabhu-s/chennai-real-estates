/* eslint-disable @typescript-eslint/no-require-imports -- lightweight CommonJS test harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const sourcePath = 'src/lib/supabase/queries/broker-leads.ts';

function load(file, imports = {}) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => imports[name] ?? (name === 'server-only' ? {} : require(name)),
    Object, Array, String, Number, Error, TypeError, Promise, Map, Math, Date,
  });
  return exports;
}

const constants = load('src/modules/leads/constants.ts');
const mapper = load('src/lib/supabase/mappers/broker-lead.ts');

let calls;
let store;
let authorized;
let errorFor;

function reset() {
  calls = [];
  authorized = true;
  errorFor = {};
  store = { leads: [], lead_notes: [], lead_activities: [], properties: [] };
}

function execute(state) {
  const failure = errorFor[state.table];
  if (failure) return { data: null, count: null, error: failure };

  const source = store[state.table] ?? [];
  let rows = source.filter((row) =>
    state.filters.every(([kind, column, value]) =>
      kind === 'eq' ? row[column] === value : value.includes(row[column]),
    ),
  );
  const count = rows.length;

  rows = [...rows];
  if (state.orders.length > 0) {
    rows.sort((left, right) => {
      for (const [column, ascending] of state.orders) {
        const a = String(left[column]);
        const b = String(right[column]);
        const compared = a < b ? -1 : a > b ? 1 : 0;
        if (compared !== 0) return ascending ? compared : -compared;
      }
      return 0;
    });
  }

  if (state.single) return { data: rows[0] ?? null, count: null, error: null };
  if (state.options?.head) return { data: null, count, error: null };

  if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1);
  else if (typeof state.limit === 'number') rows = rows.slice(0, state.limit);

  return {
    data: rows,
    count: state.options?.count ? count : null,
    error: null,
  };
}

function makeQuery(state) {
  const query = {
    select(columns, options) {
      state.columns = columns;
      state.options = options ?? null;
      return query;
    },
    eq(column, value) {
      state.filters.push(['eq', column, value]);
      return query;
    },
    in(column, values) {
      state.filters.push(['in', column, values]);
      return query;
    },
    order(column, options) {
      state.orders.push([column, options?.ascending !== false]);
      return query;
    },
    limit(value) {
      state.limit = value;
      return query;
    },
    range(from, to) {
      state.range = [from, to];
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
      table, columns: null, options: null, filters: [], orders: [], limit: null, range: null, single: false,
    };
    calls.push(state);
    return makeQuery(state);
  },
};

const queries = load(sourcePath, {
  '@/lib/auth/broker': {
    requireBroker: async () => {
      calls.push(['auth']);
      if (!authorized) throw new Error('redirect denied');
    },
  },
  '@/lib/supabase/server': {
    createSupabaseServerClient: async () => {
      calls.push(['client']);
      return fakeClient;
    },
  },
  '@/lib/supabase/mappers/broker-lead': mapper,
  '@/modules/leads/constants': constants,
});

const leadColumns = 'id,name,phone,email,message,property_id,status,created_at,source,is_demo,updated_at';
const statuses = ['new', 'contacted', 'visit-scheduled', 'negotiation', 'converted', 'closed-lost'];

function lead(id, status, createdAt, extra = {}) {
  return {
    id,
    name: `Customer ${id}`,
    phone: '+91 90000 10001',
    email: `${id.toLowerCase()}@example.com`,
    message: 'Please share more details about this property.',
    property_id: 'MAD-0001',
    status,
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
  // --- Mapping -----------------------------------------------------------
  const realRow = lead('LEAD-2001', 'new', '2026-11-08T04:00:00+00:00', {
    email: null,
    property_id: null,
    source: null,
    is_demo: false,
    updated_at: '2026-11-08T05:00:00+00:00',
  });
  const mapped = mapper.mapBrokerLead(
    realRow,
    [note(22, 'LEAD-2001', '2026-11-08T06:00:00+00:00', 'Second'), note(21, 'LEAD-2001', '2026-11-08T05:00:00+00:00', 'First')],
    [activity('ACT-2', 'LEAD-2001', '2026-11-08T07:00:00+00:00'), activity('ACT-1', 'LEAD-2001', '2026-11-08T06:00:00+00:00')],
  );
  assert.equal(mapped.id, 'LEAD-2001');
  assert.equal(mapped.email, null);
  assert.equal(mapped.propertyId, null);
  assert.equal(mapped.source, null);
  assert.equal(mapped.isDemo, false);
  assert.equal(mapped.updatedAt, '2026-11-08T05:00:00+00:00');
  assert.deepEqual(Array.from(mapped.notes, (row) => row.body), ['First', 'Second']);
  assert.deepEqual(Array.from(mapped.notes, (row) => row.id), ['21', '22']);
  assert.deepEqual(Array.from(mapped.activities, (row) => row.id), ['ACT-1', 'ACT-2']);
  assert.equal(mapped.activities[0].detail, undefined);

  const demoMapped = mapper.mapBrokerLead(lead('LEAD-1001', 'new', '2026-11-06T03:45:00+00:00', { is_demo: true }));
  assert.equal(demoMapped.isDemo, true);
  assert.equal(mapper.mapBrokerLeadNote(note('17', 'LEAD-1001', '2026-11-06T04:00:00+00:00')).id, '17');
  assert.equal(mapper.mapBrokerLeadActivity(activity('ACT-9', 'LEAD-1001', '2026-11-06T04:00:00+00:00', 'Called', 'Left a message')).detail, 'Left a message');

  for (const status of statuses) {
    assert.equal(mapper.mapBrokerLead(lead('LEAD-3000', status, '2026-11-01T00:00:00+00:00')).status, status);
  }

  // --- Inbox list --------------------------------------------------------
  reset();
  store.leads = [
    lead('LEAD-1', 'new', '2026-11-01T00:00:00+00:00', { is_demo: true }),
    lead('LEAD-3', 'converted', '2026-11-03T00:00:00+00:00', { email: null, property_id: null, source: null }),
    lead('LEAD-2', 'visit-scheduled', '2026-11-02T00:00:00+00:00'),
  ];
  store.lead_notes = [
    note(102, 'LEAD-1', '2026-11-01T02:00:00+00:00', 'Later'),
    note(101, 'LEAD-1', '2026-11-01T01:00:00+00:00', 'Earlier'),
  ];
  store.lead_activities = [
    activity('ACT-2', 'LEAD-1', '2026-11-01T02:00:00+00:00', 'Called'),
    activity('ACT-1', 'LEAD-1', '2026-11-01T01:00:00+00:00', 'Received'),
  ];

  const inbox = await queries.getBrokerLeads();
  assert.deepEqual(Array.from(inbox.leads, (row) => row.id), ['LEAD-3', 'LEAD-2', 'LEAD-1']);
  assert.equal(inbox.total, 3);
  assert.equal(inbox.limit, queries.BROKER_LEADS_LIMIT);
  assert.equal(inbox.hasMore, false);
  assert.equal(inbox.leads[0].email, null);
  assert.equal(inbox.leads[0].propertyId, null);
  assert.equal(inbox.leads[0].isDemo, false);
  assert.equal(inbox.leads[1].propertyId, 'MAD-0001');
  assert.equal(inbox.leads[2].isDemo, true);
  assert.deepEqual(Array.from(inbox.leads[2].notes, (row) => row.body), ['Earlier', 'Later']);
  assert.deepEqual(Array.from(inbox.leads[2].activities, (row) => row.id), ['ACT-1', 'ACT-2']);

  const leadQuery = tableCalls('leads')[0];
  assert.equal(leadQuery.columns, leadColumns);
  assert(!leadQuery.columns.includes('*'));
  assert.deepEqual(Array.from(leadQuery.orders), [['created_at', false], ['id', false]]);
  assert.equal(leadQuery.limit, queries.BROKER_LEADS_LIMIT);
  const noteQuery = tableCalls('lead_notes')[0];
  assert.equal(noteQuery.columns, 'id,lead_id,body,created_at');
  assert.deepEqual(Array.from(noteQuery.orders), [['lead_id', true], ['created_at', true], ['id', true]]);
  assert.deepEqual(Array.from(tableCalls('lead_activities')[0].orders), [['lead_id', true], ['occurred_at', true], ['id', true]]);

  // Explicit window is reported instead of silently truncating.
  reset();
  store.leads = Array.from({ length: queries.BROKER_LEADS_LIMIT + 1 }, (_, index) =>
    lead(`LEAD-${String(index).padStart(4, '0')}`, 'new', `2026-11-01T00:00:${String(index % 60).padStart(2, '0')}+00:00`),
  );
  const bounded = await queries.getBrokerLeads();
  assert.equal(bounded.leads.length, queries.BROKER_LEADS_LIMIT);
  assert.equal(bounded.total, queries.BROKER_LEADS_LIMIT + 1);
  assert.equal(bounded.hasMore, true);

  // --- Detail ------------------------------------------------------------
  reset();
  store.leads = [lead('LEAD-1', 'new', '2026-11-01T00:00:00+00:00', { is_demo: true })];
  store.lead_notes = [
    note(2, 'LEAD-1', '2026-11-02T00:00:00+00:00', 'Second'),
    note(1, 'LEAD-1', '2026-11-01T00:00:00+00:00', 'First'),
  ];
  store.lead_activities = [
    activity('ACT-2', 'LEAD-1', '2026-11-02T00:00:00+00:00', 'Called', 'Spoke to customer'),
    activity('ACT-1', 'LEAD-1', '2026-11-01T00:00:00+00:00', 'Received'),
  ];
  const detail = await queries.getBrokerLeadById('LEAD-1');
  assert.equal(detail.id, 'LEAD-1');
  assert.deepEqual(Array.from(detail.notes, (row) => row.body), ['First', 'Second']);
  assert.deepEqual(Array.from(detail.activities, (row) => row.id), ['ACT-1', 'ACT-2']);
  assert.equal(tableCalls('leads')[0].columns, leadColumns);
  assert.equal(tableCalls('leads')[0].filters[0][0], 'eq');

  assert.equal(await queries.getBrokerLeadById('LEAD-404'), null);

  reset();
  errorFor.leads = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  await assert.rejects(() => queries.getBrokerLeadById('LEAD-1'), (error) => {
    assert.match(error.message, /Failed to fetch broker lead by ID/);
    assert(!error.message.includes('PRIVATE SQL SECRET'));
    return true;
  });

  reset();
  await assert.rejects(() => queries.getBrokerLeadById(''), TypeError);
  assert.equal(tableCalls('leads').length, 0);

  // --- Statistics --------------------------------------------------------
  reset();
  store.leads = [
    ...statuses.map((status, index) => lead(`LEAD-${index}`, status, '2026-11-01T00:00:00+00:00')),
    lead('LEAD-extra', 'new', '2026-11-02T00:00:00+00:00'),
  ];
  const stats = await queries.getBrokerLeadStats();
  assert.equal(stats.total, 7);
  for (const status of statuses) assert.equal(stats[status], status === 'new' ? 2 : 1);
  assert.equal(stats.new, 2);
  assert.equal(stats.pending, 4);
  assert.equal(stats.scheduledVisits, 1);
  assert.equal(tableCalls('leads').length, 7);
  for (const query of tableCalls('leads')) {
    assert.equal(query.options.head, true);
    assert.equal(query.options.count, 'exact');
    assert.equal(query.columns, 'id');
  }
  assert.deepEqual(
    Array.from(tableCalls('leads').slice(1), (query) => query.filters[0][2]).sort(),
    Array.from(statuses).sort(),
  );

  reset();
  errorFor.leads = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  await assert.rejects(() => queries.getBrokerLeadStats(), (error) => {
    assert.match(error.message, /Failed to count broker leads/);
    assert(!error.message.includes('PRIVATE SQL SECRET'));
    return true;
  });

  // --- Recent leads ------------------------------------------------------
  reset();
  store.leads = Array.from({ length: 8 }, (_, index) =>
    lead(`LEAD-${index}`, 'new', `2026-11-0${index + 1}T00:00:00+00:00`),
  );
  store.lead_notes = [note(1, 'LEAD-7', '2026-11-08T00:00:00+00:00')];
  const recent = await queries.getRecentBrokerLeads(3);
  assert.deepEqual(Array.from(recent, (row) => row.id), ['LEAD-7', 'LEAD-6', 'LEAD-5']);
  assert.deepEqual(Array.from(recent[0].notes), []);
  assert.equal(tableCalls('lead_notes').length, 0);
  assert.equal(tableCalls('leads')[0].limit, 3);
  assert.deepEqual(Array.from(tableCalls('leads')[0].orders), [['created_at', false], ['id', false]]);

  assert.deepEqual(Array.from(await queries.getRecentBrokerLeads(0)), []);
  assert.deepEqual(Array.from(await queries.getRecentBrokerLeads(-5)), []);
  await queries.getRecentBrokerLeads(999);
  assert.equal(tableCalls('leads').at(-1).limit, 20);

  // --- Property options --------------------------------------------------
  reset();
  store.properties = [
    { id: 'MAD-0001', title: 'Available flat', locality: 'Madipakkam', status: 'available', address: 'private', whatsapp_reference: 'private' },
    { id: 'MAD-0002', title: 'Sold flat', locality: 'Madipakkam', status: 'sold', address: 'private', whatsapp_reference: 'private' },
    { id: 'MAD-0003', title: 'Draft flat', locality: 'Keelkattalai', status: 'draft' },
    { id: 'MAD-0004', title: 'Unavailable flat', locality: 'Pallikaranai', status: 'unavailable' },
    { id: 'MAD-0005', title: 'Expired flat', locality: 'Velachery', status: 'expired' },
  ];
  const options = await queries.getBrokerPropertyOptions();
  assert.deepEqual(Array.from(options, (row) => row.id), ['MAD-0001', 'MAD-0002', 'MAD-0003', 'MAD-0004', 'MAD-0005']);
  assert.deepEqual(Array.from(options, (row) => row.status), ['available', 'sold', 'draft', 'unavailable', 'expired']);
  for (const option of options) {
    assert.deepEqual(Object.keys(option).sort(), ['id', 'locality', 'status', 'title']);
    assert(!Object.hasOwn(option, 'address'));
    assert(!Object.hasOwn(option, 'whatsapp_reference'));
  }
  assert.equal(tableCalls('properties')[0].columns, 'id,title,locality,status');
  assert(!tableCalls('properties')[0].columns.includes('*'));

  reset();
  errorFor.properties = { code: 'XX000', message: 'PRIVATE SQL SECRET' };
  await assert.rejects(() => queries.getBrokerPropertyOptions(), (error) => {
    assert.match(error.message, /Failed to fetch broker property options/);
    assert(!error.message.includes('PRIVATE SQL SECRET'));
    return true;
  });

  // --- Authorization precedes every database access ----------------------
  const functions = [
    () => queries.getBrokerLeads(),
    () => queries.getBrokerLeadById('LEAD-1'),
    () => queries.getBrokerLeadStats(),
    () => queries.getRecentBrokerLeads(5),
    () => queries.getBrokerPropertyOptions(),
  ];
  for (const run of functions) {
    reset();
    authorized = false;
    await assert.rejects(run, /redirect denied/);
    assert.deepEqual(calls, [['auth']]);
  }

  // --- Static security checks -------------------------------------------
  const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
  assert(!source.includes('createPublicSupabaseClient'));
  assert(!source.includes('public-server'));
  assert(!source.includes('SERVICE_ROLE'));
  assert(!/service_role/i.test(source));
  assert(!source.includes('demo-leads'));
  assert(!source.includes('demoLeads'));
  assert(!source.includes('use cache'));
  assert(!/\.select\(\s*["'`]\*/.test(source));
  assert(source.includes('await requireBroker()'));
  assert(source.includes('createSupabaseServerClient'));
  assert(source.includes('import "server-only"'));

  const leadsPage = fs.readFileSync(path.join(root, 'src/app/admin/(dashboard)/leads/page.tsx'), 'utf8');
  assert(leadsPage.includes('getBrokerLeads'));
  assert(leadsPage.includes('getBrokerLeadById'));
  assert(leadsPage.includes('getBrokerPropertyOptions'));
  assert(!leadsPage.includes('modules/leads/queries'));
  assert(!leadsPage.includes('modules/properties/queries'));

  const dashboardPage = fs.readFileSync(path.join(root, 'src/app/admin/(dashboard)/dashboard/page.tsx'), 'utf8');
  assert(dashboardPage.includes('getBrokerLeadStats'));
  assert(dashboardPage.includes('getRecentBrokerLeads'));
  assert(!dashboardPage.includes('modules/leads/queries'));
  assert(dashboardPage.includes('lead.isDemo'));

  console.log('Broker lead read, mapping, ordering, stats, window, property and guard tests passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
