import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { execute, getDb, statements } = vi.hoisted(() => ({
  execute: vi.fn(), getDb: vi.fn(), statements: [] as Array<{ text: string; values: unknown[] }>,
}))

vi.mock('@/lib/db', () => ({ getDb }))
vi.mock('kysely', () => ({ sql: (parts: TemplateStringsArray, ...values: unknown[]) => {
  statements.push({ text: parts.join('?'), values })

  return { execute }
} }))

import { configureHubSpotSubmissionTracing, assertHubSpotReceiptStorageReady, listPendingHubspotReceipts, saveHubspotReceiptCheck } from './receipt-store'
import { createHubSpotFormReceipt, type HubSpotFormReceipt } from './receipts'

const db = {} as NonNullable<Parameters<typeof listPendingHubspotReceipts>[1]>
const attemptId = 'fatt-11111111-1111-4111-8111-111111111111'
const submissionId = 'fsub-22222222-2222-4222-8222-222222222222'
const nativeSubmissionId = '33333333-3333-4333-8333-333333333333'
const previous = createHubSpotFormReceipt({ portalId: '48713323', formGuid: '44444444-4444-4444-8444-444444444444', submissionIdProperty: 'ef_greenhouse_submission_id' }, submissionId, new Date('2026-10-17T12:00:00Z'))!
const receipt: HubSpotFormReceipt = { ...previous, checks: 1, status: 'verified', checkedAt: '2026-10-17T12:01:00Z', paginationComplete: true }

beforeEach(() => { vi.clearAllMocks(); statements.length = 0; getDb.mockResolvedValue(db) })

