import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { buildMetaReceiptTemplate, META_TEMPLATE_UPSTREAM_SHA256 } from './build-meta-receipt-template'

const EVENT = '11111111-1111-4111-8111-111111111111'
const ATTEMPT = '22222222-2222-4222-8222-222222222222'
const NOW = 1792254001000
const built = buildMetaReceiptTemplate()
const js = built.templateData.split('___SANDBOXED_JS_FOR_SERVER___')[1].split('___SERVER_PERMISSIONS___')[0]

function harness(overrides: { enabled?: boolean; client?: string; path?: string; event?: Record<string, unknown>; attempt?: string; permit?: boolean } = {}, code = js) {
  const state = { successes: 0, failures: 0, response: {} as Record<string, string>, request: null as null | { url: string; body: string }, callback: null as null | ((status: number, headers: unknown, body: string) => void) }

  const apis: Record<string, unknown> = {
    getAllEventData: () => ({ event_name: 'generate_lead', event_id: EVENT, event_time: Math.floor(NOW / 1000),
      action_source: 'website', page_location: 'https://efeoncepro.com/servicios/performance-marketing/',
      'x-fb-ud-em': '12'.repeat(32), custom_properties: '{}', ...overrides.event }),
    getType: (v: unknown) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v,
    sendHttpRequest: (url: string, callback: typeof state.callback, _options: unknown, body: string) => { state.request = { url, body }; state.callback = callback },
    JSON: { stringify: JSON.stringify, parse: (v: string) => { try { return JSON.parse(v) } catch { return undefined } } },
    Math, getTimestampMillis: () => NOW,
    sha256Sync: (v: string) => createHash('sha256').update(v).digest('hex'),
    getCookieValues: () => [], setCookie: () => {},
    parseUrl: (url: string) => ({ searchParams: Object.fromEntries(new URL(url).searchParams) }),
    computeEffectiveTldPlusOne: () => 'efeoncepro.com', decodeUriComponent: decodeURIComponent,
    getClientName: () => overrides.client ?? 'Efeonce backend Lead ingress',
    getRequestPath: () => overrides.path ?? '/efeonce/lead-enrichment',
    getRequestHeader: (name: string) => name === 'x-efeonce-meta-attempt' ? overrides.attempt ?? ATTEMPT : '1',
    setResponseHeader: (name: string, value: string) => { state.response[name] = value },
    queryPermission: () => overrides.permit ?? true,
  }

  runInNewContext(code, { require: (name: string) => apis[name], data: { pixelId: '708931297255942', apiAccessToken: 'fixture-secret',
    captureEfeonceReceipt: overrides.enabled ?? true, gtmOnSuccess: () => { state.successes++ }, gtmOnFailure: () => { state.failures++ } } })

  return { state, finish: (status = 200, body = JSON.stringify({ events_received: 1, fbtrace_id: 'AX_trace', messages: [] })) => state.callback!(status, {}, body) }
}

