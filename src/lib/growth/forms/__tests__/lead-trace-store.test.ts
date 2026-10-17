import { beforeEach, describe, expect, it, vi } from 'vitest'

const { execute, statements } = vi.hoisted(() => ({ execute: vi.fn(), statements: [] as Array<{ text: string; values: unknown[] }> }))

vi.mock('kysely', () => ({ sql: (parts: TemplateStringsArray, ...values: unknown[]) => {
  statements.push({ text: parts.join('?'), values })

  return { execute }
} }))

import { findGrowthLeadTraceCandidates, readGrowthLeadTrace, GrowthLeadTraceStoreError } from '../lead-trace-store'

const db = {} as Parameters<typeof readGrowthLeadTrace>[0]
const submission = 'fsub-11111111-1111-4111-8111-111111111111'
const event = '22222222-2222-4222-8222-222222222222'
const source = { submission_id: submission, form_id: 'form-1', form_version_id: 'fver-1', surface_id: 'surface-1', status: 'delivered', created_at: new Date('2026-10-17T12:00:00Z'), delivery_attempts: 0 }

const conversion = { event_id: event, source_kind: 'form_submission', source_id: submission,
  occurred_at: '2026-10-17T12:00:00Z', consent_snapshot_json: { advertisement: true, analytics: false, globalPrivacyControl: false,
    source: 'hubspot_categories', policyVersion: 'efeonce-categories-2026-10-13', capturedAt: '2026-10-17T12:00:00Z',
    rawEmail: 'private.person@example.invalid', fbp: 'private-cookie' }, policy_revision_id: event, encrypted_payload_present: false }

const attempt = { submission_id: submission, destination_id: 'dest-1', provider: 'hubspot', adapter_version: 'hsforms-v3-secure-submit',
  status: 'succeeded', external_id: 'hsforms-' + submission, http_status: 200, retry_count: 1,
  created_at: '2026-10-17T12:00:18Z', completed_at: '2026-10-17T12:00:19Z' }

const target = { destination_id: 'dest-1', portal_id: '48713323', form_guid: '33333333-3333-4333-8333-333333333333', private_email: 'PRIVATE.PERSON@example.invalid' }

beforeEach(() => { vi.clearAllMocks(); statements.length = 0 })

function arrangeSubmission() {
  execute.mockResolvedValueOnce({ rows: [source] })
    .mockResolvedValueOnce({ rows: [conversion] })
    .mockResolvedValueOnce({ rows: [{ event_id: event, destination: 'meta', state: 'http_accepted', attempts: 1, http_status: 200 }] })
    .mockResolvedValueOnce({ rows: [attempt] })
    .mockResolvedValueOnce({ rows: [target] })
}

