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

  it('edge 401 (200+espacio+200): trunca defensivamente a 400 ANTES del INSERT (A4 — CHECK 400)', async () => {
    // El parser acota first/last a 200 c/u; el fullName concatenado llega a 401 y violaría el
    // CHECK `length BETWEEN 1 AND 400` — el error PG llevaría el nombre en DETAIL hacia Sentry.
    const firstName = 'a'.repeat(200)
    const lastName = 'b'.repeat(200)
    const intake = normalizeCandidateIdentityInput({ firstName, lastName })

    expect(intake.submitted.fullName).toHaveLength(401)

    await persistCandidateIdentityIntakeEvidence({ applicationId: 'happ-1', identityProfileId: 'prof-1', intake })

    const [, params] = mockQuery.mock.calls[0]

    // submitted / estructural / propuesta viajan capadas a 400 (el raw completo ya viene acotado
    // por el parser; acá solo se garantiza que el INSERT jamás revienta el CHECK).
    expect((params[2] as string).length).toBe(400)
    expect((params[3] as string).length).toBeLessThanOrEqual(400)
    expect(params[5] === null || (params[5] as string).length <= 400).toBe(true)

    // El digest sigue siendo del input RAW completo (idempotencia estable, no del truncado).
    expect(params[9]).toBe(buildCandidateIdentityInputDigest({ firstName, lastName }))
  })

  it('la propuesta viaja NULL cuando la clasificación no es degenerada evidente', async () => {
    const intake = normalizeCandidateIdentityInput({ firstName: 'Ada', lastName: 'Lovelace' })

    await persistCandidateIdentityIntakeEvidence({ applicationId: 'happ-1', identityProfileId: 'prof-1', intake })

    const [, params] = mockQuery.mock.calls[0]

    expect(params[4]).toBe('well_formed')
    expect(params[5]).toBeNull()
  })
})
