import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

import { readProjectionRuntimeHealth } from './projection-runtime-health'

describe('projection-runtime-health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns not_declared when the projection does not publish runtime privilege requirements', async () => {
    const result = await readProjectionRuntimeHealth({
      name: 'projection_without_contract',
      description: 'No runtime contract',
      domain: 'finance',
      triggerEvents: [],
      extractScope: () => null,
      refresh: async () => null
    })

    expect(result.status).toBe('not_declared')
    expect(result.checks).toEqual([])
  })

  it('marks a projection as degraded when required table privileges are missing', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        current_user_name: 'greenhouse_app',
        table_name: 'greenhouse_serving.service_attribution_facts',
        required_privileges: ['SELECT', 'INSERT', 'DELETE'],
        missing_privileges: ['DELETE']
      }
    ])

    const result = await readProjectionRuntimeHealth({
      name: 'service_attribution',
      description: 'test',
      domain: 'cost_intelligence',
      triggerEvents: [],
      extractScope: () => null,
      refresh: async () => null,
      requiredTablePrivileges: [
        {
          tableName: 'greenhouse_serving.service_attribution_facts',
          privileges: ['SELECT', 'INSERT', 'DELETE'],
          reason: 'Projection-owned serving cache.'
        }
      ]
    })

    expect(result.status).toBe('degraded')
    expect(result.currentUser).toBe('greenhouse_app')
    expect(result.checks).toEqual([
      {
        tableName: 'greenhouse_serving.service_attribution_facts',
        requiredPrivileges: ['SELECT', 'INSERT', 'DELETE'],
        missingPrivileges: ['DELETE'],
        healthy: false,
        reason: 'Projection-owned serving cache.'
      }
    ])
  })
})
