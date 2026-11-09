/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-this-alias -- CommonJS VM harness uses the installed TypeScript runtime and captures FormData. */
// No browser or extra test dependency is required. Render the real form with a
// minimal hook/JSX harness, then exercise its actual change/submit handlers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let state = [], cursor = 0, captured;
const react = { useRef(initial) { const i=cursor++; if (!(i in state)) state[i]={current:initial}; return state[i]; }, useState(initial) { const i=cursor++; if (!(i in state)) state[i]=typeof initial==='function'?initial():initial; return [state[i], v=>{state[i]=typeof v==='function'?v(state[i]):v}]; } };
const jsx = { jsx:(type,props)=>({type,props:props??{}}), jsxs:(type,props)=>({type,props:props??{}}), Fragment:'Fragment' };
class Element { constructor(name,value,id='') { this.name=name; this.value=value; this.id=id; } }
class InputElement extends Element {}
class SelectElement extends Element {}
class TextareaElement extends Element {}
function visit(node, fn) { if (!node || typeof node!=='object') return; if(Array.isArray(node)){node.forEach(n=>visit(n,fn));return;} fn(node);visit(node.props?.children,fn); }
class TestFormData {
  constructor(tree,submitter) { this.values=new Map();visit(tree,n=>{const p=n.props;if(!p?.name)return;if(p.type==='checkbox'&&!p.defaultChecked)return;let value=p.value??p.defaultValue??'';if(p.type==='checkbox')value='on';this.values.set(p.name,String(value));}); if(submitter)this.values.set(submitter.name,submitter.value);captured=this; }
  get(name){return this.values.get(name)??null;}
  has(name){return this.values.has(name);}
}
function load(file, imports={}) {
  const source=fs.readFileSync(path.join(root,'src',file),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  const exports={};
  const mockRequire=(name)=>{
    if(name in imports)return imports[name];
    if(name==='react')return react;
    if(name==='react/jsx-runtime')return jsx;
    if(name==='server-only')return {};
    if(name==='node:crypto')return require(name);
    if(name==='next/link')return {__esModule:true,default:'Link'};
    if(name.startsWith('@/components/'))return new Proxy({},{get:(_,key)=>String(key)});
    if(name==='lucide-react')return new Proxy({},{get:(_,key)=>String(key)});
    return require(name);
  };
  vm.runInNewContext(output,{exports,require:mockRequire,FormData:TestFormData,HTMLElement:Element,HTMLInputElement:InputElement,HTMLSelectElement:SelectElement,HTMLTextAreaElement:TextareaElement,document:{getElementById:()=>({focus(){}})},Number,String,Object,Array,Set,BigInt,Error,TypeError});
  return exports;
}
const constants=load('modules/properties/constants.ts');
const demo=load('modules/properties/data/demo-properties.ts');
const adapter=load('components/forms/property-form-adapter.ts');
const form=load('components/forms/property-form.tsx',{'@/modules/properties/constants':constants,'@/components/forms/property-form-adapter':adapter,'@/app/admin/(dashboard)/properties/actions':{createBrokerProperty:async()=>({ok:true,id:'new',changed:true}),updateBrokerProperty:async()=>({ok:true,id:'existing',changed:true})}});
const validate=load('lib/supabase/validation/broker-property-input.ts',{'@/modules/properties/constants':constants});
const writes=load('lib/supabase/mappers/broker-property-write.ts');
function render(property){cursor=0;return form.PropertyForm({property:{...property,publicDescription:property.publicDescription??property.description},areas:[{slug:'madipakkam',name:'Madipakkam'}]});}
function find(tree,id){let result;visit(tree,n=>{if(n.props?.id===id)result=n;});assert(result,`Missing control ${id}`);return result;}
function submit(tree){tree.props.onSubmit({preventDefault(){},currentTarget:tree,nativeEvent:{submitter:new Element('intent','draft')}});return captured;}
function fieldValue(tree,id,value){const node=find(tree,id); const target=new InputElement(node.props.name??'',value,id);tree.props.onChangeCapture({target});node.props.onChange({target});}
function serverPatch(formData,existing){const input={title:'An unrelated edit'};for(const key of ['brokerage','brokerageType','brokerageValue'])if(formData.has(key)){const value=formData.get(key);input[key]=value===''?null:value;}const result=validate.validateBrokerPropertyInput(input,'draft',{operation:'update',areas:[{slug:'madipakkam',name:'Madipakkam',isActive:true}],existing});assert.equal(result.ok,true,JSON.stringify(result));return writes.mapBrokerPropertyUpdate(result);}
for(const id of ['MAD-0007','MAD-0008']){
  state=[];captured=undefined;
  const property=demo.demoProperties.find(p=>p.id===id);assert(property);
  let tree=render(property), prefix=`edit-${id}`;
  assert.equal(find(tree,`${prefix}-brokerage`).props.value,'2%');
  assert.equal(find(tree,`${prefix}-brokerageType`).props.value,'');
  assert.equal(find(tree,`${prefix}-brokerage`).props.name,undefined);
  assert.equal(find(tree,`${prefix}-brokerageType`).props.name,undefined);
  let saved=submit(tree);
  assert(!saved.has('brokerage'));assert(!saved.has('brokerageType'));assert(!saved.has('brokerageValue'));
  const existing={id,area_slug:'madipakkam',approval_status:null,verification_status:'sample',last_verified_at:null,brokerage:'2%',brokerage_type:null,brokerage_value:null};
  let patch=serverPatch(saved,existing);
  for(const key of ['brokerage','brokerage_type','brokerage_value'])assert(!Object.hasOwn(patch,key),key);
  // An unrelated edit does not mark the brokerage fields as edited.
  fieldValue(tree,`${prefix}-listingType`,'rent');tree=render(property);saved=submit(tree);
  for(const key of ['brokerage','brokerageType','brokerageValue'])assert(!saved.has(key),key);
  patch=serverPatch(saved,existing);assert(!Object.hasOwn(patch,'brokerage_type'));
  // A broker can intentionally enter independent structured percentage terms.
  fieldValue(tree,`${prefix}-brokerageType`,'percentage');tree=render(property);
  assert.equal(find(tree,`${prefix}-brokerageValue`).props.value,'');
  fieldValue(tree,`${prefix}-brokerageValue`,'2');tree=render(property);saved=submit(tree);
  assert.equal(saved.get('brokerageType'),'percentage');assert.equal(saved.get('brokerageValue'),'2');assert(!saved.has('brokerage'));
  patch=serverPatch(saved,existing);assert.equal(patch.brokerage_type,'percentage');assert.equal(patch.brokerage_value,'2');assert(!Object.hasOwn(patch,'brokerage'));
  // Selecting no brokerage explicitly clears an old structured amount.
  fieldValue(tree,`${prefix}-brokerageType`,'none');tree=render(property);saved=submit(tree);
  assert.equal(saved.get('brokerageType'),'none');assert.equal(saved.get('brokerageValue'),'');
  patch=serverPatch(saved,existing);assert.equal(patch.brokerage_type,'none');assert.equal(patch.brokerage_value,null);
}
// Free-form terms can be edited without creating structured terms.
state=[];captured=undefined;
const property=demo.demoProperties.find(p=>p.id==='MAD-0007');
let tree=render(property);
fieldValue(tree,'edit-MAD-0007-brokerage','Brokerage by agreement');
tree=render(property);
const saved=submit(tree);
assert.equal(saved.get('brokerage'),'Brokerage by agreement');
assert(!saved.has('brokerageType'));assert(!saved.has('brokerageValue'));
console.log('Brokerage form and write-mapping regression checks passed for MAD-0007 and MAD-0008.');
