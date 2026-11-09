/* eslint-disable @typescript-eslint/no-require-imports -- dependency-free React hook harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

let state = [], cursor = 0, refreshes = 0, statusCall;
const react = {
  useState(initial) {
    const i = cursor++;
    if (!(i in state)) state[i] = initial;
    return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }];
  },
  useMemo(fn) { return fn(); },
};
const jsx = { jsx: (type, props) => ({type, props}), jsxs: (type, props) => ({type, props}) };
const source = fs.readFileSync(path.join(__dirname, '../src/app/admin/(dashboard)/properties/admin-properties-client.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const exportsObject = {};
const imports = {
  react,
  'react/jsx-runtime': jsx,
  'next/navigation': { useRouter: () => ({ refresh: () => { refreshes++; } }) },
  'next/link': { __esModule: true, default: 'Link' },
  './actions': { updateBrokerPropertyStatus: async (...args) => { statusCall = args; return { ok: true }; } },
  '@/modules/properties/constants': { propertyTypeLabels: {}, listingTypeLabels: {}, adminPropertyStatusLabels: { sold: 'Sold' }, propertyStatusOptions: [] },
  '@/lib/format': { formatDate: String, formatPrice: String },
};
function requireMock(name) {
  if (name in imports) return imports[name];
  if (name.startsWith('@/components/') || name === 'lucide-react') return new Proxy({}, { get: (_, key) => String(key) });
  return require(name);
}
vm.runInNewContext(code, { exports: exportsObject, require: requireMock, String, Object, Array });
function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(child => visit(child, fn));
  fn(node);
  visit(node.props?.children, fn);
}
function render(properties) {
  cursor = 0;
  return exportsObject.AdminPropertiesClient({ initialProperties: properties, areas: [] });
}
function rows(tree) {
  let result;
  visit(tree, node => { if (node.type === 'AdminDataTable') result = node.props.rows; });
  return result || [];
}
const original = { id: 'MAD-0001', title: 'Original', status: 'available', locality: 'Area', summary: 'Summary', listingType: 'sale', type: 'apartment' };
const draft = { ...original, id: 'MAD-0010', title: 'New draft', status: 'draft' };
const published = { ...original, id: 'MAD-0011', title: 'New published' };
assert.equal(rows(render([original])).length, 1);
// Preserve hook state across payload changes as App Router does on refresh.
assert.equal(rows(render([original, draft])).length, 2);
assert.equal(rows(render([original, draft, published])).length, 3);
const changed = { ...original, title: 'Updated title' };
assert.equal(rows(render([changed, draft, published]))[0].title, 'Updated title');
for (let i = 0; i < 3; i++) assert.equal(rows(render([changed, draft, published])).length, 3);
assert.equal(refreshes, 0);
async function testStatusControl() {
  let control;
  visit(render([changed]), node => { if (node.props?.['aria-label'] === 'Change status for MAD-0001') control = node; });
  assert(control);
  control.props.onChange({ target: { value: 'sold' } });
  const pending = render([changed]);
  let modal;
  visit(pending, node => { if (node.type === 'AdminModal' && node.props.open) modal = node; });
  assert(modal);
  assert.equal(modal.props.title, 'Change status to Sold?');
  let warning = false;
  visit(modal.props.children, node => { if (typeof node.props?.children === 'string' && node.props.children.includes('no longer be visible')) warning = true; });
  assert(warning);
  let confirm;
  visit(modal.props.footer, node => { if (node.type === 'Button' && node.props.children === 'Confirm') confirm = node; });
  assert(confirm);
  await confirm.props.onClick();
  assert.deepEqual(statusCall, ['MAD-0001', 'sold']);
  assert.equal(refreshes, 1);
  console.log('Property list accepts fresh server props and confirms status changes.');
}
testStatusControl().catch(error => { console.error(error); process.exitCode = 1; });
