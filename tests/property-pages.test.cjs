/* eslint-disable @typescript-eslint/no-require-imports -- dependency-free page harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const component = name => Object.assign(() => null, { displayName: name });
const List = component('List');
const Form = component('Form');
const areas = [{ slug: 'active', isActive: true }, { slug: 'old', isActive: false }, { slug: 'other', isActive: false }];
let records = [];
let failure = false;
let guardCount = 0;
const imports = {
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  'lucide-react': { Plus: component('Plus') },
  'next/link': { default: component('Link') },
  'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
  '@/components/admin/admin-page-header': { AdminPageHeader: component('Header') },
  '@/components/common/notice': { Notice: component('Notice') },
  '@/components/ui/button': { Button: component('Button') },
  '@/components/ui/card': { Card: component('Card') },
  '@/components/forms/property-form': { PropertyForm: Form },
  './admin-properties-client': { AdminPropertiesClient: List },
  '@/lib/auth/broker': { requireBroker: async () => { guardCount++; } },
  '@/lib/supabase/queries/broker-areas': { getBrokerAreas: async () => areas },
  '@/lib/supabase/queries/broker-properties': {
    getBrokerProperties: async () => { if (failure) throw new Error('READ_FAILED'); return records; },
    getBrokerPropertyById: async id => { if (failure) throw new Error('READ_FAILED'); return records.find(p => p.id === id) ?? null; },
  },
};
function load(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => imports[name] ?? require(name), Intl, Date, Error });
  return exports.default;
}
function find(node, type) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === type) return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = find(child, type);
    if (found) return found;
  }
}
async function main() {
  const list = load('src/app/admin/(dashboard)/properties/page.tsx');
  const create = load('src/app/admin/(dashboard)/properties/new/page.tsx');
  const edit = load('src/app/admin/(dashboard)/properties/[id]/edit/page.tsx');
  const statuses = ['draft', 'available', 'under-offer', 'sold', 'unavailable', 'expired'];
  records = statuses.map((status, index) => ({ id: String(index), status, areaSlug: 'old', description: ['private'], publicDescription: ['public'], address: 'private address', whatsappReference: 'private reference', availabilityNote: 'hidden' }));
  const listProps = find(await list(), List).props;
  assert.deepEqual(Array.from(listProps.initialProperties, p => p.status), statuses);
  for (const item of listProps.initialProperties) for (const key of ['description', 'publicDescription', 'address', 'whatsappReference']) assert(!Object.hasOwn(item, key));
  records = [];
  assert.equal(find(await list(), List).props.initialProperties.length, 0);
  failure = true;
  await assert.rejects(list(), /READ_FAILED/);
  await assert.rejects(edit({ params: Promise.resolve({ id: '0' }) }), /READ_FAILED/);
  failure = false;
  const newForm = find(await create(), Form).props;
  assert.deepEqual(Array.from(newForm.areas, a => a.slug), ['active']);
  assert.match(newForm.listedAt, /^\d{4}-\d{2}-\d{2}$/);
  await assert.rejects(edit({ params: Promise.resolve({ id: 'missing' }) }), /NOT_FOUND/);
  records = [{ id: 'MAD-0009', areaSlug: 'old', description: ['private'], publicDescription: ['public'], address: 'address', whatsappReference: 'reference', availabilityNote: 'hidden', status: 'available' }];
  const editForm = find(await edit({ params: Promise.resolve({ id: 'MAD-0009' }) }), Form).props;
  assert.deepEqual(Array.from(editForm.areas, a => a.slug), ['active', 'old']);
  assert.equal(editForm.property.description[0], 'private');
  assert.equal(editForm.property.publicDescription[0], 'public');
  assert(!Object.hasOwn(editForm.property, 'whatsappReference'));
  assert(!Object.hasOwn(editForm.property, 'availabilityNote'));
  assert(guardCount >= 7);
  console.log('Broker property page read, privacy, area and error checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
