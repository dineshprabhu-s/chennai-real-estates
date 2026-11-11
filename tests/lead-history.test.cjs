/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let authorized = true, failure = false, rows = [], calls = [];
function load(file, imports) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {}; vm.runInNewContext(code,{exports,require:n=>imports[n] ?? (n === 'server-only' ? {} : require(n)),Promise,Number,Math,Error,TypeError,Array,Object,String,Map}); return exports;
}
const statuses=['new','contacted','visit-scheduled','negotiation','converted','closed-lost'];
const client={from(table) {let filters=[],orders=[],range,head=false,search=''; const state={table,filters,orders};calls.push(state); const q={
 select(columns,opts){state.columns=columns;head=!!opts?.head;return q;}, eq(k,v){filters.push(x=>x[k]===v);return q;}, is(k,v){filters.push(x=>x[k]===v);return q;},
 in(k,v){filters.push(x=>v.includes(x[k]));return q;}, or(v,opts){if(opts?.referencedTable){state.relatedOr=v;return q;} state.or=v; const m=v.match(/\.ilike\."%([^%]*)%"/); search=m?m[1].toLowerCase():'';return q;},
 order(k,o){orders.push([k,o.ascending]);return q;}, range(a,b){range=[a,b];state.range=range;return q;},
 then(resolve){if(failure)return resolve({data:null,count:null,error:{message:'private'}});let result=(table==='leads'?rows:[]).filter(x=>filters.every(f=>f(x)));
 if(search)result=result.filter(x=>['id','name','phone','email','property_id','message'].some(k=>String(x[k]??'').toLowerCase().includes(search)) || (x.property_id && ['sunlit flat','madipakkam'].some(v=>v.includes(search))));
 const count=result.length; result=[...result].sort((a,b)=>{for(const [k,asc] of orders){const n=String(a[k]).localeCompare(String(b[k]));if(n)return asc?n:-n;}return 0;}); if(range)result=result.slice(range[0],range[1]+1);return resolve({data:head?null:result,count,error:null});}
 };return q;}};
const imports={'@/lib/auth/broker':{requireBroker:async()=>{if(!authorized)throw Error('denied');}},'@/lib/supabase/server':{createSupabaseServerClient:async()=>client},'@/lib/supabase/mappers/broker-lead':{mapBrokerLead:r=>({id:r.id,name:r.name,propertyId:r.property_id})},'@/modules/leads/constants':{leadStatusOptions:statuses.map(value=>({value}))}};
const queries=load('src/lib/supabase/queries/broker-leads.ts',imports);
function filters(x={}){return {page:1,query:'',status:'all',source:'all',propertyId:'all',...x};}
(async()=>{
 rows=Array.from({length:80},(_,i)=>({id:`LEAD-${String(i).padStart(4,'0')}`,name:`Customer ${i}`,phone:`900000${String(i).padStart(4,'0')}`,email:`person${i}@example.test`,message:'enquiry text',property_id:i%2?'MAD-0001':null,status:i%2?'new':'converted',source:i%2?'property-enquiry':'website-form',created_at:i<5?'2020-01-01':'2026-01-01'}));
 let a=await queries.getBrokerLeadPage(filters()); assert.equal(a.total,80);assert.equal(a.matchingTotal,80);assert.equal(a.leads.length,25); assert.equal(a.leads[0].id,'LEAD-0079');assert.equal(a.leads[24].id,'LEAD-0055');
 let b=await queries.getBrokerLeadPage(filters({page:2}));assert.equal(b.leads[0].id,'LEAD-0054'); assert.equal(new Set([...a.leads,...b.leads].map(x=>x.id)).size,50);
 let old=await queries.getBrokerLeadPage(filters({page:4}));assert.equal(old.leads.length,5);assert.equal(old.leads[4].id,'LEAD-0000');
 for(const term of ['LEAD-0000','Customer 0','9000000000','person0@example.test']) {let r=await queries.getBrokerLeadPage(filters({query:term}));assert.equal(r.leads[0].id,'LEAD-0000');}
 let combined=await queries.getBrokerLeadPage(filters({query:'MAD-0001',status:'new',source:'property-enquiry',propertyId:'MAD-0001'}));assert.equal(combined.matchingTotal,40);assert.equal(combined.total,80);
 assert.equal((await queries.getBrokerLeadPage(filters({propertyId:'general',status:'converted'}))).matchingTotal,40);
 assert.equal((await queries.getBrokerLeadPage(filters({query:'sunlit flat'}))).matchingTotal,40);
 assert.equal((await queries.getBrokerLeadPage(filters({query:'madipakkam'}))).matchingTotal,40);
 assert.equal((await queries.getBrokerLeadPage(filters({query:'no match'}))).matchingTotal,0);
 await queries.getBrokerLeadPage(filters({query:'a,b"%_'}));const leadCall=calls.findLast(x=>x.table==='leads' && x.or);assert(leadCall.or.includes('\\"'));assert(leadCall.or.includes('\\%'));assert(leadCall.or.includes('\\_'));
 failure=true;await assert.rejects(queries.getBrokerLeadPage(filters()),/Failed to fetch/);failure=false;authorized=false;await assert.rejects(queries.getBrokerLeadPage(filters()),/denied/);
 const ui=fs.readFileSync('src/app/admin/(dashboard)/leads/admin-leads-client.tsx','utf8');assert(ui.includes('loadBrokerLeadHistory'));assert(ui.includes('350'));assert(ui.includes('Previous'));assert(ui.includes('Next'));assert(ui.includes('initialDeepLead'));
 console.log('Lead-history pagination, filters, search, counts, ordering, errors and authorization checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
