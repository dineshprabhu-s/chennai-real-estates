/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let authorized = true, fail = false, rows = [], areas = [], paths = [];
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => imports[name] ?? (name === 'server-only' ? {} : require(name)), Promise, Number, Math, Error, Array, Object, String });
  return exports;
}
function client() {
  return { from(table) {
    let data = table === 'areas' ? areas : rows, filters = [], orders = [], limit, range, head = false, mutation, single = false;
    const q = {
      select(_c, opts) { head = !!opts?.head; return q; }, eq(k,v) { filters.push(x => x[k] === v); return q; }, in(k,v) { filters.push(x => v.includes(x[k])); return q; },
      order(k,o) { orders.push([k,o.ascending]); return q; }, limit(n) { limit = n; return q; }, range(a,b) { range = [a,b]; return q; },
      insert(v) { mutation = ['insert',v]; return q; }, update(v) { mutation = ['update',v]; return q; }, maybeSingle() { single = true; return q; },
      then(resolve) {
        if (fail) return resolve({ error:{ code:'500' }, data:null, count:null });
        let found = data.filter(x => filters.every(f => f(x)));
        if (mutation) {
          if (mutation[0] === 'insert') { if (areas.some(x => x.slug === mutation[1].slug)) return resolve({error:{code:'23505'}}); areas.push({...mutation[1]}); found = [areas.at(-1)]; }
          else { found.forEach(x => Object.assign(x, mutation[1])); }
        }
        found.sort((a,b) => { for (const [k,asc] of orders) { const n = String(a[k]).localeCompare(String(b[k])); if(n) return asc ? n : -n; } return 0; });
        const count = found.length;
        if(range) found = found.slice(range[0],range[1]+1); if(limit !== undefined) found = found.slice(0,limit);
        return resolve({data:head ? null : single ? (found[0] ?? null) : found, count, error:null});
      },
    }; return q;
  }};
}
const imports = { 'server-only':{}, '@/lib/auth/broker':{ requireBroker:async () => { if (!authorized) throw Error('denied'); } }, '@/lib/supabase/server':{createSupabaseServerClient:async () => client()}, 'next/cache':{revalidatePath:p=>paths.push(p)}, '@/lib/supabase/mappers/area':{mapPublicArea:r=>({slug:r.slug,name:r.name,isActive:r.is_active})} };
const dashboard=load('src/lib/supabase/queries/broker-dashboard.ts', imports);
const areaRead=load('src/lib/supabase/queries/broker-area-management.ts', imports);
const areaActions=load('src/app/admin/(dashboard)/areas/actions.ts', imports);
(async () => {
  rows = [
    {id:'B',status:'available',area_slug:'one',updated_at:'2026-01-02',price:100,listing_type:'sale'},
    {id:'A',status:'under-offer',area_slug:'one',updated_at:'2026-01-02',price:100,listing_type:'sale'},
    {id:'C',status:'sold',area_slug:'one',updated_at:'2026-01-01',price:100,listing_type:'sale'},
    {id:'D',status:'draft',area_slug:'one',updated_at:'2025-01-01',price:100,listing_type:'sale'},
  ];
  let stats=await dashboard.getBrokerPropertyStats(); assert.equal(stats.total,4); assert.equal(stats.available,1); assert.equal(stats.underOffer,1); assert.equal(stats.closed,1);
  const recent=await dashboard.getRecentBrokerProperties(2); assert.equal(recent.length,2); assert.equal(recent[0].id,'A'); assert.equal(recent[1].id,'B');
  areas=[{slug:'one',name:'One',is_active:true}]; let listed=await areaRead.getBrokerAreasWithCounts(); assert.equal(listed[0].propertyCount,4); assert.equal(listed[0].publicPropertyCount,2);
  const valid={slug:'new-area',name:'New area',pincode:'600091',summary:'A valid summary',description:'A valid area description here',highlights:[],isActive:true};
  assert.equal((await areaActions.saveBrokerArea(valid,null)).ok,true); assert(paths.includes('/areas'));
  assert.equal((await areaActions.saveBrokerArea(valid,null)).ok,false);
  assert.equal((await areaActions.saveBrokerArea({...valid,pincode:'bad'},null)).ok,false);
  assert.equal((await areaActions.setBrokerAreaActive('new-area',false)).ok,true); assert.equal(areas[1].is_active,false);
  assert.equal((await areaActions.saveBrokerArea({...valid,name:'Updated area'},'new-area')).ok,true); assert.equal(areas[1].name,'Updated area');
  fail=true; await assert.rejects(dashboard.getBrokerPropertyStats()); await assert.rejects(areaRead.getBrokerAreasWithCounts()); assert.equal((await areaActions.setBrokerAreaActive('new-area',true)).ok,false);
  fail=false; authorized=false; await assert.rejects(dashboard.getRecentBrokerProperties()); await assert.rejects(areaRead.getBrokerAreasWithCounts()); await assert.rejects(areaActions.saveBrokerArea(valid,null));
  authorized=true; rows=[]; areas=[]; stats=await dashboard.getBrokerPropertyStats(); assert.equal(stats.total,0); assert.equal((await dashboard.getRecentBrokerProperties()).length,0); assert.equal((await areaRead.getBrokerAreasWithCounts()).length,0);
  const page=fs.readFileSync('src/app/admin/(dashboard)/dashboard/page.tsx','utf8'); assert(page.includes('encodeURIComponent(property.id)}/edit')); assert(page.includes('No properties yet.'));
  console.log('Broker dashboard and area read/action tests passed.');
})().catch(error => { console.error(error); process.exitCode=1; });
