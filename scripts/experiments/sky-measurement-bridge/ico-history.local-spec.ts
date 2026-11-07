import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as IcoShared from '@/lib/ico-engine/shared'
import type * as IcoSchema from '@/lib/ico-engine/schema'

// Executes real ICO orchestration, with a mocked SQL port. No BigQuery engine,
// SQL semantics, data mutation, cloud infrastructure or full monthly run is tested.
const port = vi.hoisted(() => ({ query: vi.fn(), infrastructure: vi.fn() }))

vi.mock('@/lib/ico-engine/shared', async importOriginal => ({
  ...await importOriginal<typeof IcoShared>(),
  runIcoEngineQuery: port.query, getIcoEngineProjectId: () => 'synthetic-local'
}))
vi.mock('@/lib/ico-engine/schema', async importOriginal => ({
  ...await importOriginal<typeof IcoSchema>(), ensureIcoEngineInfrastructure: port.infrastructure
}))

import { freezeDeliveryTaskMonthlySnapshot, materializeMonthlySnapshots } from '@/lib/ico-engine/materialize'

beforeEach(() => { port.query.mockReset(); port.infrastructure.mockReset() })

describe('real ICO call ordering at mocked SQL port (not BigQuery execution)', () => {
  it('ordinary monthly path reuses locked task snapshot before downstream metrics refresh', async () => {
    port.query.mockImplementation(async (sql: string) => {
      if (sql.includes("snapshot_status = 'locked'")) return [{ cnt: 2 }]
      if (sql.includes('DELETE FROM') && sql.includes('metric_snapshots_monthly')) throw new Error('bounded-stop-before-metrics')
      throw new Error(`Unexpected SQL in bounded test: ${sql.slice(0, 80)}`)
    })
    await expect(materializeMonthlySnapshots(2026, 10)).rejects.toThrow('bounded-stop-before-metrics')
    expect(port.query).toHaveBeenCalledTimes(2)
    expect(port.query.mock.calls.some(([sql]) => /DELETE FROM|INSERT INTO/.test(sql) && sql.includes('delivery_task_monthly_snapshots'))).toBe(false)
  })

  it('explicit freeze forces DELETE then INSERT even if task snapshot was already locked', async () => {
    port.query.mockResolvedValue([{ cnt: 2 }])
    const result = await freezeDeliveryTaskMonthlySnapshot(2026, 10)
    const calls = port.query.mock.calls.map(([sql]) => sql as string)

    expect(result).toEqual({ rowsWritten: 2, snapshotStatus: 'locked', reusedLockedSnapshot: false })
    expect(calls).toHaveLength(4)
    expect(calls[1]).toContain('DELETE FROM')
    expect(calls[2]).toContain('INSERT INTO')
    expect(calls[1]).not.toMatch(/space_id\s*=/)
    expect(port.query.mock.calls.every(([, parameters]) => parameters.periodYear === 2026 && parameters.periodMonth === 10)).toBe(true)
  })

  it('failed freeze INSERT propagates after a separate DELETE call, without a restore call', async () => {
    port.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO')) throw new Error('synthetic-insert-failure')

      return [{ cnt: 2 }]
    })
    await expect(freezeDeliveryTaskMonthlySnapshot(2026, 10)).rejects.toThrow('synthetic-insert-failure')
    expect(port.query).toHaveBeenCalledTimes(3)
    expect(port.query.mock.calls[1][0]).toContain('DELETE FROM')
    expect(port.query.mock.calls[2][0]).toContain('INSERT INTO')
  })
})
