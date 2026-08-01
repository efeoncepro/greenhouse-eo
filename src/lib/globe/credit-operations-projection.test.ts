import { describe, expect, it, vi } from 'vitest'

import { readGlobeCreditOperationsProjection } from './credit-operations-projection'

const workspaceId = 'greenhouse-org:efeonce'
const at = '2026-08-01T12:00:00.000Z'

describe('Globe credit operations projection', () => {
  it('keeps sections independent and marks a failed reader partial', async () => {
    const dispatch = vi.fn(async (reader: string) => {
      if (reader.endsWith('forecast.get')) throw new Error('unavailable')
      if (reader.endsWith('pool.list'))
        return [
          {
            schemaVersion: '1',
            poolId: 'pool-1',
            workspaceId,
            name: 'August',
            status: 'active',
            priority: 1,
            periodStart: at,
            periodEnd: '2026-09-01T00:00:00.000Z'
          }
        ]

      return []
    })

    const result = await readGlobeCreditOperationsProjection({ globeWorkspaceId: workspaceId }, { dispatch })

    expect(result.pools).toHaveLength(1)
    expect(result.forecast).toBeNull()
    expect(result.unavailable).toEqual(['forecast'])
  })

  it('rejects cross-workspace data instead of leaking it into the workbench', async () => {
    const dispatch = vi.fn(async (reader: string) =>
      reader.endsWith('pool.list')
        ? [
            {
              schemaVersion: '1',
              poolId: 'pool-1',
              workspaceId: 'other',
              name: 'Other',
              status: 'active',
              priority: 1,
              periodStart: at,
              periodEnd: '2026-09-01T00:00:00.000Z'
            }
          ]
        : []
    )

    const result = await readGlobeCreditOperationsProjection({ globeWorkspaceId: workspaceId }, { dispatch })

    expect(result.pools).toEqual([])
    expect(result.unavailable).toContain('pools')
  })
})
