/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const migration = fs.readFileSync('supabase/migrations/20261111000000_broker_notifications.sql', 'utf8');
const previous = fs.readFileSync('supabase/migrations/20261110000000_reject_blank_public_lead_property_id.sql', 'utf8');
const rpc = s => s.slice(s.indexOf('create or replace function public.submit_public_lead('));
const inserted = "  -- This insert is part of the same transaction as the lead and activity.\n  insert into public.broker_notifications (lead_id, notification_type)\n  values (v_lead_id, 'new_enquiry');\n\n";
assert.equal(rpc(migration).replace(inserted, ''), rpc(previous), 'existing RPC behavior and privileges must remain unchanged');
assert(migration.indexOf('insert into public.lead_activities') < migration.indexOf('insert into public.broker_notifications (lead_id'));
assert.match(migration, /enable row level security/i);
assert.match(migration, /grant update \(read_at\)/i);
assert.match(migration, /for select to authenticated using \(public\.is_broker\(\)\)/i);
assert.match(migration, /for update to authenticated using \(public\.is_broker\(\)\)/i);
assert.match(migration, /on delete set null/i);
let allowed = true, fail = false, records = [], projections = [];
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? (name === 'server-only' ? {} : require(name)), Promise, Number, Math, Error, Array, Object, String, Date });
  return exports;
}
const client = { from() {
  let filters = [], orders = [], head = false, single = false, update, limit;
  const q = { select(columns, options) { projections.push(columns); head = !!options?.head; return q; },
    eq(k,v) { filters.push(x=>x[k]===v); return q; }, is(k,v) { filters.push(x=>x[k]===v); return q; },
    order(k,o) { orders.push([k,o.ascending]); return q; }, limit(n) { limit=n; return q; },
    update(v) { update=v; return q; }, maybeSingle() { single=true; return q; },
    then(resolve) { if(fail) return resolve({data:null,count:null,error:{code:'500'}}); let data=records.filter(x=>filters.every(f=>f(x)));
      if(update) data.forEach(x=>Object.assign(x, update)); const count=data.length;
      data=[...data].sort((a,b)=>{for(const [key,asc] of orders){const n=String(a[key]).localeCompare(String(b[key]));if(n)return asc?n:-n;}return 0;});
      if(limit!==undefined)data=data.slice(0,limit); return resolve({data:head?null:single?(data[0]??null):data,count,error:null}); }
  }; return q;
}};
const auth = { requireBroker:async()=>{if(!allowed)throw Error('denied');} };
const imports={ 'server-only':{}, '@/lib/auth/broker':auth, '@/lib/supabase/server':{createSupabaseServerClient:async()=>client} };
const queries=load('src/lib/supabase/queries/broker-notifications.ts',imports);
const actions=load('src/app/admin/(dashboard)/notification-actions.ts',{...imports,'@/lib/supabase/queries/broker-notifications':queries});
(async()=>{
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 records=[{id:a,lead_id:'LEAD-1',created_at:'2026-01-01',read_at:null,leads:{name:'Test',property_id:null}},{id:b,lead_id:'LEAD-2',created_at:'2026-01-02',read_at:null,leads:{name:'Test',property_id:'MAD-0001'}}];
 let s=await queries.getBrokerNotifications(); assert.equal(s.unreadCount,2); assert.equal(s.items[0].id,b); assert.equal(s.items[0].propertyId,'MAD-0001');
 assert(!projections.join(',').includes('phone')); assert(!projections.join(',').includes('message')); assert(!projections.includes('*'));
 assert.equal((await actions.markBrokerNotificationRead(a)).ok,true); assert.equal((await actions.markBrokerNotificationRead(a)).ok,true); s=await queries.getBrokerNotifications(); assert.equal(s.unreadCount,1);
 assert.equal((await actions.markAllBrokerNotificationsRead()).ok,true); assert.equal((await queries.getBrokerNotifications()).unreadCount,0);
 assert.equal((await actions.markBrokerNotificationRead('invalid')).ok,false);
 records=[]; assert.equal((await queries.getBrokerNotifications()).items.length,0);
 fail=true; assert.equal((await actions.loadBrokerNotifications()).ok,false); assert.equal((await actions.markBrokerNotificationRead(a)).ok,false); assert.equal((await actions.markAllBrokerNotificationsRead()).ok,false);
 fail=false; allowed=false; await assert.rejects(actions.loadBrokerNotifications()); await assert.rejects(actions.markBrokerNotificationRead(a)); await assert.rejects(actions.markAllBrokerNotificationsRead());
 const ui=fs.readFileSync('src/components/layout/notification-bell.tsx','utf8'); assert.match(ui,/30000/); assert.match(ui,/clearInterval/); assert.match(ui,/encodeURIComponent\(leadId\)/); assert.match(ui,/Mark all as read/); assert.match(ui,/notifications\.map|snapshot\.items\.map/); assert.match(ui,/You’re all caught up/);
 console.log('Notification migration, guarded queries, read actions, errors and UI wiring checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
