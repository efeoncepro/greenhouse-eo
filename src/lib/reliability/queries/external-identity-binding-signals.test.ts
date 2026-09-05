import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

const captureMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureMock(...args)
}))

const {
  EXTERNAL_IDENTITY_BINDING_SIGNAL_READERS,
  EXTERNAL_BINDING_ORPHAN_GRANT_SIGNAL_ID,
  EXTERNAL_BINDING_REVOKED_STILL_DISPATCHING_SIGNAL_ID,
  EXTERNAL_BINDING_SUBJECT_COLLISION_SIGNAL_ID,
  EXTERNAL_BINDING_UNBOUND_DISPATCH_ATTEMPT_SIGNAL_ID,
  getExternalBindingOrphanGrantSignal,
  getExternalBindingMixedPopulationSignal,
  getExternalBindingUnauditedWriteSignal,
  getExternalBindingRevokedStillDispatchingSignal,
  getExternalBindingSubjectCollisionSignal,
  getExternalBindingUnboundDispatchAttemptSignal,
  getExternalIdentityBindingSignals
} = await import('./external-identity-binding-signals')

/**
 * Estas pruebas verifican el CONTRATO de cada señal (id, módulo, kind, umbrales, degradación a
 * `unknown`) con `query` mockeado. No afirman el texto del SQL: el verificador real de las consultas
 * es el smoke live `pnpm identity:external-access:smoke` (lecturas + las 4 señales contra PG real) y,
 * con `--apply`, el ciclo bind → grant → invite → accept → resolve → revoke que alimenta el
 * resolution log. Mixed population y unaudited_write ejecutan SQL conductual en el archivo
 * external-identity-binding-signals.live.test.ts, con tablas TEMP y rollback.
 */
describe('TASK-1631 — external identity binding reliability signals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('declares the six canonical signal ids exactly once and each reader returns its own id', async () => {
    const ids = EXTERNAL_IDENTITY_BINDING_SIGNAL_READERS.map(reader => reader.signalId)

    expect(new Set(ids).size).toBe(6)
    expect(ids).toEqual([
      'identity.external_binding.unbound_dispatch_attempt',
      'identity.external_binding.revoked_still_dispatching',
      'identity.external_binding.subject_collision',
      'identity.external_binding.orphan_grant',
      'identity.external_binding.unaudited_write',
      'identity.external_binding.mixed_population'
    ])

    queryMock.mockResolvedValue([{ n: '0' }])

    for (const reader of EXTERNAL_IDENTITY_BINDING_SIGNAL_READERS) {
      const signal = await reader.read()

      expect(signal.signalId).toBe(reader.signalId)
      expect(signal.moduleKey).toBe('identity')
      expect(signal.severity).toBe('ok')
    }
  })

  it('unbound_dispatch_attempt reads only denial outcomes from the resolution log (steady 0)', async () => {
    queryMock.mockResolvedValueOnce([{ n: '3' }])

    const signal = await getExternalBindingUnboundDispatchAttemptSignal()

    expect(signal.signalId).toBe(EXTERNAL_BINDING_UNBOUND_DISPATCH_ATTEMPT_SIGNAL_ID)
    expect(signal.kind).toBe('incident')
    expect(signal.severity).toBe('warning')
    expect(signal.evidence).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'unbound_count', value: '3' })])
    )
  })

  it('unbound_dispatch_attempt escalates to error at 20 denials', async () => {
    queryMock.mockResolvedValueOnce([{ n: '20' }])

    const signal = await getExternalBindingUnboundDispatchAttemptSignal()

    expect(signal.severity).toBe('error')
  })

  it('revoked_still_dispatching only counts attempts after the 5-minute grace window', async () => {
    queryMock.mockResolvedValueOnce([{ n: '1' }])

    const signal = await getExternalBindingRevokedStillDispatchingSignal()

    expect(signal.signalId).toBe(EXTERNAL_BINDING_REVOKED_STILL_DISPATCHING_SIGNAL_ID)
    expect(signal.severity).toBe('warning')
    expect(queryMock.mock.calls[0]?.[1]).toEqual(['24', '5'])
  })

  it('subject_collision is an error on the first collision (subject→N profiles or profile→N subjects)', async () => {
    queryMock.mockResolvedValueOnce([{ n: '1' }])

    const signal = await getExternalBindingSubjectCollisionSignal()

    expect(signal.signalId).toBe(EXTERNAL_BINDING_SUBJECT_COLLISION_SIGNAL_ID)
    expect(signal.kind).toBe('data_quality')
    expect(signal.severity).toBe('error')
  })

  it('orphan_grant is an error on the first active grant without an active binding/environment', async () => {
    queryMock.mockResolvedValueOnce([{ n: '2' }])

    const signal = await getExternalBindingOrphanGrantSignal()

    expect(signal.signalId).toBe(EXTERNAL_BINDING_ORPHAN_GRANT_SIGNAL_ID)
    expect(signal.kind).toBe('drift')
    expect(signal.severity).toBe('error')
  })

  it('degrades to unknown (never ok) when PostgreSQL fails, and captures under identity', async () => {
    queryMock.mockRejectedValueOnce(new Error('connection refused'))

    const signal = await getExternalBindingOrphanGrantSignal()

    expect(signal.severity).toBe('unknown')
    expect(captureMock).toHaveBeenCalledWith(expect.any(Error), 'identity', expect.anything())
  })

  it('unaudited writes are an error on the first row and unknown when PG fails', async () => {
    queryMock.mockResolvedValueOnce([{ n: '1' }])
    expect(await getExternalBindingUnauditedWriteSignal()).toMatchObject({
      severity: 'error',
      signalId: 'identity.external_binding.unaudited_write'
    })
    queryMock.mockRejectedValueOnce(new Error('connection refused'))
    expect(await getExternalBindingUnauditedWriteSignal()).toMatchObject({ severity: 'unknown' })
  })

  it('mixed population is an error on the first binding and unknown when PG fails', async () => {
    queryMock.mockResolvedValueOnce([{ n: '1' }])
    expect(await getExternalBindingMixedPopulationSignal()).toMatchObject({
      severity: 'error',
      kind: 'data_quality',
      signalId: 'identity.external_binding.mixed_population',
      evidence: expect.arrayContaining([expect.objectContaining({ label: 'mixed_population_count', value: '1' })])
    })
    queryMock.mockRejectedValueOnce(new Error('connection refused'))
    expect(await getExternalBindingMixedPopulationSignal()).toMatchObject({ severity: 'unknown' })
  })

  it('group reader returns every signal and drops only readers that throw outside their own guard', async () => {
    queryMock.mockResolvedValue([{ n: '0' }])

    const signals = await getExternalIdentityBindingSignals()

    expect(signals.map(signal => signal.signalId)).toEqual(
      EXTERNAL_IDENTITY_BINDING_SIGNAL_READERS.map(r => r.signalId)
    )
  })
})
