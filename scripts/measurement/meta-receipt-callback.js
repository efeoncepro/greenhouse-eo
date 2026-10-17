/* eslint-disable @typescript-eslint/no-require-imports -- Inserted into the pinned GTM server sandbox. */
// Efeonce addition: response metadata only; never changes the upstream request or tag outcome.
const receiptClientName = require('getClientName');
const receiptRequestPath = require('getRequestPath');
const receiptRequestHeader = require('getRequestHeader');
const receiptResponseHeader = require('setResponseHeader');
const receiptPermission = require('queryPermission');

function receiptMatches(value, pattern) {
  return getType(value) === 'string' && value.match(pattern) !== null;
}

function receiptInteger(value) {
  return getType(value) === 'number' && value % 1 === 0 && value >= 0 && value <= 1000000;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Called from the pinned template callback after offline insertion.
function captureEfeonceMetaReceipt(eventRequest, statusCode, response) {
  if (data.captureEfeonceReceipt !== true || !receiptPermission('read_container_data')) return;
  if (receiptClientName() !== 'Efeonce backend Lead ingress' ||
      !receiptPermission('read_request', 'path') ||
      !receiptPermission('read_request', 'header', 'x-efeonce-meta-attempt') ||
      !receiptPermission('read_request', 'header', 'x-efeonce-meta-attempt-number') ||
      !receiptPermission('access_response', 'write', 'header', 'x-efeonce-meta-receipt') ||
      receiptRequestPath() !== '/efeonce/lead-enrichment' || data.pixelId !== '708931297255942') return;
  const attemptId = receiptRequestHeader('x-efeonce-meta-attempt');
  const attemptNumber = receiptRequestHeader('x-efeonce-meta-attempt-number');
  const uuidPattern = '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-8][a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$';

  if (!receiptMatches(attemptId, uuidPattern) || !receiptMatches(attemptNumber, '^[1-5]$') ||
      getType(eventRequest.data) !== 'array' || eventRequest.data.length !== 1 ||
      !receiptInteger(statusCode) || statusCode < 100 || statusCode > 599) return;
  const sent = eventRequest.data[0];

  if (sent.event_name !== 'Lead' || !receiptMatches(sent.event_id, uuidPattern) ||
      getType(sent.event_time) !== 'number' || sent.event_time % 1 !== 0 || sent.event_time <= 0 || sent.event_time > 8640000000000) return;

  const receipt = {
    contract: 'meta-event-receipt.v1', datasetId: data.pixelId, apiVersion: API_VERSION,
    eventId: sent.event_id, eventTime: sent.event_time, eventName: sent.event_name, requestEventCount: 1,
    attemptId: attemptId, attempt: attemptNumber * 1, graphHttpStatus: statusCode,
    bodyStatus: 'invalid', observedAtMs: getTimestampMillis()
  };

  if (getType(response) === 'string' && response.length > 16384) receipt.bodyStatus = 'oversize';
  else if (getType(response) === 'string') {
    const parsed = JSON.parse(response);

    if (parsed && getType(parsed) === 'object') {
      receipt.bodyStatus = 'valid';

      if (parsed.events_received !== undefined) {
        if (receiptInteger(parsed.events_received)) receipt.eventsReceived = parsed.events_received;
        else receipt.bodyStatus = 'invalid';
      }

      if (parsed.fbtrace_id !== undefined) {
        if (receiptMatches(parsed.fbtrace_id, '^[A-Za-z0-9_-]{1,200}$')) receipt.fbtraceId = parsed.fbtrace_id;
        else receipt.bodyStatus = 'invalid';
      }

      if (parsed.error !== undefined) {
        if (parsed.error && getType(parsed.error) === 'object') {
          if (receiptInteger(parsed.error.code)) receipt.errorCode = parsed.error.code;
          else receipt.bodyStatus = 'invalid';

          if (parsed.error.error_subcode !== undefined) {
            if (receiptInteger(parsed.error.error_subcode)) receipt.errorSubcode = parsed.error.error_subcode;
            else receipt.bodyStatus = 'invalid';
          }

          if (parsed.error.fbtrace_id !== undefined) {
            if (!receiptMatches(parsed.error.fbtrace_id, '^[A-Za-z0-9_-]{1,200}$') ||
                receipt.fbtraceId !== undefined && receipt.fbtraceId !== parsed.error.fbtrace_id) receipt.bodyStatus = 'invalid';
            else receipt.fbtraceId = parsed.error.fbtrace_id;
          }
        } else receipt.bodyStatus = 'invalid';
      }
    }
  }

  // No raw body, messages, token, URL or user_data crosses this boundary.
  receiptResponseHeader('x-efeonce-meta-receipt', JSON.stringify(receipt));
}
