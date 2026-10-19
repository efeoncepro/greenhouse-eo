import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clientQuery, transaction, globalQuery, rollback } = vi.hoisted(() => ({ clientQuery: vi.fn(), transaction: vi.fn(), globalQuery: vi.fn(), rollback: vi.fn() }))

vi.mock('@/lib/db', () => ({ query: globalQuery, withTransaction: transaction }))
vi.mock('@/lib/growth/measurement/store', () => ({ enqueueMeasurementConversion: vi.fn() }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import { correctCommercialFormClassification } from '../classification'
import { commercialFormClassificationSchema, FormClassificationConflictError, formDefinitionFingerprint } from '../classification-contract'

const definition = { form_id: 'fdef-fixture', form_key: '11111111-1111-4111-8111-111111111111', slug: 'commercial-fixture', name: 'Commercial quote', form_kind: 'lead_magnet', purpose: 'Request a commercial service quote', risk_profile: 'medium', status: 'active', created_at: new Date('2026-10-18T12:00:00Z'), updated_at: new Date('2026-10-18T12:00:00Z'), owner_team: 'growth', default_locale: 'es-CL', created_by: 'fixture' }
const updated = { ...definition, form_kind: 'quote_request', updated_at: new Date('2026-10-18T13:00:00Z') }
const input = () => ({ formKey: definition.form_key, expectedDefinitionSha256: formDefinitionFingerprint(definition), expectedPublishedVersionId: 'fver-fixture', fromFormKind: 'lead_magnet' as const, toFormKind: 'quote_request' as const, commercialIntentConfirmed: true as const, reason: 'Operator confirmed commercial service intent' })

beforeEach(() => {
  vi.resetAllMocks()
  clientQuery.mockResolvedValue({ rows: [] })
  transaction.mockImplementation(async fn => {
    try { return await fn({ query: clientQuery }) }
    catch (error) { rollback(); throw error }
  })
})

function arrange(row = definition, versions = [{ form_version_id: 'fver-fixture' }], after = updated) {
  clientQuery.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: versions }).mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [after] })
}

describe('governed commercial classification correction', () => {
  it('locks current metadata/version and changes only kind and updated_at', async () => {
    arrange()
    const result = await correctCommercialFormClassification(input(), 'internal-author')

    expect(result).toMatchObject({ ok: true, previousKind: 'lead_magnet', formKind: 'quote_request', publishedVersionPreserved: true, sourceIdentityPreserved: true, actorId: 'internal-author' })
    expect(clientQuery.mock.calls[0][0]).toContain('FOR UPDATE')
    expect(clientQuery.mock.calls[1][0]).toContain('FOR SHARE')
    expect(clientQuery.mock.calls[3][0]).toContain('SET form_kind=$1, updated_at=')
    expect(clientQuery.mock.calls[3][1]).toEqual(['quote_request', definition.form_id, definition.form_key, 'lead_magnet'])
    const [auditSql, auditParams] = clientQuery.mock.calls[2]

    expect(auditSql).toContain('INSERT INTO greenhouse_core.api_platform_command_executions')
    expect(auditParams).toEqual(expect.arrayContaining(['internal', 'internal_actor', 'internal-author', 'growth.forms.classification.correct', `/api/admin/growth/forms/${definition.form_id}/classification`]))
    const [completeSql, completeParams] = clientQuery.mock.calls[4]

    expect(completeSql).toContain('UPDATE greenhouse_core.api_platform_command_executions')
    expect(completeParams[0]).toBe(result.commandExecutionId)
    expect(JSON.parse(completeParams[2])).toMatchObject({ commandExecutionId: result.commandExecutionId, actorId: 'internal-author', reason: input().reason, formKey: definition.form_key, beforeSha256: input().expectedDefinitionSha256, afterSha256: formDefinitionFingerprint(updated) })
    expect(JSON.parse(completeParams[2])).not.toHaveProperty('definition')
    expect(globalQuery).not.toHaveBeenCalled()
    expect(rollback).not.toHaveBeenCalled()
  })

  it.each([{ status: 'archived' }, { form_kind: 'application' }, { risk_profile: 'high' }, { risk_profile: 'restricted' }, { purpose: '' }, { name: 'Concurrent edit' }])('rejects changed or ineligible source metadata %j before UPDATE', async patch => {
    arrange({ ...definition, ...patch })
    await expect(correctCommercialFormClassification(input(), 'internal-author')).rejects.toBeInstanceOf(FormClassificationConflictError)
    expect(clientQuery.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false)
  })

  it.each([{ versions: [] }, { versions: [{ form_version_id: 'fver-other' }] }, { versions: [{ form_version_id: 'fver-fixture' }, { form_version_id: 'fver-second' }] }])('rejects missing, replaced or ambiguous published version %j', async ({ versions }) => {
    arrange(definition, versions)
    await expect(correctCommercialFormClassification(input(), 'internal-author')).rejects.toBeInstanceOf(FormClassificationConflictError)
    expect(clientQuery.mock.calls.some(([sql]) => sql.startsWith('UPDATE'))).toBe(false)
  })

  it('throws inside the transaction if unrelated metadata changed on UPDATE', async () => {
    arrange(definition, [{ form_version_id: 'fver-fixture' }], { ...updated, purpose: 'Unexpected change' })
    await expect(correctCommercialFormClassification(input(), 'internal-author')).rejects.toBeInstanceOf(FormClassificationConflictError)
  })

  it('refuses a second correction using the old fingerprint', async () => {
    arrange(updated)
    await expect(correctCommercialFormClassification(input(), 'internal-author')).rejects.toBeInstanceOf(FormClassificationConflictError)
    expect(clientQuery).toHaveBeenCalledTimes(1)
  })

  it('aborts before the metadata UPDATE when audit registration fails', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [definition] }).mockResolvedValueOnce({ rows: [{ form_version_id: 'fver-fixture' }] }).mockRejectedValueOnce(new Error('audit unavailable'))
    await expect(correctCommercialFormClassification(input(), 'internal-author')).rejects.toThrow('audit unavailable')
    expect(clientQuery.mock.calls.some(([sql]) => sql.includes('UPDATE greenhouse_growth.form_definition'))).toBe(false)
    expect(rollback).toHaveBeenCalledOnce()
    expect(globalQuery).not.toHaveBeenCalled()
  })

  it('propagates audit completion failure through the transaction for rollback', async () => {
    arrange()
    clientQuery.mockRejectedValueOnce(new Error('audit completion unavailable'))
    await expect(correctCommercialFormClassification(input(), 'internal-author')).rejects.toThrow('audit completion unavailable')
    expect(clientQuery.mock.calls[3][0]).toContain('UPDATE greenhouse_growth.form_definition')
    expect(clientQuery.mock.calls[4][0]).toContain('UPDATE greenhouse_core.api_platform_command_executions')
    expect(rollback).toHaveBeenCalledOnce()
    expect(globalQuery).not.toHaveBeenCalled()
  })

  it('requires explicit intent and rejects extra authority or destination fields', () => {
    expect(commercialFormClassificationSchema.safeParse({ ...input(), commercialIntentConfirmed: false }).success).toBe(false)
    expect(commercialFormClassificationSchema.safeParse({ ...input(), actorId: 'forged', googleAdsEligible: true }).success).toBe(false)
    expect(commercialFormClassificationSchema.safeParse({ ...input(), toFormKind: 'contact' }).success).toBe(false)
  })

  it('requires an actor before opening a transaction', async () => {
    expect(() => correctCommercialFormClassification(input(), '')).toThrow('actor_required')
    expect(transaction).not.toHaveBeenCalled()
  })
})
