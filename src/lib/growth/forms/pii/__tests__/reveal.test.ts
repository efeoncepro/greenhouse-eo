import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearSecretManagerResolutionCache } from '@/lib/secrets/secret-manager'

const getSubmissionById = vi.fn()
const getFormVersionById = vi.fn()
const publishOutboxEvent = vi.fn()
const fakeClientQuery = vi.fn()

vi.mock('../../store', () => ({
  getSubmissionById: (...a: unknown[]) => getSubmissionById(...a),
  getFormVersionById: (...a: unknown[]) => getFormVersionById(...a),
}))

vi.mock('@/lib/db', () => ({
  withTransaction: (cb: (client: unknown) => unknown) => cb({ query: fakeClientQuery }),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...a: unknown[]) => publishOutboxEvent(...a),
}))

import { encryptNationalId } from '../encryption'
import { PII_ENCRYPTION_KEY_ENV } from '../encryption'
import { revealSubmissionPiiField } from '../reveal'

const TEST_KEY = Buffer.from(new Uint8Array(32).fill(9)).toString('base64')

const fieldSchema = [
  { key: 'email', type: 'email', label: 'Correo' },
  { key: 'rut', type: 'national_id', validatorParams: { country: 'CL' } },
  { key: 'company', type: 'text' },
]

const baseSubmission = (overrides: Record<string, unknown> = {}) => ({
  submission_id: 'fsub-1',
  form_id: 'form-1',
  form_version_id: 'fv-1',
  normalized_fields_json: { email: 'juan@acme.com', company: 'ACME' },
  encrypted_fields_json: {},
  ...overrides,
})

const validReason = 'Contactar al lead para cotización aprobada'

describe('TASK-1255 — revealSubmissionPiiField (gobernado)', () => {
  beforeEach(() => {
    getSubmissionById.mockReset()
    getFormVersionById.mockReset()
    publishOutboxEvent.mockReset().mockResolvedValue('evt-1')
    fakeClientQuery.mockReset().mockResolvedValue({ rows: [{ audit_id: 'lpra-1' }] })
    getFormVersionById.mockResolvedValue({ field_schema_json: fieldSchema })
    clearSecretManagerResolutionCache()
    vi.stubEnv(PII_ENCRYPTION_KEY_ENV, TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    clearSecretManagerResolutionCache()
  })

  it('reveal de email en claro → valor + audit + outbox event', async () => {
    getSubmissionById.mockResolvedValue(baseSubmission())

    const result = await revealSubmissionPiiField({
      submissionId: 'fsub-1',
      fieldKey: 'email',
      actorUserId: 'user-1',
      reason: validReason,
    })

    expect(result.value).toBe('juan@acme.com')
    expect(result.piiClass).toBe('email')
    expect(result.auditId).toBe('lpra-1')
    expect(result.eventId).toBe('evt-1')
    expect(fakeClientQuery).toHaveBeenCalledOnce()
    expect(publishOutboxEvent).toHaveBeenCalledOnce()

    // El audit NUNCA lleva el valor crudo, sólo el campo + clase.
    const auditParams = fakeClientQuery.mock.calls[0]![1] as unknown[]

    expect(JSON.stringify(auditParams)).not.toContain('juan@acme.com')
  })

  it('reveal de national_id cifrado → descifra al valor original', async () => {
    const envelope = await encryptNationalId('111111111', 'CL')

    getSubmissionById.mockResolvedValue(baseSubmission({ encrypted_fields_json: { rut: envelope } }))

    const result = await revealSubmissionPiiField({
      submissionId: 'fsub-1',
      fieldKey: 'rut',
      actorUserId: 'user-1',
      reason: validReason,
    })

    expect(result.value).toBe('111111111')
    expect(result.piiClass).toBe('national_id')
  })

  it('reason < 10 chars → reason_required, sin tocar la DB', async () => {
    await expect(
      revealSubmissionPiiField({ submissionId: 'fsub-1', fieldKey: 'email', actorUserId: 'user-1', reason: 'corto' }),
    ).rejects.toMatchObject({ reason: 'reason_required' })

    expect(getSubmissionById).not.toHaveBeenCalled()
    expect(fakeClientQuery).not.toHaveBeenCalled()
  })

  it('campo no PII (non_pii) → field_not_revealable (no hay nada oculto)', async () => {
    getSubmissionById.mockResolvedValue(baseSubmission())

    await expect(
      revealSubmissionPiiField({ submissionId: 'fsub-1', fieldKey: 'company', actorUserId: 'user-1', reason: validReason }),
    ).rejects.toMatchObject({ reason: 'field_not_revealable' })

    expect(fakeClientQuery).not.toHaveBeenCalled()
  })

  it('campo inexistente en el schema → field_not_revealable', async () => {
    getSubmissionById.mockResolvedValue(baseSubmission())

    await expect(
      revealSubmissionPiiField({ submissionId: 'fsub-1', fieldKey: 'ghost', actorUserId: 'user-1', reason: validReason }),
    ).rejects.toMatchObject({ reason: 'field_not_revealable' })
  })

  it('submission inexistente → submission_not_found', async () => {
    getSubmissionById.mockResolvedValue(null)

    await expect(
      revealSubmissionPiiField({ submissionId: 'nope', fieldKey: 'email', actorUserId: 'user-1', reason: validReason }),
    ).rejects.toMatchObject({ reason: 'submission_not_found' })
  })
})