describe('canonical metadata-only lead trace store', () => {
  it('projects the source, occurrence and independent attempts without selecting full contact/encrypted payloads', async () => {
    arrangeSubmission()
    const result = await readGrowthLeadTrace(db, { kind: 'submission', id: submission })

    expect(result.metadata).toMatchObject({ query: { kind: 'submission', id: submission }, source, conversion: { event_id: event, encrypted_payload_present: false }, deliveries: [{ state: 'http_accepted' }], hubspotAttempts: [{ status: 'succeeded' }] })
    expect(statements.slice(0, 4).every(q => !q.text.includes('normalized_fields_json'))).toBe(true)
    expect(statements.every(q => !q.text.includes('SELECT *') && !/\b(?:INSERT|UPDATE|DELETE|decrypt)\b/i.test(q.text))).toBe(true)
    expect(statements[1].text).toContain('(encrypted_payload_json IS NOT NULL) AS encrypted_payload_present')
    expect(statements[0].text).not.toContain(submission)
    expect(statements[0].values).toContain(submission)
  })

  it('keeps private target email out of JSON, spread, metadata and unexpected consent JSON', async () => {
    arrangeSubmission()
    const result = await readGrowthLeadTrace(db, { kind: 'submission', id: submission, privateEmail: 'accidental@example.invalid' } as any)

    expect(result.privateHubspotTargets[0].privateEmail).toBe('private.person@example.invalid')
    expect(Object.keys(result)).toEqual(['metadata'])
    expect(Object.getOwnPropertyDescriptor(result, 'privateHubspotTargets')?.enumerable).toBe(false)
    expect(JSON.stringify(result)).not.toContain('@')
    expect(JSON.stringify({ ...result })).not.toContain('private-cookie')
    expect(result.metadata.conversion?.consent_snapshot_json).toEqual({ advertisement: true, analytics: false, globalPrivacyControl: false,
      source: 'hubspot_categories', policyVersion: 'efeonce-categories-2026-10-13', capturedAt: '2026-10-17T12:00:00.000Z' })
    expect(result.metadata.query).toEqual({ kind: 'submission', id: submission })
  })

  it('derives the provider window from dispatch timestamps, not source acceptance; never treats local external id as native', async () => {
    arrangeSubmission()
    const result = await readGrowthLeadTrace(db, { kind: 'submission', id: submission })
    const scoped = result.privateHubspotTargets[0]

    expect(scoped.fromMs).toBe(Date.parse('2026-10-17T12:00:18Z') - 30_000)
    expect(scoped.toMs).toBe(Date.parse('2026-10-17T12:00:19Z') + 30_000)
    expect(scoped).not.toHaveProperty('nativeSubmissionId')
    expect(statements[4].text).toContain('COUNT(*)=1')
    expect(statements[4].values).toContain('email')
  })

  it('returns meeting occurrence metadata without guessing a Forms submission or touching contact fields', async () => {
    execute.mockResolvedValueOnce({ rows: [{ ...conversion, source_kind: 'meeting_booking', source_id: 'meeting-1' }] })
      .mockResolvedValueOnce({ rows: [] })
    const result = await readGrowthLeadTrace(db, { kind: 'event', id: event })

    expect(result.metadata.source).toBeNull()
    expect(result.metadata.conversion?.source_kind).toBe('meeting_booking')
    expect(result.privateHubspotTargets).toEqual([])
    expect(execute).toHaveBeenCalledTimes(2)
    expect(statements.every(q => !q.text.includes('form_submission'))).toBe(true)
  })

  it('preserves absent measurement independently from an accepted source and successful HubSpot attempt', async () => {
    execute.mockResolvedValueOnce({ rows: [source] }).mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [attempt] }).mockResolvedValueOnce({ rows: [target] })
    const result = await readGrowthLeadTrace(db, { kind: 'submission', id: submission })

    expect(result.metadata.conversion).toBeNull()
    expect(result.metadata.deliveries).toEqual([])
    expect(result.metadata.hubspotAttempts).toHaveLength(1)
  })

  it('returns an empty shell for a missing source and does not make provider targets', async () => {
    execute.mockResolvedValueOnce({ rows: [] })
    const result = await readGrowthLeadTrace(db, { kind: 'submission', id: submission })

    expect(result.metadata).toEqual({ query: { kind: 'submission', id: submission }, source: null, conversion: null, deliveries: [], hubspotAttempts: [] })
    expect(result.privateHubspotTargets).toEqual([])
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('does not silently truncate an unexpected attempt history', async () => {
    execute.mockResolvedValueOnce({ rows: [source] }).mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: Array.from({ length: 101 }, () => attempt) })

    await expect(readGrowthLeadTrace(db, { kind: 'submission', id: submission })).rejects.toThrow('lead_trace_attempt_limit_exceeded')
  })

  it.each([{ kind: 'event', id: 'not-a-uuid' }, { kind: 'submission', id: 'fsub-x OR 1=1' }, { kind: 'other', id: submission }])('rejects invalid selectors before SQL: %j', async query => {
    await expect(readGrowthLeadTrace(db, query as any)).rejects.toBeInstanceOf(GrowthLeadTraceStoreError)
    expect(execute).not.toHaveBeenCalled()
  })
})

describe('private email candidate discovery', () => {
  it('uses canonical normalized hash plus a single typed-email fallback and returns only bounded source metadata', async () => {
    execute.mockResolvedValueOnce({ rows: [source, { ...source, submission_id: 'fsub-2' }] })
    const result = await findGrowthLeadTraceCandidates(db, { privateEmail: 'PRIVATE.PERSON@example.invalid', from: '2026-10-16T00:00:00Z', to: '2026-10-18T00:00:00Z', limit: 1 })
    const query = statements[0]

    expect(result).toEqual({ candidates: [source], hasMore: true })
    expect(JSON.stringify(result)).not.toContain('@')
    expect(query.text).not.toContain('private.person')
    expect(query.values).toContain('private.person@example.invalid')
    expect(query.values.some(v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v))).toBe(true)
    expect(query.text).toContain('s.lead_email_hash IS NULL')
    expect(query.text).toContain('COUNT(*)')
    expect(query.text).not.toContain('SELECT *')
    expect(query.values.at(-1)).toBe(2)
  })

  it.each([
    { privateEmail: 'invalid', from: '2026-10-16T00:00:00Z', to: '2026-10-18T00:00:00Z' },
    { privateEmail: 'private.person@example.invalid', from: 'invalid', to: '2026-10-18T00:00:00Z' },
    { privateEmail: 'private.person@example.invalid', from: '2026-10-19T00:00:00Z', to: '2026-10-18T00:00:00Z' },
    { privateEmail: 'private.person@example.invalid', from: '2026-10-16T00:00:00Z', to: '2026-10-18T00:00:00Z', limit: 101 },
  ])('rejects invalid private selectors without SQL: %j', async input => {
    await expect(findGrowthLeadTraceCandidates(db, input)).rejects.toBeInstanceOf(GrowthLeadTraceStoreError)
    expect(execute).not.toHaveBeenCalled()
  })
})
