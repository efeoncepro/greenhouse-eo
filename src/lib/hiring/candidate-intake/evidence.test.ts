import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

import { buildCandidateIdentityInputDigest, persistCandidateIdentityIntakeEvidence } from './evidence'
import { normalizeCandidateIdentityInput } from './index'

// TASK-1736 Slice 2 — La capa `submitted` del ADR D1: evidencia application-scoped inmutable,
// idempotente por (application, identity, versión, digest). El trigger append-only vive en la
// migración; acá se prueba el contrato del writer.

describe('persistCandidateIdentityIntakeEvidence', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockQuery.mockResolvedValue([])
  })

  it('persiste el RAW exacto como evidencia + las representaciones derivadas versionadas', async () => {
    const intake = normalizeCandidateIdentityInput({ firstName: 'valentina', lastName: 'villa' })

    await persistCandidateIdentityIntakeEvidence({
      applicationId: 'happ-1',
      identityProfileId: 'prof-1',
      intake
    })

    expect(mockQuery).toHaveBeenCalledOnce()

    const [sql, params] = mockQuery.mock.calls[0]

    // Idempotencia: retry del mismo intake = no-op.
    expect(String(sql)).toContain('ON CONFLICT (application_id, identity_profile_id, normalization_version, input_digest) DO NOTHING')

    expect(params[0]).toBe('happ-1')
    expect(params[1]).toBe('prof-1')
    expect(params[2]).toBe('valentina villa') // submitted RAW — sin casing aplicado, jamás
    expect(params[3]).toBe('valentina villa') // display estructural
    expect(params[4]).toBe('degenerate_lower')
    expect(params[5]).toBe('Valentina Villa') // propuesta (NO aplicada acá)
    expect(params[6]).toBe('valentina villa') // search key
    expect(params[7]).toBe('v1')
    expect(params[8]).toBe('v1')
    expect(params[9]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('el digest es determinista por input raw y distingue inputs distintos', () => {
    const a = buildCandidateIdentityInputDigest({ firstName: 'valentina', lastName: 'villa' })
    const b = buildCandidateIdentityInputDigest({ firstName: 'valentina', lastName: 'villa' })
    const c = buildCandidateIdentityInputDigest({ firstName: 'Valentina', lastName: 'Villa' })

    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('la propuesta viaja NULL cuando la clasificación no es degenerada evidente', async () => {
    const intake = normalizeCandidateIdentityInput({ firstName: 'Ada', lastName: 'Lovelace' })

    await persistCandidateIdentityIntakeEvidence({ applicationId: 'happ-1', identityProfileId: 'prof-1', intake })

    const [, params] = mockQuery.mock.calls[0]

    expect(params[4]).toBe('well_formed')
    expect(params[5]).toBeNull()
  })
})