describe('durable native HubSpot receipt store', () => {
  it('checks both additive columns before a non-idempotent POST can occur', async () => {
    execute.mockRejectedValueOnce(new Error('column does not exist'))
    await expect(assertHubSpotReceiptStorageReady(db)).rejects.toThrow('column does not exist')
    expect(statements[0].text).toContain('SELECT provider_submission_id,provider_receipt_json')
    expect(statements[0].text).toContain('LIMIT 0')
    expect(statements[0].text).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/)
  })
  it('selects only due succeeded HubSpot attempts without resending, and lets reconciler exhaust >24h receipts', async () => {
    const createdAt = '2026-10-15T12:00:00Z'

    execute.mockResolvedValueOnce({ rows: [{ attempt_id: attemptId, submission_id: submissionId, destination_id: 'fdst-1', created_at: createdAt, provider_receipt_json: previous }] })
    const rows = await listPendingHubspotReceipts(5, db)

    expect(rows).toEqual([{ attemptId, submissionId, destinationId: 'fdst-1', createdAt, receipt: previous }])
    expect(getDb).not.toHaveBeenCalled()
    expect(statements[0].text).toContain("provider='hubspot' AND status='succeeded' AND provider_submission_id IS NULL")
    expect(statements[0].text).toContain("provider_receipt_json->>'status'='pending'")
    expect(statements[0].text).toContain("(provider_receipt_json->>'nextCheckAt')::timestamptz <= CURRENT_TIMESTAMP")
    expect(statements[0].text).toContain("CASE WHEN pg_input_is_valid(provider_receipt_json->>'nextCheckAt','timestamp with time zone')")
    expect(statements[0].text).not.toContain("INTERVAL '24 hours'")
    expect(statements[0].values).toEqual([8, 5])
    expect(statements[0].text).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b/)
  })

  it('uses the canonical getDb by default and never returns an arbitrary JSON payload', async () => {
    execute.mockResolvedValueOnce({ rows: [{ attempt_id: attemptId, submission_id: submissionId, destination_id: 'fdst-1', created_at: new Date(), provider_receipt_json: { ...previous, rawEmail: 'private@example.invalid' } }] })
    const result = await listPendingHubspotReceipts()

    expect(getDb).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledWith(db)
    expect(JSON.stringify(result)).not.toContain('@')
    expect(statements[0].values).toContain(5)
  })

  it.each([0, 11, 1.2, NaN])('rejects invalid batch limit %s before touching DB', async limit => {
    await expect(listPendingHubspotReceipts(limit, db)).rejects.toThrow('invalid_hubspot_receipt_limit')
    expect(execute).not.toHaveBeenCalled()
  })

  it('rejects malformed/terminal or differently bound receipt rows', async () => {
    const row = { attempt_id: attemptId, submission_id: submissionId, destination_id: 'fdst-1', created_at: new Date() }

    execute.mockResolvedValueOnce({ rows: [
      { ...row, provider_receipt_json: { raw: 'private@example.invalid' } },
      { ...row, provider_receipt_json: { ...previous, status: 'verified' } },
      { ...row, submission_id: 'fsub-other', provider_receipt_json: previous },
      { ...row, attempt_id: 'unsafe', provider_receipt_json: previous },
    ] })
    expect(await listPendingHubspotReceipts(10, db)).toEqual([])
  })

  it.each([nativeSubmissionId, '123456789'])('persists a verified native ID %s using full-snapshot CAS and allowlisted JSON', async nativeId => {
    execute.mockResolvedValueOnce({ rows: [{ attempt_id: attemptId }] })
    const success = await saveHubspotReceiptCheck({ attemptId, previous, receipt: { ...receipt, rawEmail: 'private@example.invalid' } as any, nativeSubmissionId: nativeId }, db)

    expect(success).toBe(true)
    const query = statements[0]

    expect(query.text).toContain('provider_receipt_json=?::jsonb')
    expect(query.text).toContain("provider='hubspot' AND status='succeeded'")
    expect(query.text).toContain('provider_submission_id IS NULL')
    for (const field of ['contract', 'status', 'checks', 'portalId', 'formGuid', 'markerProperty', 'markerValue']) expect(query.text).toContain(`provider_receipt_json->>'${field}'`)
    expect(query.values).toContain(JSON.stringify(previous))
    expect(query.values).toContain(nativeId)
    expect(JSON.stringify(query.values)).not.toContain('@')
    expect(query.text).not.toContain(attemptId)
  })

  it('preserves retries without assigning a fake native ID', async () => {
    execute.mockResolvedValueOnce({ rows: [{ attempt_id: attemptId }] })
    const next: HubSpotFormReceipt = { ...previous, checks: 1, checkedAt: receipt.checkedAt, nextCheckAt: '2026-10-17T12:05:00Z', safeErrorCode: 'not_yet_visible' }

    expect(await saveHubspotReceiptCheck({ attemptId, previous, receipt: next }, db)).toBe(true)
    expect(statements[0].values[1]).toBeNull()
  })

  it('reports a lost compare-and-swap without a second write', async () => {
    execute.mockResolvedValueOnce({ rows: [] })
    expect(await saveHubspotReceiptCheck({ attemptId, previous, receipt, nativeSubmissionId }, db)).toBe(false)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it.each([
    { attemptId: 'fatt-bad' },
    { previous: { ...previous, status: 'verified' } },
    { receipt: { ...receipt, checks: 0 } },
    { receipt: { ...receipt, portalId: '19893546' } },
    { receipt: { ...receipt, formGuid: nativeSubmissionId } },
    { receipt: { ...receipt, markerValue: 'fsub-55555555-5555-4555-8555-555555555555' } },
    { receipt: { ...receipt, checkedAt: undefined } },
    { receipt: { ...receipt, paginationComplete: false } },
    { nativeSubmissionId: 'hsforms-' + submissionId },
    { nativeSubmissionId: undefined },
    { receipt: { ...receipt, status: 'pending' }, nativeSubmissionId },
    { previous: { ...previous, checks: 7 }, receipt: { ...receipt, checks: 8, status: 'pending' }, nativeSubmissionId: undefined },
  ])('rejects invalid state/identity evidence before SQL %j', async patch => {
    await expect(saveHubspotReceiptCheck({ attemptId, previous, receipt, nativeSubmissionId, ...patch } as any, db)).rejects.toThrow('invalid_hubspot_receipt_check')
    expect(execute).not.toHaveBeenCalled()
    expect(getDb).not.toHaveBeenCalled()
  })

  it('allows terminal exhaustion without a native ID and never calls the provider', async () => {
    execute.mockResolvedValueOnce({ rows: [{ attempt_id: attemptId }] })
    expect(await saveHubspotReceiptCheck({ attemptId, previous: { ...previous, checks: 7, checkedAt: receipt.checkedAt }, receipt: { ...previous, checks: 8, status: 'exhausted', checkedAt: receipt.checkedAt } }, db)).toBe(true)
    expect(statements[0].values[1]).toBeNull()
  })
})

