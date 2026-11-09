/* eslint-disable @typescript-eslint/no-require-imports -- focused server-render regression harness */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const source = fs.readFileSync(path.join(__dirname, '../src/components/forms/contact-form.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsObject = {};
const component = tag => function Component({ children, ...props }) { return React.createElement(tag, props, children); };
const imports = {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'lucide-react': new Proxy({}, { get: () => component('span') }),
  '@/app/(public)/contact/actions': { submitPublicLead: async () => ({ ok: true }) },
  '@/components/forms/form-field': { FormField: ({ children }) => React.createElement('div', null, children) },
  '@/components/ui/button': { Button: component('button') },
  '@/components/ui/input': { Input: component('input') },
  '@/components/ui/textarea': { Textarea: component('textarea') },
  '@/config/site': { siteConfig: { contact: { phoneHref: 'tel:0', phoneLabel: 'call' } } },
  '@/lib/validation/public-lead': { publicLeadMessages: {}, validatePublicLeadInput: () => ({ ok: false, fields: {} }) },
  '@/lib/whatsapp': { getGeneralWhatsAppUrl: () => null },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
};
vm.runInNewContext(code, { exports: exportsObject, require: name => imports[name] ?? require(name), Object, String, Array });
for (const props of [{}, { property: { id: 'TEST-1', title: 'Example', locality: 'Example' }, propertyId: 'TEST-1' }]) {
  const html = renderToStaticMarkup(React.createElement(exportsObject.ContactForm, props));
  const formTag = html.match(/<form\b[^>]*>/)?.[0];
  assert.match(formTag, /method="post"/);
  assert.match(formTag, /action="\/contact"/);
  assert.match(html, /<button\b[^>]*type="submit"[^>]*disabled=""/);
  assert.match(html, /requires JavaScript/);
  for (const field of ['name', 'phone', 'email', 'message']) assert.match(html, new RegExp(`name="${field}"`));
}
console.log('Contact form server rendering fails closed and uses POST for general and property enquiries.');