describe('offline pinned Meta template instrumentation', () => {
  it('refuses upstream drift and produces a deterministic default-OFF artifact without network/publication', () => {
    const original = readFileSync(new URL('./fixtures/meta-template-a575edb.tpl', import.meta.url), 'utf8')

    expect(createHash('sha256').update(original).digest('hex')).toBe(META_TEMPLATE_UPSTREAM_SHA256)
    expect(() => buildMetaReceiptTemplate(original + '\n')).toThrow('digest_mismatch')
    expect(buildMetaReceiptTemplate()).toEqual(built)
    expect(built.manifest).toMatchObject({ captureDefault: false, published: false, networkUsed: false })
    const parameters = JSON.parse(built.templateData.split('___TEMPLATE_PARAMETERS___')[1].split('___SANDBOXED_JS_FOR_SERVER___')[0])

    expect(parameters.find((p: any) => p.name === 'captureEfeonceReceipt').defaultValue).toBe(false)
    const permissions = JSON.parse(built.templateData.split('___SERVER_PERMISSIONS___')[1].split('___TESTS___')[0])

    expect(permissions.filter((p: any) => p.instance.key.publicId === 'access_response')).toHaveLength(1)
    expect(JSON.stringify(permissions.at(-1))).toContain('x-efeonce-meta-receipt')
    expect(JSON.stringify(permissions.at(-1))).not.toContain('writeBodyAllowed')
  })
  it('captures the actual one-event outgoing request while preserving the upstream payload and success', () => {
    const h = harness()
    const original = readFileSync(new URL('./fixtures/meta-template-a575edb.tpl', import.meta.url), 'utf8')
    const baseline = harness({}, original.split('___SANDBOXED_JS_FOR_SERVER___')[1].split('___SERVER_PERMISSIONS___')[0])

    h.finish()
    baseline.finish()
    expect(h.state.request).toEqual(baseline.state.request)
    expect(h.state.successes).toBe(1)
    const actual = JSON.parse(h.state.request!.body)
    const receipt = JSON.parse(h.state.response['x-efeonce-meta-receipt'])

    expect(actual.data).toHaveLength(1)
    expect(receipt).toMatchObject({ eventId: actual.data[0].event_id, eventTime: actual.data[0].event_time,
      eventName: 'Lead', attemptId: ATTEMPT, attempt: 1, graphHttpStatus: 200, eventsReceived: 1, fbtraceId: 'AX_trace' })
    expect(h.state.request!.body).not.toContain(ATTEMPT)
    expect(h.state.response['x-efeonce-meta-receipt']).not.toMatch(/fixture-secret|user_data|messages|https:/)
  })
  it.each([{ enabled: false }, { client: 'GA4' }, { path: '/g/collect' }, { event: { event_name: 'page_view' } }, { attempt: 'invalid' }, { permit: false }])('does not expose receipts outside authenticated opt-in scope %j', overrides => {
    const h = harness(overrides)

    h.finish()
    expect(h.state.response).toEqual({})
    expect(h.state.successes).toBe(1)
  })
  it.each(['{bad', JSON.stringify({ events_received: '1' }), JSON.stringify({ fbtrace_id: 'private@example.test' }), 'x'.repeat(16385)])('invalid provider body never changes a successful HTTP outcome', body => {
    const h = harness()

    h.finish(200, body)
    expect(h.state.successes).toBe(1)
    expect(JSON.parse(h.state.response['x-efeonce-meta-receipt']).bodyStatus).not.toBe('valid')
    expect(h.state.response['x-efeonce-meta-receipt']).not.toContain('private')
  })
  it.each([400, 429, 503])('retains HTTP %i and sanitized errors without changing the existing failure callback', status => {
    const h = harness()

    h.finish(status, JSON.stringify({ error: { code: 190, error_subcode: 463, fbtrace_id: 'AX_error', message: 'private@example.test fixture-secret' } }))
    expect(h.state.failures).toBe(1)
    expect(JSON.parse(h.state.response['x-efeonce-meta-receipt'])).toMatchObject({ graphHttpStatus: status, errorCode: 190, errorSubcode: 463, fbtraceId: 'AX_error' })
    expect(h.state.response['x-efeonce-meta-receipt']).not.toContain('private')
  })
  it('isolates concurrent requests completed in reverse order without shared storage', () => {
    const first = harness(), second = harness({ attempt: EVENT, event: { event_id: ATTEMPT } })

    second.finish(200, JSON.stringify({ events_received: 1, fbtrace_id: 'SECOND' }))
    first.finish(200, JSON.stringify({ events_received: 1, fbtrace_id: 'FIRST' }))
    expect(JSON.parse(first.state.response['x-efeonce-meta-receipt'])).toMatchObject({ eventId: EVENT, attemptId: ATTEMPT, fbtraceId: 'FIRST' })
    expect(JSON.parse(second.state.response['x-efeonce-meta-receipt'])).toMatchObject({ eventId: ATTEMPT, attemptId: EVENT, fbtraceId: 'SECOND' })
  })
})