describe('receipt migration preservation contract', () => {
  it('has markers, nullable native ID, JSON default, validation, index and immutable-evidence guards', () => {
    const migration = readFileSync(new URL('../../../../../../docs/tasks/pending-migrations/hubspot-native-form-receipts.sql.pending', import.meta.url), 'utf8')
    const [up, down] = migration.split('-- Down Migration')

    expect(up).toContain('-- Up Migration\n')
    expect(up).toContain("provider_receipt_json JSONB NOT NULL DEFAULT '{}'::jsonb")
    expect(up).toContain("CHECK (jsonb_typeof(provider_receipt_json)='object')")
    expect(up).toContain("provider='hubspot' AND status='succeeded'")
    expect(up).toContain("IS TRUE")
    expect(up).toContain('hubspot_form_receipt_terminal_immutable')
    expect(up).toContain('hubspot_form_receipt_identity_immutable')
    expect(up).toContain('hubspot_native_submission_immutable')
    for (const name of ['provider_submission_id', 'provider_receipt_json', 'form_attempt_provider_receipt_object_ck', 'form_attempt_native_submission_ck', 'form_attempt_hubspot_receipt_pending_idx', 'guard_hubspot_form_receipt_update()', 'trg_hubspot_form_receipt_update']) expect(up.split('-- Anti pre-up-marker:')[1]).toContain(name)
    expect(down).toContain('Forward-only')
    expect(down).not.toMatch(/\b(?:DROP|CREATE|ALTER)\b/)
  })
})

describe('internal release opt-in configuration', () => {
  const input = { destinationId: 'fdst-11111111-1111-4111-8111-111111111111',
    expectedMapping: { portalId: '48713323', formGuid: '44444444-4444-4444-8444-444444444444', fieldMapping: { email: 'email' }, consentText: 'preserved' }, enabled: true }

  it.each([true, false])('adds/removes only the technical property atomically with CAS (enabled=%s)', async enabled => {
    execute.mockResolvedValueOnce({ rows: [{ destination_id: input.destinationId }] })
    expect(await configureHubSpotSubmissionTracing({ ...input, enabled }, db)).toBe(true)
    expect(statements[0].text).toContain("AND mapping_json=")
    expect(statements[0].text).toContain("adapter_kind='hubspot_forms_secure_submit'")
    expect(statements[0].text).not.toMatch(/\b(?:INSERT|DELETE)\b/)
    expect(statements[0].values).toContain(JSON.stringify(input.expectedMapping))
    expect(statements[0].values[0]).toBe(enabled)
  })
  it('returns false on drift without a second write', async () => {
    execute.mockResolvedValueOnce({ rows: [] })
    expect(await configureHubSpotSubmissionTracing(input, db)).toBe(false)
    expect(execute).toHaveBeenCalledTimes(1)
  })
  it.each([
    { destinationId: 'fdst-invalid' }, { expectedMapping: { ...input.expectedMapping, portalId: '19893546' } },
    { expectedMapping: { ...input.expectedMapping, submissionIdProperty: 'email' } },
    { expectedMapping: { ...input.expectedMapping, fieldMapping: null } },
  ])('rejects out-of-scope configuration before SQL', async patch => {
    await expect(configureHubSpotSubmissionTracing({ ...input, ...patch } as any, db)).rejects.toThrow('invalid_hubspot_receipt_destination')
    expect(execute).not.toHaveBeenCalled()
  })
})
