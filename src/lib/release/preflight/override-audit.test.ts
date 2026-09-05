import { describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({ query: vi.fn(), txQuery: vi.fn(), transaction: vi.fn(), outbox: vi.fn() }))

vi.mock('@/lib/db', () => ({ query: db.query, withTransaction: db.transaction }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: db.outbox }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { recordReleaseStarted } from '../manifest-store'
import { buildPreflightOverrideAudit, readPreflightOverrideAudit } from './override-audit'

const reason = 'Release repair approved with explicit exception and retained audit.'

describe('declared preflight exception audit', () => {
  it.each([
    [true, false],
    [false, true],
    [true, true]
  ])('requires a trimmed reason for flags %s/%s', (overrideBatchPolicy, bypassWarnings) => {
    for (const value of [undefined, '', 'short', ' '.repeat(30)]) {
      expect(() =>
        buildPreflightOverrideAudit({ overrideBatchPolicy, bypassWarnings, reason: value, actor: 'workflow-login' })
      ).toThrow(/at least 20/)
    }

    expect(
      buildPreflightOverrideAudit({
        overrideBatchPolicy,
        bypassWarnings,
        reason: `  ${reason}  `,
        actor: 'workflow-login'
      })
    ).toEqual({ reason, actor: 'workflow-login', overrideBatchPolicy, bypassWarnings })
  })

  it('leaves ordinary preflights unchanged and rejects malformed artifact overrides', () => {
    expect(
      buildPreflightOverrideAudit({ overrideBatchPolicy: false, bypassWarnings: false, actor: null })
    ).toBeUndefined()
    expect(readPreflightOverrideAudit(undefined)).toBeUndefined()

    for (const value of [
      null,
      {},
      { reason, overrideBatchPolicy: 'true', bypassWarnings: false, actor: 'login' },
      { reason, overrideBatchPolicy: false, bypassWarnings: false, actor: 'login' }
    ]) {
      expect(() => readPreflightOverrideAudit(value)).toThrow()
    }
  })

  it('persists the validated artifact reason and flags in manifest, transition audit and outbox together', async () => {
    db.query.mockResolvedValue([{ max_attempt: 0 }])
    db.txQuery.mockResolvedValue({ rows: [{}] })
    db.transaction.mockImplementation(async callback => callback({ query: db.txQuery }))

    const override = buildPreflightOverrideAudit({
      overrideBatchPolicy: true,
      bypassWarnings: true,
      reason,
      actor: 'workflow-login'
    })

    const artifact = JSON.parse(JSON.stringify({ targetSha: 'a'.repeat(40), override }))

    await recordReleaseStarted({ targetSha: 'a'.repeat(40), triggeredBy: 'workflow-login', preflightResult: artifact })

    expect(db.transaction).toHaveBeenCalledOnce()
    expect(db.txQuery).toHaveBeenCalledTimes(2)
    const manifestPayload = JSON.parse(db.txQuery.mock.calls[0][1][8])
    const transitionMetadata = JSON.parse(db.txQuery.mock.calls[1][1][5])

    expect(manifestPayload.override).toEqual(override)
    expect(transitionMetadata.override).toEqual(override)
    expect(db.outbox.mock.calls[0][0].payload.preflightResult.override).toEqual(override)
    expect(transitionMetadata.override).not.toHaveProperty('capabilityVerified')
  })

  it('rejects invalid persisted evidence before entering the transaction', async () => {
    db.transaction.mockClear()
    await expect(
      recordReleaseStarted({
        targetSha: 'a'.repeat(40),
        triggeredBy: 'login',
        preflightResult: {
          override: { reason: 'short', actor: 'login', overrideBatchPolicy: true, bypassWarnings: false }
        }
      })
    ).rejects.toThrow(/at least 20/)
    expect(db.transaction).not.toHaveBeenCalled()
  })
})
