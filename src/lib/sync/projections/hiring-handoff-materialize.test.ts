import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const materializeMock = vi.fn()

vi.mock('@/lib/hiring/handoff', () => ({
  materializeHandoffFromApplication: (...args: unknown[]) => materializeMock(...args),
}))

const { hiringHandoffMaterializeProjection } = await import('./hiring-handoff-materialize')

describe('hiringHandoffMaterializeProjection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('se dispara SOLO con hiring.application.decided (nunca stage_changed) en domain people', () => {
    expect(hiringHandoffMaterializeProjection.triggerEvents).toEqual(['hiring.application.decided'])
    expect(hiringHandoffMaterializeProjection.domain).toBe('people')
    expect(hiringHandoffMaterializeProjection.name).toBe('hiring_handoff_materialize')
  })

  it('extractScope retorna scope no-null para el payload canónico de decide.ts', () => {
    const scope = hiringHandoffMaterializeProjection.extractScope({
      applicationId: 'app-1',
      decisionId: 'dec-1',
      decision: 'selected',
      selectedDestination: 'internal_hire',
    })

    expect(scope).toEqual({ entityType: 'hiring_application', entityId: 'app-1' })
  })

  it('extractScope retorna null (→ no-op:no-scope observable) para payload malformado', () => {
    expect(hiringHandoffMaterializeProjection.extractScope({})).toBeNull()
    expect(hiringHandoffMaterializeProjection.extractScope({ applicationId: '   ' })).toBeNull()
  })

  it('refresh materializa desde el scope (snapshot actual), no desde el payload', async () => {
    materializeMock.mockResolvedValue({
      kind: 'created',
      handoff: { state: 'pending', selectedDestination: 'internal_hire' },
    })

    // El payload representativo trae una decisión VIEJA (coalescing) — el refresh no la usa.
    const result = await hiringHandoffMaterializeProjection.refresh(
      { entityType: 'hiring_application', entityId: 'app-1' },
      { applicationId: 'app-1', decision: 'rejected', _eventType: 'hiring.application.decided' },
    )

    expect(materializeMock).toHaveBeenCalledWith('app-1')
    expect(result).toContain('handoff created (pending)')
  })

  it('refresh acusa no-op explícito para decisiones no-selected', async () => {
    materializeMock.mockResolvedValue({ kind: 'noop', reason: 'decision-not-selected' })

    const result = await hiringHandoffMaterializeProjection.refresh(
      { entityType: 'hiring_application', entityId: 'app-1' },
      {},
    )

    expect(result).toBe('no-op:decision-not-selected')
  })

  it('refresh propaga el throw del materializer (retry/dead-letter, nunca silent-skip)', async () => {
    materializeMock.mockRejectedValue(new Error('precondición rota'))

    await expect(
      hiringHandoffMaterializeProjection.refresh({ entityType: 'hiring_application', entityId: 'app-1' }, {}),
    ).rejects.toThrow('precondición rota')
  })
})
