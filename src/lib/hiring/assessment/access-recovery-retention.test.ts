import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))

import { applyAccessRecoveryPurge, planAccessRecoveryPurge } from './access-recovery-retention'

describe('TASK-1746 follow-up — la purga de auditoría de recuperación gana su puerta', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sin allowlist no purga NADA — la ausencia de entradas significa ninguna, nunca todas', async () => {
    const results = await applyAccessRecoveryPurge([], 'user-admin-1')

    expect(results).toEqual([])
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('exige un actor humano identificable: el borrado se audita con alguien detrás', async () => {
    await expect(
      applyAccessRecoveryPurge([{ applicationId: 'app-1', reason: 'consent_withdrawn' }], '   '),
    ).rejects.toThrow(/actor humano/i)

    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('purga de a una postulación y pasa motivo + actor a la función que revalida', async () => {
    mocks.query.mockResolvedValue([{ purged: 3 }])

    const results = await applyAccessRecoveryPurge(
      [{ applicationId: 'app-1', reason: 'consent_withdrawn' }],
      'user-admin-1',
    )

    expect(results).toEqual([{ applicationId: 'app-1', reason: 'consent_withdrawn', purgedRows: 3, error: null }])
    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining('purge_assessment_access_recovery'), [
      'app-1',
      'consent_withdrawn',
      'user-admin-1',
    ])
  })

  it('un rechazo de la función NO aborta el resto: cada postulación es una decisión independiente', async () => {
    // La función se niega, por ejemplo, si la persona fue seleccionada o tiene retención laboral. Frenar
    // todo el lote por una escondería las demás — y aquí esconder es exactamente el defecto que se arregla.
    mocks.query
      .mockRejectedValueOnce(new Error('workforce recovery audit uses workforce retention (TASK-1746)'))
      .mockResolvedValueOnce([{ purged: 2 }])

    const results = await applyAccessRecoveryPurge(
      [
        { applicationId: 'app-selected', reason: 'consent_withdrawn' },
        { applicationId: 'app-ok', reason: 'retention_expired' },
      ],
      'user-admin-1',
    )

    expect(results[0]).toMatchObject({ applicationId: 'app-selected', purgedRows: 0 })
    expect(results[0]?.error).toContain('workforce retention')
    expect(results[1]).toMatchObject({ applicationId: 'app-ok', purgedRows: 2, error: null })
  })

  it('el plan es read-only y separa los dos motivos', async () => {
    mocks.query.mockResolvedValue([
      { application_id: 'app-1', reason: 'consent_withdrawn', recovery_row_count: 2, retention_expires_at: null },
      { application_id: 'app-2', reason: 'retention_expired', recovery_row_count: 1, retention_expires_at: '2026-01-01' },
    ])

    const plan = await planAccessRecoveryPurge()

    expect(plan.consentWithdrawn).toHaveLength(1)
    expect(plan.retentionExpired).toHaveLength(1)
    expect(mocks.query.mock.calls[0]?.[0]).not.toMatch(/DELETE|UPDATE|INSERT/i)
  })
})
