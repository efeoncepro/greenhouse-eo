import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EncryptedFieldEnvelope } from '../types'

const getSubmissionById = vi.fn()
const getFormVersionById = vi.fn()

vi.mock('../../store', () => ({
  getSubmissionById: (...args: unknown[]) => getSubmissionById(...args),
  getFormVersionById: (...args: unknown[]) => getFormVersionById(...args),
}))

import { getSubmissionLeadMasked } from '../masked-reader'

const fieldSchema = [
  { key: 'email', type: 'email', label: 'Correo', required: true },
  { key: 'phone', type: 'tel', label: 'Teléfono', validatorParams: { country: 'CL' } },
  { key: 'rut', type: 'national_id', label: 'RUT', validatorParams: { country: 'CL' } },
  { key: 'company', type: 'text', label: 'Empresa' },
]

const envelope: EncryptedFieldEnvelope = {
  v: 1,
  alg: 'aes-256-gcm',
  ciphertext: 'Y2lwaGVy',
  iv: 'aXZpdml2aXZpdml2',
  tag: 'dGFndGFndGFndGFndGFndGE=',
  mask: 'xx.xxx.111-1',
  country: 'CL',
}

describe('TASK-1255 — getSubmissionLeadMasked (masked por default)', () => {
  beforeEach(() => {
    getSubmissionById.mockReset()
    getFormVersionById.mockReset()
  })

  it('enmascara email/phone en claro y usa el mask precomputado del envelope cifrado', async () => {
    getSubmissionById.mockResolvedValue({
      submission_id: 'fsub-1',
      form_id: 'form-1',
      form_version_id: 'fv-1',
      normalized_fields_json: { email: 'juan@acme.com', phone: '+56912345678', company: 'ACME' },
      encrypted_fields_json: { rut: envelope },
      created_at: new Date('2026-06-26T00:00:00Z'),
    })
    getFormVersionById.mockResolvedValue({ field_schema_json: fieldSchema })

    const view = await getSubmissionLeadMasked('fsub-1')

    expect(view).not.toBeNull()
    const byKey = Object.fromEntries(view!.fields.map(f => [f.key, f]))

    expect(byKey.email.maskedValue).toBe('j***@acme.com')
    expect(byKey.email.isRevealable).toBe(true)
    expect(byKey.email.isEncrypted).toBe(false)

    expect(byKey.phone.maskedValue).toBe('+********678')

    // national_id cifrado: usa el mask del envelope, isEncrypted true (no se descifró).
    expect(byKey.rut.maskedValue).toBe('xx.xxx.111-1')
    expect(byKey.rut.isEncrypted).toBe(true)
    expect(byKey.rut.isRevealable).toBe(true)

    // non_pii: valor en claro, no revelable.
    expect(byKey.company.maskedValue).toBe('ACME')
    expect(byKey.company.isRevealable).toBe(false)
  })

  it('legacy/flag-OFF: national_id en claro en el blob → lo enmascara en lectura', async () => {
    getSubmissionById.mockResolvedValue({
      submission_id: 'fsub-2',
      form_id: 'form-1',
      form_version_id: 'fv-1',
      normalized_fields_json: { rut: '111111111' },
      encrypted_fields_json: {},
      created_at: new Date('2026-06-26T00:00:00Z'),
    })
    getFormVersionById.mockResolvedValue({ field_schema_json: fieldSchema })

    const view = await getSubmissionLeadMasked('fsub-2')
    const rut = view!.fields.find(f => f.key === 'rut')!

    expect(rut.maskedValue).toBe('xx.xxx.111-1')
    expect(rut.isEncrypted).toBe(false)
    // NUNCA expone la cédula completa.
    expect(rut.maskedValue).not.toContain('11111111')
  })

  it('submission inexistente → null', async () => {
    getSubmissionById.mockResolvedValue(null)
    expect(await getSubmissionLeadMasked('nope')).toBeNull()
  })

  it('field_schema_json no parseable → shell sin campos (degradación honesta, sin valores crudos)', async () => {
    getSubmissionById.mockResolvedValue({
      submission_id: 'fsub-3',
      form_id: 'form-1',
      form_version_id: 'fv-1',
      normalized_fields_json: { email: 'x@y.com' },
      encrypted_fields_json: {},
      created_at: new Date('2026-06-26T00:00:00Z'),
    })
    getFormVersionById.mockResolvedValue({ field_schema_json: 'corrupto' })

    const view = await getSubmissionLeadMasked('fsub-3')

    expect(view!.fields).toEqual([])
  })
})
