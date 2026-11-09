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
    Object, Array, String, Number, Boolean, Error, TypeError, JSON, RegExp, Promise,
  });
  return exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const validation = load('src/lib/validation/public-lead.ts');

let rpcCalls;
let rpcResult;
let clientCreations;

const publicServer = {
  createPublicSupabaseClient() {
    clientCreations += 1;
    return {
      rpc(name, args) {
        rpcCalls.push({ name, args });
        if (typeof rpcResult === 'function') {
          return Promise.resolve(rpcResult());
        }
        return Promise.resolve(rpcResult);
      },
    };
  },
};

const actions = load('src/app/(public)/contact/actions.ts', {
  '@/lib/supabase/public-server': publicServer,
  '@/lib/validation/public-lead': validation,
});

function reset(result = { data: null, error: null }) {
  rpcCalls = [];
  rpcResult = result;
  clientCreations = 0;
}

function validInput(overrides = {}) {
  return {
    name: 'Asha Rao',
    phone: '9000012345',
    email: 'asha@example.com',
    message: 'Please share more details about this home.',
    propertyId: null,
    website: '',
    ...overrides,
  };
}

async function run() {
  // --- Shared validation ---------------------------------------------------
  const general = validation.validatePublicLeadInput({
    name: '  Asha  ',
    phone: ' +91 90000 12345 ',
    email: '   ',
    message: '  Please share more details about this home.  ',
    propertyId: null,
  });
  assert.equal(general.ok, true);
  assert.equal(general.values.name, 'Asha');
  assert.equal(general.values.phone, '919000012345');
  assert.equal(general.values.email, null);
  assert.equal(general.values.message, 'Please share more details about this home.');
  assert.equal(general.values.propertyId, null);

  const missingProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.',
  });
  assert.equal(missingProperty.ok, true);
  assert.equal(missingProperty.values.propertyId, null);
  const emptyProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.', propertyId: '',
  });
  assert.equal(emptyProperty.ok, false);
  assert.equal(emptyProperty.message, validation.publicLeadMessages.invalidPropertyReference);
  const trimmedProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.', propertyId: '  MAD-0001  ',
  });
  assert.equal(trimmedProperty.ok, true);
  assert.equal(trimmedProperty.values.propertyId, 'MAD-0001');
  const maxProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.', propertyId: 'P'.repeat(64),
  });
  assert.equal(maxProperty.ok, true);

  const blankProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.', propertyId: '   ',
  });
  assert.equal(blankProperty.ok, false);
  assert.equal(blankProperty.message, validation.publicLeadMessages.invalidPropertyReference);

  const nonStringProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.', propertyId: 42,
  });
  assert.equal(nonStringProperty.ok, false);
  assert.equal(nonStringProperty.message, validation.publicLeadMessages.invalidPropertyReference);

  const longProperty = validation.validatePublicLeadInput({
    name: 'Asha', phone: '9000012345', email: '', message: 'A valid message here.', propertyId: 'P'.repeat(65),
  });
  assert.equal(longProperty.ok, false);
  assert.equal(longProperty.message, validation.publicLeadMessages.invalidPropertyReference);

  assert.equal(validation.validatePublicLeadInput({
    name: 'Asha', phone: '1234567890', email: '', message: '1234567890', propertyId: null,
  }).ok, true);
  assert.equal(validation.validatePublicLeadInput({
    name: 'A', phone: '1234567890', email: '', message: '1234567890', propertyId: null,
  }).ok, false);
  assert.equal(validation.validatePublicLeadInput({
    name: 'A'.repeat(120), phone: '123456789012345', email: '', message: 'M'.repeat(4000), propertyId: null,
  }).ok, true);
  assert.equal(validation.validatePublicLeadInput({
    name: 'A'.repeat(121), phone: '1234567890123456', email: '', message: 'M'.repeat(4001), propertyId: null,
  }).ok, false);

  // --- General submission --------------------------------------------------
  reset();
  const generalResult = await actions.submitPublicLead({
    name: '  Asha  ',
    phone: ' +91 90000 12345 ',
    email: '   ',
    message: '  Please share more details about this home.  ',
    propertyId: null,
    website: '',
  });
  assert.equal(generalResult.ok, true);
  assert.equal(clientCreations, 1);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].name, 'submit_public_lead');
  assert.deepEqual(plain(rpcCalls[0].args), {
    p_name: 'Asha',
    p_phone: '919000012345',
    p_email: null,
    p_message: 'Please share more details about this home.',
    p_property_id: null,
  });

  // --- Property submission -------------------------------------------------
  reset();
  const propertyResult = await actions.submitPublicLead(validInput({ propertyId: 'MAD-0001' }));
  assert.equal(propertyResult.ok, true);
  assert.equal(rpcCalls[0].args.p_property_id, 'MAD-0001');

  // --- Normalization -------------------------------------------------------
  reset();
  await actions.submitPublicLead(validInput({
    phone: '(91) 90000-12345', email: '  asha@example.com  ', propertyId: '  MAD-0001  ',
  }));
  assert.equal(rpcCalls[0].args.p_phone, '919000012345');
  assert.equal(rpcCalls[0].args.p_email, 'asha@example.com');
  assert.equal(rpcCalls[0].args.p_property_id, 'MAD-0001');

  reset();
  await actions.submitPublicLead(validInput({ email: '' }));
  assert.equal(rpcCalls[0].args.p_email, null);

  reset();
  await actions.submitPublicLead(validInput({ email: undefined }));
  assert.equal(rpcCalls[0].args.p_email, null);

  // --- Validation is applied before the RPC --------------------------------
  reset();
  const invalid = await actions.submitPublicLead(validInput({
    name: 'A', phone: '123', email: 'not-an-email', message: 'short',
  }));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.kind, 'validation');
  assert.equal(invalid.message, validation.publicLeadMessages.validation);
  assert.equal(invalid.fields.name, 'Please enter your name.');
  assert.equal(invalid.fields.phone, 'Enter a valid phone number with 10 to 15 digits.');
  assert.equal(invalid.fields.email, 'Enter a valid email address, or leave this blank.');
  assert.equal(invalid.fields.message, 'Add a little more detail (at least 10 characters).');
  assert.equal(rpcCalls.length, 0);

  reset();
  const overLimit = await actions.submitPublicLead(validInput({
    name: 'A'.repeat(121), email: 'a'.repeat(250) + '@x.co', message: 'M'.repeat(4001),
  }));
  assert.equal(overLimit.ok, false);
  assert.equal(overLimit.kind, 'validation');
  assert.match(overLimit.fields.name, /120/);
  assert.match(overLimit.fields.email, /254/);
  assert.match(overLimit.fields.message, /4,000/);
  assert.equal(rpcCalls.length, 0);

  // An invalid property reference must never become a general enquiry.
  for (const propertyId of ['', ' \t\n']) {
    reset();
    const result = await actions.submitPublicLead(validInput({ propertyId }));
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'validation');
    assert.equal(rpcCalls.length, 0);
  }
  reset();
  const invalidProperty = await actions.submitPublicLead(validInput({ propertyId: 'P'.repeat(65) }));
  assert.equal(invalidProperty.ok, false);
  assert.equal(invalidProperty.kind, 'validation');
  assert.equal(invalidProperty.message, validation.publicLeadMessages.invalidPropertyReference);
  assert.equal(rpcCalls.length, 0);

  reset();
  const malformedProperty = await actions.submitPublicLead(validInput({ propertyId: { id: 'MAD-0001' } }));
  assert.equal(malformedProperty.ok, false);
  assert.equal(malformedProperty.kind, 'validation');
  assert.equal(rpcCalls.length, 0);

  reset();
  const malformedInput = await actions.submitPublicLead(null);
  assert.equal(malformedInput.ok, false);
  assert.equal(malformedInput.kind, 'validation');
  assert.equal(rpcCalls.length, 0);

  // --- Safe RPC error mapping ---------------------------------------------
  reset({ data: null, error: { code: 'P0002', message: 'duplicate secret detail', details: 'private PII', hint: 'raw hint' } });
  const duplicate = await actions.submitPublicLead(validInput());
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.kind, 'duplicate');
  assert.equal(duplicate.message, validation.publicLeadMessages.duplicate);
  const duplicateText = JSON.stringify(plain(duplicate));
  assert.equal(duplicateText.includes('secret'), false);
  assert.equal(duplicateText.includes('private PII'), false);
  assert.equal(duplicateText.includes('P0002'), false);

  reset({ data: null, error: { code: 'P0001', message: 'property unavailable detail', details: 'MAD-0001' } });
  const unavailable = await actions.submitPublicLead(validInput({ propertyId: 'MAD-0001' }));
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.kind, 'property-unavailable');
  assert.equal(unavailable.message, validation.publicLeadMessages.propertyUnavailable);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0].args.p_property_id, 'MAD-0001');
  assert.equal(JSON.stringify(plain(unavailable)).includes('property unavailable detail'), false);

  reset({ data: null, error: { code: '22023', message: 'invalid parameter detail' } });
  const invalidRpc = await actions.submitPublicLead(validInput());
  assert.equal(invalidRpc.ok, false);
  assert.equal(invalidRpc.kind, 'validation');
  assert.equal(invalidRpc.message, validation.publicLeadMessages.validation);

  reset({ data: null, error: { code: 'XX000', message: 'relation "leads" secret', details: '9876543210' } });
  const unexpected = await actions.submitPublicLead(validInput());
  assert.equal(unexpected.ok, false);
  assert.equal(unexpected.kind, 'error');
  assert.equal(unexpected.message, validation.publicLeadMessages.generic);
  const unexpectedText = JSON.stringify(plain(unexpected));
  assert.equal(unexpectedText.includes('relation'), false);
  assert.equal(unexpectedText.includes('leads'), false);
  assert.equal(unexpectedText.includes('9876543210'), false);
  assert.equal(unexpectedText.includes('XX000'), false);

  reset(() => { throw new Error('connection secret detail'); });
  const thrown = await actions.submitPublicLead(validInput());
  assert.equal(thrown.ok, false);
  assert.equal(thrown.kind, 'error');
  assert.equal(thrown.message, validation.publicLeadMessages.generic);
  assert.equal(JSON.stringify(plain(thrown)).includes('connection secret detail'), false);

  // --- Honeypot ------------------------------------------------------------
  reset();
  const honeypot = await actions.submitPublicLead(validInput({ website: 'https://spam.example' }));
  assert.equal(honeypot.ok, false);
  assert.equal(honeypot.kind, 'error');
  assert.equal(honeypot.message, validation.publicLeadMessages.generic);
  assert.equal(rpcCalls.length, 0);

  // --- No lead ID or row is returned --------------------------------------
  reset({ data: { id: 'LEAD-9999', status: 'new', is_demo: false }, error: null });
  const noLeak = await actions.submitPublicLead(validInput());
  assert.equal(noLeak.ok, true);
  const noLeakText = JSON.stringify(plain(noLeak));
  assert.equal(noLeakText.includes('LEAD-9999'), false);
  for (const key of ['id', 'leadId', 'data', 'row', 'status', 'source', 'is_demo']) {
    assert.equal(Object.hasOwn(noLeak, key), false, `result must not expose ${key}`);
  }

  // --- Server Action source security --------------------------------------
  const actionSource = fs.readFileSync(path.join(root, 'src/app/(public)/contact/actions.ts'), 'utf8');
  assert.match(actionSource, /"use server";/);
  assert.match(actionSource, /createPublicSupabaseClient/);
  assert.match(actionSource, /\.rpc\("submit_public_lead",/);
  assert.match(actionSource, /p_name: name/);
  assert.match(actionSource, /p_phone: phone/);
  assert.match(actionSource, /p_email: email/);
  assert.match(actionSource, /p_message: message/);
  assert.match(actionSource, /p_property_id: propertyId/);
  for (const forbidden of [
    'createSupabaseServerClient', 'service_role', 'SERVICE_ROLE', 'SUPABASE_SECRET',
    '.from(', '.insert(', '.update(', '.delete(', 'console.',
  ]) {
    assert.equal(actionSource.includes(forbidden), false, `action must not reference ${forbidden}`);
  }
  assert.doesNotMatch(actionSource, /p_source|p_status|p_is_demo|p_id:|p_created_at|p_updated_at/);

  // --- Form integration ----------------------------------------------------
  const formSource = fs.readFileSync(path.join(root, 'src/components/forms/contact-form.tsx'), 'utf8');
  assert.match(formSource, /import \{ submitPublicLead \} from "@\/app\/\(public\)\/contact\/actions";/);
  assert.match(formSource, /validatePublicLeadInput/);
  assert.match(formSource, /propertyId\?: string \| null/);
  assert.match(formSource, /propertyId === undefined \? \(property\?\.id \?\? null\) : propertyId/);
  assert.match(formSource, /name="website"/);
  assert.match(formSource, /tabIndex=\{-1\}/);
  assert.match(formSource, /disabled=\{!hydrated \|\| pending\}/);
  assert.match(formSource, /aria-busy=\{pending\}/);
  assert.match(formSource, /Sending…/);
  assert.match(formSource, /role="status"/);
  assert.match(formSource, /role="alert"/);
  assert.match(formSource, /if \(result\.ok\)/);
  assert.match(formSource, /setFeedback\(\{ tone: "success"/);
  assert.match(formSource, /initialMessage/);
  assert.match(formSource, /property\.id/);
  assert.match(formSource, /Your name/);
  assert.match(formSource, /Phone number/);
  assert.match(formSource, /Email address/);
  assert.match(formSource, /What are you looking for\?/);
  assert.equal(formSource.includes('form.reset('), false);
  assert.equal(formSource.includes('Demo form only'), false);
  assert.equal(formSource.includes('not sent or stored'), false);
  assert.equal(formSource.includes('leadId'), false);
  assert.equal(formSource.includes('lead_id'), false);
  assert.equal(formSource.includes('@supabase'), false);
  assert.equal(formSource.includes('.rpc('), false);
  assert.equal(formSource.includes('createBrowserClient'), false);

  // --- Page wiring ---------------------------------------------------------
  const contactPage = fs.readFileSync(path.join(root, 'src/app/(public)/contact/page.tsx'), 'utf8');
  assert.match(contactPage, /propertyId=\{params\.property === undefined \? null : propertyId\}/);
  assert.match(contactPage, /getPublicPropertyById\(propertyId\)/);
  assert.equal(contactPage.includes('form submission are placeholders'), false);

  const propertyPage = fs.readFileSync(path.join(root, 'src/app/(public)/properties/[slug]/page.tsx'), 'utf8');
  assert.match(propertyPage, /propertyId=\{property\.id\}/);
  assert.match(propertyPage, /fallbackHref="#enquiry-form"/);
  assert.equal(propertyPage.includes('shows a demo message only'), false);

  const whatsapp = fs.readFileSync(path.join(root, 'src/components/property/whatsapp-enquiry-button.tsx'), 'utf8');
  assert.match(whatsapp, /fallbackHref \?\? contactFallbackHref/);
  assert.match(whatsapp, /\/contact\?property=\$\{encodeURIComponent\(property\.id\)\}/);

  console.log('Public lead Server Action, validation, and form wiring checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
