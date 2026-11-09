/* eslint-disable @typescript-eslint/no-require-imports -- dependency-free TypeScript VM test */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,imports={}){const source=fs.readFileSync(path.join(root,'src',file),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(code,{exports,require:n=>imports[n]??(n==='server-only'?{}:require(n)),Number,String,Object,Array,Set,Error});return exports;}
const adapter=load('components/forms/property-form-adapter.ts');
const constants=load('modules/properties/constants.ts');
const validation=load('lib/supabase/validation/broker-property-input.ts',{'@/modules/properties/constants':constants});
const writes=load('lib/supabase/mappers/broker-property-write.ts');
function form(entries){const data=new FormData();for(const [k,v] of Object.entries(entries))data.set(k,v);return data;}
const create=form({title:'Test property',summary:'A useful summary',type:'apartment',listingType:'sale',price:'10.00',areaSlug:'madipakkam',locality:'Guperan Nagar',listedAt:'2026-11-08',description:'private',publicDescription:'public',bedrooms:'0',hasLift:'no',features:''});
const created=adapter.adaptPropertyForm(create,'create',new Set());
assert.equal(created.price,'10.00');assert.equal(created.bedrooms,0);assert.equal(created.hasLift,false);assert.equal(created.priceNegotiable,false);assert.equal(created.isFeatured,false);assert.equal(created.description[0],'private');assert.equal(created.publicDescription[0],'public');assert(!Object.hasOwn(created,'brokerageType'));
const areas=[{slug:'madipakkam',name:'Madipakkam',isActive:true}];
assert(validation.validateBrokerPropertyInput(created,'draft',{operation:'create',areas}).ok);
const unchanged=adapter.adaptPropertyForm(form({title:'Changed title',address:'',brokerageType:'percentage',brokerageValue:'2',hasLift:'yes'}),'edit',new Set(['title']));
assert.equal(unchanged.title,'Changed title');for(const f of ['address','brokerageType','brokerageValue','hasLift','status','locality','description','publicDescription'])assert(!Object.hasOwn(unchanged,f),f);
const cleared=adapter.adaptPropertyForm(form({address:'',hasLift:'no',bedrooms:'0',brokerageType:'none',brokerageValue:''}),'edit',new Set(['address','hasLift','bedrooms','brokerageType']));
assert.equal(cleared.address,null);assert.equal(cleared.hasLift,false);assert.equal(cleared.bedrooms,0);assert.equal(cleared.brokerageValue,null);
const descriptions=adapter.adaptPropertyForm(form({description:'private changed',publicDescription:'public changed'}),'edit',new Set(['publicDescription']));assert(!Object.hasOwn(descriptions,'description'));assert.equal(descriptions.publicDescription[0],'public changed');
const existing={area_slug:'madipakkam',approval_status:'unapproved',verification_status:'sample',last_verified_at:null,brokerage_type:null,brokerage_value:null,status:'under-offer'};
const result=validation.validateBrokerPropertyInput(unchanged,'preserve',{operation:'update',areas,existing});assert(result.ok);const patch=writes.mapBrokerPropertyUpdate(result);assert(!Object.hasOwn(patch,'status'));assert.equal(patch.title,'Changed title');
assert(!validation.validateBrokerPropertyInput(created,'preserve',{operation:'create',areas}).ok);
assert.equal(writes.mapBrokerPropertyUpdate(validation.validateBrokerPropertyInput({},'publish',{operation:'update',areas,existing})).status,'available');
assert.equal(writes.mapBrokerPropertyUpdate(validation.validateBrokerPropertyInput({},'draft',{operation:'update',areas,existing})).status,'draft');
console.log('Form adapter and status-preservation checks passed.');
