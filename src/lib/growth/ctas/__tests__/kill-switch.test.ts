import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1428 — kill switch (arch §16.3): estado vigente = último evento por scope,
 * engage/release idempotente-observable (retry no infla el audit), validación de
 * input y outbox in-tx.
 */

const dbMock = vi.hoisted(() => ({
  query: vi.fn(),
  clientQuery: vi.fn(),
}))

const outboxMock = vi.hoisted(() => ({ publishOutboxEvent: vi.fn() }))

vi.mock('@/lib/db', () => ({
  query: dbMock.query,
  withTransaction: async (fn: (client: { query: typeof dbMock.clientQuery }) => Promise<unknown>) =>
    fn({ query: dbMock.clientQuery }),
}))

vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: outboxMock.publishOutboxEvent }))

import { getKillSwitchState, setCtaKillSwitch } from '../kill-switch'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getKillSwitchState', () => {
  it('tabla vacía → todo activo (steady state)', async () => {
    dbMock.query.mockResolvedValue([])

    expect(await getKillSwitchState()).toEqual({ globalKilled: false, killedSurfaceIds: [] })
  })

  it('último evento por scope decide: engage global + surface released', async () => {
    dbMock.query.mockResolvedValue([
      { scope: 'global', surface_id: null, action: 'engage' },
      { scope: 'surface', surface_id: 'csur-1', action: 'release' },
      { scope: 'surface', surface_id: 'csur-2', action: 'engage' },
    ])

    expect(await getKillSwitchState()).toEqual({ globalKilled: true, killedSurfaceIds: ['csur-2'] })
  })
})

describe('setCtaKillSwitch', () => {
  it('reason corto o scope/surface inconsistente → invalid_input (sin tocar la DB)', async () => {
    expect(await setCtaKillSwitch({ scope: 'global', action: 'engage', reason: 'x' })).toEqual({
      ok: false,
      reason: 'invalid_input',
    })

    expect(
      await setCtaKillSwitch({ scope: 'surface', action: 'engage', reason: 'incidente demo' }),
    ).toEqual({ ok: false, reason: 'invalid_input' })

    expect(
      await setCtaKillSwitch({ scope: 'global', surfaceId: 'csur-1', action: 'engage', reason: 'incidente demo' }),
    ).toEqual({ ok: false, reason: 'invalid_input' })

    expect(dbMock.clientQuery).not.toHaveBeenCalled()
  })

  it('engage global nuevo → INSERT append-only + outbox in-tx', async () => {
    dbMock.clientQuery
      .mockResolvedValueOnce({ rows: [] }) // estado vigente (ninguno)
      .mockResolvedValueOnce({ rows: [{ kill_event_id: 'cksw-1' }] }) // insert

    const result = await setCtaKillSwitch({
      scope: 'global',
      action: 'engage',
      reason: 'incidente de accesibilidad en el host',
      actorRef: 'user-1',
    })

    expect(result).toEqual({ ok: true, killEventId: 'cksw-1', changed: true })

    expect(outboxMock.publishOutboxEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'growth.cta.kill_switch_changed',
        aggregateId: 'global',
        payload: expect.objectContaining({ scope: 'global', action: 'engage', actorRef: 'user-1' }),
      }),
      expect.anything(),
    )
  })

  it('engage cuando ya está engaged → changed=false SIN evento duplicado ni outbox', async () => {
    dbMock.clientQuery.mockResolvedValueOnce({ rows: [{ action: 'engage', kill_event_id: 'cksw-1' }] })

    const result = await setCtaKillSwitch({
      scope: 'global',
      action: 'engage',
      reason: 'retry del operador',
    })

    expect(result).toEqual({ ok: true, killEventId: 'cksw-1', changed: false })
    expect(outboxMock.publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('scope surface con surface inexistente → surface_not_found', async () => {
    dbMock.clientQuery.mockResolvedValueOnce({ rows: [] }) // lookup de surface

    const result = await setCtaKillSwitch({
      scope: 'surface',
      surfaceId: 'csur-nope',
      action: 'engage',
      reason: 'apagar surface rota',
    })

    expect(result).toEqual({ ok: false, reason: 'surface_not_found' })
  })
})
