const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const code = fs.readFileSync(require('node:path').join(__dirname, '../sgtm-lead-client.js'), 'utf8');

const fixtureToken = 'ab'.repeat(32);
const digest = crypto.createHash('sha256').update(fixtureToken).digest('hex');

function run(overrides = {}) {
  const state = {claimed: false, ran: false};

  const body = {
    schema_version: 1, event_name: 'generate_lead', event_id: 'a879b155-a143-40bd-9b15-731c2b62d173',
    event_time: Math.floor(Date.now()/1000), action_source: 'website', page_location: 'https://efeoncepro.com/aeo-2/',
    meta_ads_consent: 'granted', backend_verified: '1', 'x-fb-ud-em': '12'.repeat(32),
    custom_properties: JSON.stringify({lead_source: 'growth_form', form_slug: 'efeonce-aeo-diagnostic', surface_id: 'fhsf-aeo'}),
    ...overrides.body,
  };

  const APIs = {
    getRequestPath: () => overrides.path || '/efeonce/lead-enrichment', getRequestMethod: () => overrides.method || 'POST',
    getRequestHeader: () => overrides.auth === undefined ? `Bearer ${fixtureToken}` : overrides.auth,
    getRequestBody: () => overrides.raw === undefined ? JSON.stringify(body) : overrides.raw,
    claimRequest: () => {state.claimed = true;},
    runContainer: (event, complete, start) => {
      state.ran = true; state.event = event;
      start(fn => fn); state.callback('fixture-container', {tags: overrides.tags === undefined ? [{id: '6', status: 'success'}] : overrides.tags});
      complete();
    },
    addEventCallback: fn => {state.callback = fn;},
    setResponseStatus: status => {state.status = status;}, setResponseHeader: () => {},
    setResponseBody: body => {state.receipt = JSON.parse(body);}, returnResponse: () => {state.responded = true;},
    getTimestampMillis: () => Date.now(), makeString: String,
    sha256Sync: value => crypto.createHash('sha256').update(value).digest('hex'),
    getType: value => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
    JSON: {stringify: JSON.stringify, parse: value => {try {return JSON.parse(value);} catch {return undefined;}}},
  };

  vm.runInNewContext(`(function(){${code}\n})()`, {require: name => APIs[name], data: {tokenDigest: digest, metaTagId: '6'}});

return state;
}

test('claims only its dedicated route', () => {
  assert.equal(run({path: '/g/collect'}).claimed, false);
});
test('valid backend Lead runs and returns a successful Meta HTTP receipt', () => {
  const state = run();

 assert.equal(state.status, 200); assert.equal(state.receipt.meta_tag_status, 'success');
  assert.equal(state.event.schema_version, undefined);
});
for (const [name, overrides] of [
  ['missing authentication', {auth: ''}], ['wrong authentication', {auth: `Bearer ${'cd'.repeat(32)}`}],
  ['wrong method', {method: 'GET'}], ['invalid JSON', {raw: '{broken'}], ['oversize', {raw: 'x'.repeat(16385)}],
  ['denied consent', {body: {meta_ads_consent: 'denied'}}], ['missing identity', {body: {'x-fb-ud-em': undefined}}],
  ['raw email', {body: {'x-fb-ud-em': 'qa@example.com'}}], ['unexpected PII', {body: {email: 'qa@example.com'}}],
  ['URL query', {body: {page_location: 'https://efeoncepro.com/?email=qa@example.com'}}],
  ['wrong host', {body: {page_location: 'https://other.example.com/'}}],
  ['missing event ID', {body: {event_id: undefined}}], ['stale timestamp', {body: {event_time: Math.floor(Date.now()/1000)-86401}}],
  ['unknown commercial form', {body: {custom_properties: JSON.stringify({lead_source:'growth_form', form_slug:'careers', surface_id:'fhsf-aeo'})}}],
  ['wrong properties shape', {body: {custom_properties: {lead_source:'growth_form'}}}],
]) test(name+' cannot trigger Meta', () => {const state=run(overrides);

 assert.equal(state.ran, false); assert.ok(state.status>=400);});
test('tag missing is never acknowledged', () => {assert.equal(run({tags: []}).status, 502);});
for (const status of ['failure', 'exception', 'timeout']) test('Meta '+status+' is retryable', () => {assert.equal(run({tags:[{id:'6',status}]}).status, 502);});
