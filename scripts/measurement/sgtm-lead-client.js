/* eslint-disable @typescript-eslint/no-require-imports -- GTM sandbox exposes its APIs only through require. */
// Efeonce backend-only Lead ingress. No contacts or Google user_data enter this Client.
const getRequestPath = require('getRequestPath');
const getRequestMethod = require('getRequestMethod');
const getRequestHeader = require('getRequestHeader');
const getRequestBody = require('getRequestBody');
const claimRequest = require('claimRequest');
const runContainer = require('runContainer');
const addEventCallback = require('addEventCallback');
const setResponseStatus = require('setResponseStatus');
const setResponseHeader = require('setResponseHeader');
const setResponseBody = require('setResponseBody');
const returnResponse = require('returnResponse');
const getTimestampMillis = require('getTimestampMillis');
const sha256Sync = require('sha256Sync');
const getType = require('getType');
const makeString = require('makeString');
const JSON = require('JSON');

// Sandboxed JS has no native RegExp literals; use String.match like the pinned Meta template.
function matches(value, pattern) {
  return getType(value) === 'string' && value.match(pattern) !== null;
}

if (getRequestPath() !== '/efeonce/lead-enrichment') return;
claimRequest();

function respond(status, tagStatus, error) {
  setResponseStatus(status);
  setResponseHeader('content-type', 'application/json');
  setResponseBody(JSON.stringify({ meta_tag_status: tagStatus, error: error }));
  returnResponse();
}

if (getRequestMethod() !== 'POST') { respond(405, 'not_fired', 'method');

return; }

const authorization = getRequestHeader('authorization') || '';

if (!matches(authorization, '^Bearer [a-f0-9]{64}$') ||
    !matches(data.tokenDigest, '^[a-f0-9]{64}$') ||
    sha256Sync(authorization.slice(7), {outputEncoding: 'hex'}) !== data.tokenDigest) {
  respond(401, 'not_fired', 'authentication');

return;
}

const raw = getRequestBody();

if (!raw || raw.length > 16384) { respond(413, 'not_fired', 'size');

return; }

const event = JSON.parse(raw);

if (!event || getType(event) !== 'object') { respond(400, 'not_fired', 'schema');

return; }

const allowed = ['schema_version','event_name','event_id','event_time','action_source','page_location',
  'meta_ads_consent','backend_verified','x-fb-ud-em','x-fb-ud-ph','x-fb-ud-fn','x-fb-ud-ln','x-fb-ud-external_id',
  'ip_override','user_agent','x-fb-ck-fbp','x-fb-ck-fbc','custom_properties','test_event_code'];

for (const key in event) {
  if (allowed.indexOf(key) < 0) { respond(400, 'not_fired', 'unexpected_field');

return; }
}

if (event.schema_version !== 1 || event.event_name !== 'generate_lead' ||
    event.action_source !== 'website' || event.meta_ads_consent !== 'granted' ||
    event.backend_verified !== '1' ||
    !matches(event.event_id, '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-8][a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$') ||
    !matches(event.page_location, '^https://(efeoncepro\\.com|think\\.efeoncepro\\.com)/[A-Za-z0-9/_-]*$') ||
    getType(event.event_time) !== 'number' || event.event_time % 1 !== 0 ||
    event.event_time < getTimestampMillis()/1000 - 86400 || event.event_time > getTimestampMillis()/1000 + 300) {
  respond(400, 'not_fired', 'envelope');

return;
}

const hashes = ['x-fb-ud-em','x-fb-ud-ph','x-fb-ud-fn','x-fb-ud-ln','x-fb-ud-external_id'];

// Authenticated, per-request Test Events only. No code is fixed in production configuration.
if (event.test_event_code !== undefined && !matches(event.test_event_code, '^TEST[0-9]{1,20}$')) {
  respond(400, 'not_fired', 'test_event_code');

return;
}

for (let i = 0; i < hashes.length; i++) {
  const value = event[hashes[i]];

  if (value !== undefined && !matches(value, '^[a-f0-9]{64}$')) {
    respond(400, 'not_fired', 'matching_hash');

return;
  }
}

if (!event['x-fb-ud-em'] && !event['x-fb-ud-ph']) { respond(400, 'not_fired', 'missing_identity');

return; }

if (event.user_agent !== undefined && (getType(event.user_agent) !== 'string' || event.user_agent.length > 1024)) {
  respond(400, 'not_fired', 'user_agent');

return;
}

if (event.ip_override !== undefined && !matches(event.ip_override, '^[0-9a-fA-F:.]{3,45}$')) {
  respond(400, 'not_fired', 'visitor_ip');

return;
}

if (event['x-fb-ck-fbp'] !== undefined && !matches(event['x-fb-ck-fbp'], '^fb\\.\\d+\\.\\d{13}\\.\\d{1,20}$')) {
  respond(400, 'not_fired', 'fbp');

return;
}

if (event['x-fb-ck-fbc'] !== undefined && !matches(event['x-fb-ck-fbc'], '^fb\\.\\d+\\.\\d{13}\\.[A-Za-z0-9._~-]{1,512}$')) {
  respond(400, 'not_fired', 'fbc');

return;
}

if (getType(event.custom_properties) !== 'string' || event.custom_properties.length > 1000) {
  respond(400, 'not_fired', 'classification');

return;
}

const properties = JSON.parse(event.custom_properties);

if (!properties || getType(properties) !== 'object') { respond(400, 'not_fired', 'classification');

return; }

const propertyKeys = ['lead_source','form_slug','surface_id','scheduler_key'];

for (const property in properties) {
  if (propertyKeys.indexOf(property) < 0 || getType(properties[property]) !== 'string' ||
      !matches(properties[property], '^[A-Za-z0-9_-]{1,120}$')) {
    respond(400, 'not_fired', 'classification');

return;
  }
}

const forms = ['efeonce-aeo-diagnostic','efeonce-seo-diagnostic','efeonce-desarrollo-web-cotizacion',
  'efeonce-lead-gen-web','efeonce-social-audit','ai-visibility-grader'];

if (!properties.surface_id || (properties.lead_source === 'growth_form' ?
    forms.indexOf(properties.form_slug) < 0 || properties.scheduler_key !== undefined :
    properties.lead_source !== 'meeting_booking' || properties.scheduler_key !== 'efeonce-discovery-30' ||
    properties.surface_id !== 'fhsf-efeonce-lead-gen-web' || properties.form_slug !== undefined)) {
  respond(400, 'not_fired', 'commercial_scope');

return;
}

const modeledEvent = {};

for (const key in event) {
  if (key !== 'schema_version') modeledEvent[key] = event[key];
}

// Trust the authenticated Client, not a browser event carrying a similarly named flag.
runContainer(modeledEvent, function() {}, function(bindToEvent) {
  bindToEvent(addEventCallback)(function(containerId, eventData) {
    let status = 'not_fired';
    const tags = eventData.tags || [];

    for (let i = 0; i < tags.length; i++) {
      if (makeString(tags[i].id) === makeString(data.metaTagId)) status = tags[i].status;
    }

    // Success is tag HTTP2xx evidence; Events Manager processing is a separate check.
    respond(status === 'success' ? 200 : 502, status, status === 'success' ? undefined : 'meta_tag');
  });
});
