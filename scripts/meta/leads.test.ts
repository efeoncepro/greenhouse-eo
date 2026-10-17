import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { HubSpotLeadTraceClient } from './lead-trace-hubspot'
import type { LeadTraceInput } from './lead-trace-model'
import type { LeadTraceRuntime, LeadTraceSnapshot } from './lead-trace-runtime'
import { runLeadTraceCommand } from './leads'

const factory = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('./lead-trace-runtime', () => ({ createLeadTraceRuntime: factory.create }))

const SUBMISSION = 'fsub-b2222222-2222-4222-8222-222222222222'
const SECOND = 'fsub-c3333333-3333-4333-8333-333333333333'
const EVENT = 'a1111111-1111-4111-8111-111111111111'
const NATIVE = 'e5555555-5555-4555-8555-555555555555'
const FORM = 'd4444444-4444-4444-8444-444444444444'
const EMAIL = 'private.person@example.test'
const TOKEN = 'private-hubspot-mock-token-value'
const NOW = new Date('2026-10-17T20:00:00Z')
const directories: string[] = []

afterEach(() => {
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true })
  factory.create.mockReset()
})

function metadata(): LeadTraceInput {
  return { query: { kind: 'submission', id: SUBMISSION },
    source: { submission_id: SUBMISSION, status: 'delivered', form_id: FORM, form_version_id: 'fver-published', surface_id: 'public-site', created_at: NOW },
    conversion: { event_id: EVENT, source_kind: 'form_submission', source_id: SUBMISSION, occurred_at: NOW,
      consent_snapshot_json: { advertisement: true, analytics: true, globalPrivacyControl: false, capturedAt: NOW.toISOString() }, encrypted_payload_present: true },
    deliveries: [{ event_id: EVENT, destination: 'meta', state: 'http_accepted', attempts: 1, http_status: 200 }],
    hubspotAttempts: [{ submission_id: SUBMISSION, destination_id: 'hubspot-main', provider: 'hubspot', adapter_version: 'hubspot-forms-v1',
      status: 'succeeded', http_status: 200, external_id: 'hsforms-' + SUBMISSION, created_at: NOW }] }
}

function fixture() {
  const snapshot: LeadTraceSnapshot = { metadata: metadata(), privateHubspotTargets: [{
    destinationId: 'hubspot-main', portalId: '48713323', formGuid: FORM, privateEmail: EMAIL,
    fromMs: NOW.getTime() - 300000, toMs: NOW.getTime() + 300000
  }] }

  const runtime = {
    read: vi.fn<LeadTraceRuntime['read']>(async () => structuredClone(snapshot)),
    find: vi.fn<LeadTraceRuntime['find']>(async () => ({ candidates: [], hasMore: false })),
    tokenProvider: vi.fn<LeadTraceRuntime['tokenProvider']>(async () => TOKEN),
    close: vi.fn<LeadTraceRuntime['close']>(async () => undefined)
  } satisfies LeadTraceRuntime

  const calls: URL[] = []
  let formStatus = 200
  let portalId = '48713323'

  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))

    calls.push(url)
    expect(init?.method).toBe('GET')
    if (url.pathname === '/account-info/v3/details') return Response.json({ portalId })
    if (url.pathname.startsWith('/form-integrations/')) return Response.json(formStatus === 200 ? {
      results: [{ conversionId: NATIVE, submittedAt: NOW.getTime(), values: [{ name: 'email', value: EMAIL }] }]
    } : { error: 'raw provider body ' + EMAIL + ' ' + TOKEN }, { status: formStatus })
    if (url.pathname.includes('/contacts/')) return Response.json({ id: '12345', createdAt: '2020-01-01T00:00:00Z', properties: { email: EMAIL } })
    throw new Error('unexpected fixture request')
  }) as typeof fetch

  const hubspot = new HubSpotLeadTraceClient({ tokenProvider: runtime.tokenProvider, fetchImpl })


return { snapshot, runtime, calls, hubspot, setFormStatus: (status: number) => { formStatus = status }, setPortal: (id: string) => { portalId = id } }
}

