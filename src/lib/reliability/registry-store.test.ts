import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const runQueryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => runQueryMock(...args)
}))

import { STATIC_RELIABILITY_REGISTRY } from './registry'
import {
  __resetRegistryStoreCacheForTesting,
  ensureReliabilityRegistrySeed,
  getReliabilityRegistry,
  setReliabilityModuleOverride
} from './registry-store'

const buildRegistryRows = () =>
  STATIC_RELIABILITY_REGISTRY.map(definition => ({
    module_key: definition.moduleKey,
    label: definition.label,
    description: definition.description,
    domain: definition.domain,
    routes: definition.routes,
    apis: definition.apis,
    dependencies: definition.dependencies,
    smoke_tests: definition.smokeTests,
    files_owned: definition.filesOwned,
    expected_signal_kinds: definition.expectedSignalKinds,
    slo_thresholds: definition.sloThresholds ?? {}
  }))

describe('registry-store', () => {
  beforeEach(() => {
    runQueryMock.mockReset()
    __resetRegistryStoreCacheForTesting()
  })

  afterEach(() => {
    __resetRegistryStoreCacheForTesting()
  })

  describe('getReliabilityRegistry without spaceId', () => {
    it('returns defaults from DB when seed has run', async () => {
      const rows = buildRegistryRows()

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO greenhouse_core.reliability_module_registry')) {
          return Promise.resolve([])
        }

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry()

      expect(result).toHaveLength(STATIC_RELIABILITY_REGISTRY.length)
      expect(result.map(m => m.moduleKey).sort()).toEqual(
        STATIC_RELIABILITY_REGISTRY.map(m => m.moduleKey).sort()
      )
    })

    it('caches defaults across calls (TTL 60s in-process)', async () => {
      const rows = buildRegistryRows()

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        return Promise.resolve([])
      })

      await getReliabilityRegistry()
      await getReliabilityRegistry()

      const selectCalls = runQueryMock.mock.calls.filter(
        ([q]) => typeof q === 'string' && q.includes('FROM greenhouse_core.reliability_module_registry')
      )

      expect(selectCalls).toHaveLength(1)
    })
  })

  describe('getReliabilityRegistry with spaceId (overrides applied)', () => {
    it('drops hidden modules from the tenant view', async () => {
      const rows = buildRegistryRows()

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        if (query.includes('FROM greenhouse_core.reliability_module_overrides')) {
          return Promise.resolve([
            {
              module_key: 'finance',
              hidden: true,
              extra_signal_kinds: [],
              slo_overrides: {}
            }
          ])
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry('space-123')

      expect(result.find(m => m.moduleKey === 'finance')).toBeUndefined()
      expect(result.length).toBe(STATIC_RELIABILITY_REGISTRY.length - 1)
    })

    it('merges extraSignalKinds into expectedSignalKinds without dup', async () => {
      const rows = buildRegistryRows()

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        if (query.includes('FROM greenhouse_core.reliability_module_overrides')) {
          return Promise.resolve([
            {
              module_key: 'finance',
              hidden: false,
              extra_signal_kinds: ['runtime', 'incident'], // 'incident' already in defaults
              slo_overrides: {}
            }
          ])
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry('space-123')
      const finance = result.find(m => m.moduleKey === 'finance')

      expect(finance).toBeDefined()
      expect(finance!.expectedSignalKinds).toContain('runtime')
      expect(finance!.expectedSignalKinds.filter(k => k === 'incident')).toHaveLength(1)
    })

    it('overlays sloOverrides on top of default sloThresholds', async () => {
      const rows = buildRegistryRows().map(row =>
        row.module_key === 'finance'
          ? { ...row, slo_thresholds: { freshness_max_lag_hours: 6 } }
          : row
      )

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        if (query.includes('FROM greenhouse_core.reliability_module_overrides')) {
          return Promise.resolve([
            {
              module_key: 'finance',
              hidden: false,
              extra_signal_kinds: [],
              slo_overrides: { freshness_max_lag_hours: 12, error_rate_max_percent: 1 }
            }
          ])
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry('space-123')
      const finance = result.find(m => m.moduleKey === 'finance')

      expect(finance?.sloThresholds).toMatchObject({
        freshness_max_lag_hours: 12,
        error_rate_max_percent: 1
      })
    })

    it('returns defaults when no overrides exist for the space', async () => {
      const rows = buildRegistryRows()

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        if (query.includes('FROM greenhouse_core.reliability_module_overrides')) {
          return Promise.resolve([])
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry('space-without-overrides')

      expect(result).toHaveLength(STATIC_RELIABILITY_REGISTRY.length)
    })
  })

  describe('fallback to STATIC_RELIABILITY_REGISTRY when DB fails', () => {
    it('returns static seed when seed insert throws', async () => {
      runQueryMock.mockRejectedValue(new Error('postgres unreachable'))

      const result = await getReliabilityRegistry()

      expect(result).toEqual(STATIC_RELIABILITY_REGISTRY)
    })

    it('returns static seed when defaults select throws', async () => {
      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.reject(new Error('select timeout'))
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry()

      expect(result).toEqual(STATIC_RELIABILITY_REGISTRY)
    })

    it('returns static seed when overrides select throws (with spaceId)', async () => {
      const rows = buildRegistryRows()

      runQueryMock.mockImplementation((query: string) => {
        if (query.startsWith('INSERT INTO')) return Promise.resolve([])

        if (query.includes('FROM greenhouse_core.reliability_module_registry')) {
          return Promise.resolve(rows)
        }

        if (query.includes('FROM greenhouse_core.reliability_module_overrides')) {
          return Promise.reject(new Error('overrides select failed'))
        }

        return Promise.resolve([])
      })

      const result = await getReliabilityRegistry('space-123')

      expect(result).toEqual(STATIC_RELIABILITY_REGISTRY)
    })
  })

  describe('ensureReliabilityRegistrySeed idempotency', () => {
    it('runs only once across concurrent calls (single promise pattern)', async () => {
      runQueryMock.mockResolvedValue([])

      await Promise.all([
        ensureReliabilityRegistrySeed(),
        ensureReliabilityRegistrySeed(),
        ensureReliabilityRegistrySeed()
      ])

      const insertCalls = runQueryMock.mock.calls.filter(
        ([q]) => typeof q === 'string' && q.startsWith('INSERT INTO greenhouse_core.reliability_module_registry')
      )

      // STATIC_RELIABILITY_REGISTRY rows × 1 (no triple seed)
      expect(insertCalls).toHaveLength(STATIC_RELIABILITY_REGISTRY.length)
    })
  })

  describe('setReliabilityModuleOverride', () => {
    it('upserts the override and invalidates cache for the space', async () => {
      runQueryMock.mockResolvedValue([])

      await setReliabilityModuleOverride({
        spaceId: 'space-123',
        moduleKey: 'finance',
        hidden: true
      })

      const insert = runQueryMock.mock.calls.find(
        ([q]) => typeof q === 'string' && q.startsWith('INSERT INTO greenhouse_core.reliability_module_overrides')
      )

      expect(insert).toBeDefined()
      expect(insert![1]).toEqual([
        expect.stringMatching(/^EO-RMO-/),
        'space-123',
        'finance',
        true,
        '[]',
        '{}'
      ])
    })
  })
})
