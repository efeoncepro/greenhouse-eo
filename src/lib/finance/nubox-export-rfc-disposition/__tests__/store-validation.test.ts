// TASK-990 Slice 4 — resolve disposition input guards (throw before any DB IO).

import { describe, expect, it } from 'vitest'

import {
  NuboxExportDispositionError,
  resolveNuboxExportRfcDisposition
} from '../store'

describe('resolveNuboxExportRfcDisposition input guards', () => {
  it('rejects a reason shorter than 10 chars', async () => {
    await expect(
      resolveNuboxExportRfcDisposition({
        dispositionId: 'd-1',
        action: 'dismiss',
        reason: 'corto',
        actorUserId: 'u-1'
      })
    ).rejects.toMatchObject({
      name: 'NuboxExportDispositionError',
      code: 'reason_too_short'
    })
  })

  it('rejects a link action without an organization', async () => {
    await expect(
      resolveNuboxExportRfcDisposition({
        dispositionId: 'd-1',
        action: 'link',
        organizationId: '',
        reason: 'razón suficientemente larga para pasar',
        actorUserId: 'u-1'
      })
    ).rejects.toMatchObject({
      name: 'NuboxExportDispositionError',
      code: 'organization_required'
    })
  })

  it('exposes a typed error class', () => {
    const err = new NuboxExportDispositionError('x', 'disposition_not_found')

    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('disposition_not_found')
  })
})
