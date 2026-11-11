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
    require: (name) => imports[name] ?? require(name),
    Object, Array, String, Number, Boolean, Error, TypeError, RegExp,
  });
  return exports;
}

const validation = load('src/lib/validation/customer.ts');

// Canonical matching for Indian mobiles.
assert.equal(validation.normalizeCustomerPhone('+91 90000 12345'), '9000012345');
assert.equal(validation.normalizeCustomerPhone('91-90000-12345'), '9000012345');
assert.equal(validation.normalizeCustomerPhone('0919000012345'), '0919000012345');
assert.equal(validation.normalizeCustomerPhone('09000012345'), '9000012345');
assert.equal(validation.normalizeCustomerPhone('9000012345'), '9000012345');
assert.equal(validation.normalizeCustomerPhone('(044) 2345 6789'), '04423456789');
assert.equal(validation.normalizeCustomerPhone('12345'), null);
assert.equal(validation.normalizeCustomerPhone('1234567890123456'), null);
assert.equal(validation.normalizeCustomerPhone('not a phone'), null);

// Ambiguous non-mobile values are retained instead of being guessed at.
assert.equal(validation.normalizeCustomerPhone('+1 415 555 1234'), '14155551234');

// Valid input trims fields and treats blank email as absent.
let result = validation.validateCustomerInput({
  name: '  Ravi Kumar  ',
  phone: ' +91 90000 12345 ',
  email: '   ',
});
assert.equal(result.ok, true);
assert.equal(result.values.name, 'Ravi Kumar');
assert.equal(result.values.phone, '+91 90000 12345');
assert.equal(result.values.email, null);

result = validation.validateCustomerInput({
  name: 'Ravi',
  phone: '9000012345',
  email: ' ravi@example.com ',
});
assert.equal(result.ok, true);
assert.equal(result.values.email, 'ravi@example.com');

// Invalid input never reaches the database.
for (const [input, field] of [
  [{ name: 'A', phone: '9000012345' }, 'name'],
  [{ name: 'Valid', phone: '12345' }, 'phone'],
  [{ name: 'Valid', phone: '9000012345', email: 'not-an-email' }, 'email'],
  [{ name: 'Valid', phone: '9000012345', email: `${'a'.repeat(250)}@x.com` }, 'email'],
  [null, 'name'],
]) {
  const checked = validation.validateCustomerInput(input);
  assert.equal(checked.ok, false, field);
  assert(checked.fields[field], `${field} must be reported`);
}

// Name and phone bounds.
assert.equal(validation.validateCustomerInput({ name: 'a'.repeat(120), phone: '9000012345' }).ok, true);
assert.equal(validation.validateCustomerInput({ name: 'a'.repeat(121), phone: '9000012345' }).ok, false);
assert.equal(validation.validateCustomerInput({ name: 'Valid', phone: '9000012345'.repeat(7) }).ok, false);
assert.equal(validation.validateCustomerInput({ name: 'Valid', phone: '9000012345', email: 'a@b.co' }).ok, true);

// Shared module stays free of server-only imports so the client form can use it.
const source = fs.readFileSync(path.join(root, 'src/lib/validation/customer.ts'), 'utf8');
assert(!source.includes('server-only'));
assert(!source.includes('supabase'));
assert(source.includes('normalizeCustomerPhone'));

console.log('Customer validation and phone normalization checks passed.');