function privateInput(value: unknown = { email: EMAIL }): string {
  const dir = mkdtempSync(join(tmpdir(), 'meta-lead-cli-test-'))

  directories.push(dir)
  const path = join(dir, 'lookup.json')

  writeFileSync(path, JSON.stringify(value), { mode: 0o600 })

return path
}

describe('lead trace CLI with injected runtime and provider transports', () => {
  it.each([
    ['leads', 'trace'], ['leads', 'trace', '--submission-id', SUBMISSION, '--event-id', EVENT],
    ['leads', 'trace', '--submission-id', SUBMISSION.slice(5)], ['leads', 'trace', '--event-id', SUBMISSION],
    ['leads', 'trace', '--event-id', EMAIL], ['leads', 'trace', '--event-id', EVENT, '--input', 'unused'],
    ['leads', 'trace', '--event-id', EVENT, '--source-only', '--pages', '2'],
    ['leads', 'trace', '--event-id', EVENT, '--pages', '11'],
    ['leads', 'trace', '--email', EMAIL], ['leads', 'unknown'],
  ])('rejects invalid selectors before creating a runtime or resolving credentials: %j', async (...args) => {
    const result = await runLeadTraceCommand(args, { now: NOW })

    expect(result.exitCode).toBe(2)
    expect(factory.create).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain(EMAIL)
  })

  it('requires a private regular email lookup file and never echoes its contents', async () => {
    const f = fixture()
    const input = privateInput()

    chmodSync(input, 0o644)
    expect(await runLeadTraceCommand(['leads', 'find', '--input', input], { runtime: f.runtime, now: NOW }))
      .toMatchObject({ exitCode: 2, output: { error: { code: 'private_lead_lookup_input_required' } } })
    chmodSync(input, 0o600)
    const link = join(directories.at(-1)!, 'lookup-link.json')

    symlinkSync(input, link)
    const rejected = await runLeadTraceCommand(['leads', 'find', '--input', link], { runtime: f.runtime, now: NOW })

    expect(rejected.exitCode).toBe(2)
    expect(JSON.stringify(rejected)).not.toContain(EMAIL)
    expect(f.runtime.find).not.toHaveBeenCalled()
    expect(f.runtime.tokenProvider).not.toHaveBeenCalled()
  })

  it('returns ambiguous candidate IDs without auto-selecting a source or calling HubSpot', async () => {
    const f = fixture()

    f.runtime.find.mockResolvedValue({ candidates: [{ submission_id: SUBMISSION, email: EMAIL, normalized_fields_json: { email: EMAIL } }, { submission_id: SECOND }], hasMore: false })
    const result = await runLeadTraceCommand(['leads', 'find', '--input', privateInput()], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result).toMatchObject({ exitCode: 0, output: { data: { candidates: [{ submissionId: SUBMISSION }, { submissionId: SECOND }], pagination: { complete: true } } } })
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(JSON.stringify(result)).not.toContain('normalized_fields_json')
    expect(f.runtime.read).not.toHaveBeenCalled()
    expect(f.calls).toHaveLength(0)
    expect(f.runtime.tokenProvider).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(f.runtime.find.mock.calls[0][0]).toMatchObject({ privateEmail: EMAIL, limit: 10 })
  })

  it('traces an ACK with a preexisting contact and native form candidate as correlated, not newly created or processed', async () => {
    const f = fixture()
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result).toMatchObject({ exitCode: 0, output: { data: {
      source: { status: 'recorded', submissionId: SUBMISSION }, meta: { delivery: { status: 'ack_recorded' }, processing: { status: 'unknown' } },
      hubspot: { localAttempt: { status: 'succeeded_recorded' }, remoteForm: { status: 'correlated' }, remoteContact: { status: 'confirmed' }, contactCreatedByThisSubmission: 'unknown' }
    } } })
    expect(f.calls.some(url => url.pathname.startsWith('/form-integrations/'))).toBe(true)
    expect(f.calls.some(url => url.pathname.includes('/contacts/'))).toBe(true)
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(JSON.stringify(result)).not.toContain(TOKEN)
  })

  it('keeps a denied Forms history independent from a successful contact lookup and source ACK', async () => {
    const f = fixture()

    f.setFormStatus(403)
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result).toMatchObject({ exitCode: 6, output: { coverage: { complete: false }, data: {
      meta: { delivery: { status: 'ack_recorded' } }, hubspot: { remoteForm: { status: 'unavailable' }, remoteContact: { status: 'confirmed' } }
    } } })
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(JSON.stringify(result)).not.toContain(TOKEN)
    expect(JSON.stringify(result)).not.toContain('raw provider body')
  })

  it('source-only never resolves a HubSpot token, even with provider targets present', async () => {
    const f = fixture()
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION, '--source-only'], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result).toMatchObject({ exitCode: 0, output: { coverage: { sourceOnly: true, complete: true }, data: { hubspot: { remoteForm: { status: 'not_checked' }, remoteContact: { status: 'not_checked' } } } } })
    expect(f.runtime.tokenProvider).not.toHaveBeenCalled()
    expect(f.calls).toHaveLength(0)
    expect(f.runtime.close).not.toHaveBeenCalled()
  })

  it('creates and closes only an owned mocked runtime after valid argument parsing', async () => {
    const f = fixture()

    factory.create.mockResolvedValue(f.runtime)
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION, '--source-only'], { now: NOW })

    expect(result.exitCode).toBe(0)
    expect(factory.create).toHaveBeenCalledOnce()
    expect(f.runtime.close).toHaveBeenCalledOnce()
    expect(f.runtime.tokenProvider).not.toHaveBeenCalled()
  })

  it('distinguishes an empty persisted search from a missing trace without inventing a reason or touching HubSpot', async () => {
    const f = fixture()
    const found = await runLeadTraceCommand(['leads', 'find', '--input', privateInput()], { runtime: f.runtime, now: NOW })

    expect(found).toMatchObject({ exitCode: 0, output: { data: { candidates: [], pagination: { complete: true } } } })
    f.runtime.read.mockResolvedValue(null)
    const trace = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(trace).toMatchObject({ exitCode: 6, output: { data: { source: { status: 'not_found' }, consent: { status: 'unknown' }, measurement: { status: 'not_recorded' } } } })
    expect(f.calls).toHaveLength(0)
  })

  it('blocks a configured foreign portal before provider reads and never exports private target data', async () => {
    const f = fixture()

    f.snapshot.privateHubspotTargets[0].portalId = '19893546'
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result).toMatchObject({ exitCode: 6, output: { hubspotVerification: [{ formSubmission: { status: 'unavailable', safeErrorCode: 'hubspot_portal_out_of_scope' } }] } })
    expect(f.calls).toHaveLength(0)
    expect(f.runtime.tokenProvider).not.toHaveBeenCalled()
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(JSON.stringify(result)).not.toContain('19893546')
  })

  it('checks the live portal once and denies both remote reads when the token belongs elsewhere', async () => {
    const f = fixture()

    f.setPortal('19893546')
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result.exitCode).toBe(6)
    expect(f.calls.map(url => url.pathname)).toEqual(['/account-info/v3/details'])
    expect(f.runtime.tokenProvider).toHaveBeenCalledOnce()
    expect(JSON.stringify(result)).not.toContain(EMAIL)
    expect(JSON.stringify(result)).not.toContain(TOKEN)
  })
  it('keeps coverage incomplete when another attempted destination lacks a readable configured target', async () => {
    const f = fixture()

    f.snapshot.metadata.hubspotAttempts = [...f.snapshot.metadata.hubspotAttempts, {
      submission_id: SUBMISSION, destination_id: 'hubspot-unconfigured', provider: 'hubspot', adapter_version: 'hsforms-v3-secure-submit', status: 'failed', http_status: 400
    }]
    const result = await runLeadTraceCommand(['leads', 'trace', '--submission-id', SUBMISSION], { runtime: f.runtime, hubspot: f.hubspot, now: NOW })

    expect(result).toMatchObject({ exitCode: 6, output: { coverage: { complete: false, uncheckedHubspotDestinations: ['hubspot-unconfigured'] } } })
  })

})
