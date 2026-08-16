import { describe, expect, it, vi } from 'vitest'

import { runTalentPoolReconcile } from './talent-pool-reconcile'

describe('runTalentPoolReconcile', () => {
  it('is a no-query no-op while the projection flag is off', async () => {
    const reconcile = vi.fn()

    await expect(runTalentPoolReconcile({ enabled: false, reconcile })).resolves.toEqual({
      status: 'skipped',
      reason: 'flag_off'
    })
    expect(reconcile).not.toHaveBeenCalled()
  })

  it('runs the canonical idempotent projection with the worker actor', async () => {
    const reconcile = vi.fn().mockResolvedValue({
      mode: 'apply',
      inventory: { total_facets: 52, active_process: 50, needs_reconsent: 2 },
      membershipsCreated: 0,
      evidenceUpserted: 360
    })

    await expect(runTalentPoolReconcile({ enabled: true, reconcile })).resolves.toMatchObject({
      status: 'reconciled',
      mode: 'apply',
      membershipsCreated: 0,
      evidenceUpserted: 360
    })
    expect(reconcile).toHaveBeenCalledWith({
      apply: true,
      actorUserId: 'ops-worker:talent-pool-reconcile'
    })
  })
})
