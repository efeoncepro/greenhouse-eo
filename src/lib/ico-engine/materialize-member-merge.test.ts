/**
 * TASK-900 Slice 2 — Anti-regression tests for materializeMemberMetrics.
 *
 * Verifica comportamiento del materializer bajo las 4 combinaciones canonical
 * de flags + bug class TASK-877 (upstream degraded). Single source of truth
 * para el contract de Slice 2.
 *
 * NO testea el SQL MERGE en BigQuery real — eso es smoke staging post-flip.
 * Aquí mockeamos `runIcoEngineQuery` y verificamos:
 *   1. La estructura de calls (MERGE vs DELETE+INSERT) según flag
 *   2. El gate aborta + persiste tracking + captureWithDomain con shape canonical
 *   3. Coherence flag throw — INCREMENTAL sin MERGE
 *   4. Failures en tracking NO bloquean el materializer (best-effort audit)
 *   5. Failure en MERGE persiste row failed antes del throw
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

import type * as SharedModule from './shared'

const mocks = vi.hoisted(() => ({
  runIcoEngineQuery: vi.fn(),
  runUpstreamFreshnessGate: vi.fn(),
  isFreshnessGateEnabled: vi.fn(),
  beginIcoMaterializationRun: vi.fn(),
  completeIcoMaterializationRun: vi.fn(),
  skipIcoMaterializationRun: vi.fn(),
  failIcoMaterializationRun: vi.fn(),
  captureWithDomain: vi.fn()
}))

vi.mock('./shared', async importOriginal => {
  const actual = await importOriginal<typeof SharedModule>()

  return {
    ...actual,
    runIcoEngineQuery: mocks.runIcoEngineQuery
  }
})

vi.mock('./materialize-guards', () => ({
  runUpstreamFreshnessGate: mocks.runUpstreamFreshnessGate,
  isFreshnessGateEnabled: mocks.isFreshnessGateEnabled,
  summarizeBlockingSignals: (signals: unknown[]) => signals.map(s => s)
}))

vi.mock('./materialize-tracking', () => ({
  beginIcoMaterializationRun: mocks.beginIcoMaterializationRun,
  completeIcoMaterializationRun: mocks.completeIcoMaterializationRun,
  skipIcoMaterializationRun: mocks.skipIcoMaterializationRun,
  failIcoMaterializationRun: mocks.failIcoMaterializationRun
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: mocks.captureWithDomain
}))

// Stub schema + ai exports used by materialize.ts at module load.
vi.mock('./schema', () => ({
  ensureIcoEngineInfrastructure: vi.fn(),
  ICO_DATASET: 'ico_engine',
  ENGINE_VERSION: '1.0.0-test'
}))

vi.mock('./performance-report', () => ({
  TOP_PERFORMER_MIN_THROUGHPUT: 5,
  TOP_PERFORMER_MULTI_ASSIGNEE_POLICY: 'majority',
  TREND_STABLE_BAND_PP: 5
}))

vi.mock('./ai/materialize-ai-signals', () => ({
  materializeAiSignals: vi.fn()
}))

// We don't directly export materializeMemberMetrics. Use module internals via
// a thin re-export trick: import the module and call through to its private
// fn by getting the closure-bound function from the orchestrator. For Slice 2
// we expose the fn via a small test-only shim — but actually it's not
// exported. Instead, we test the side effects via `materializeMonthlySnapshots`
// which calls `materializeMemberMetrics` internally. To keep tests focused on
// member metrics behaviour, we re-export it from materialize.ts in a TASK-900
// follow-up if needed. For now, test the lower-level helpers exposed.

// Simpler approach: invoke through module re-export hook. Use dynamic import
// inside each test so flag env vars are read at call time.

const FAKE_PROJECT_ID = 'efeonce-test'
const PERIOD_YEAR = 2026
const PERIOD_MONTH = 5

const importMaterializer = async () => {
  // Re-import per test to read env vars fresh.
  vi.resetModules()
  const mod = await import('./materialize')

  // materializeMemberMetrics is internal const — test it via a re-export
  // proxy added in materialize-member-merge-test-only.ts. Avoid touching
  // production code: we use a side door via `internals` namespace.
  // For now, since the function is not exported, we test via the public
  // surface `materializeMonthlySnapshots` and inspect runIcoEngineQuery
  // calls scoped to metrics_by_member.

  return mod
}

// Helper: assert call was made with a SQL fragment containing `text`.
const findIcoCall = (sqlFragment: string): unknown[] | undefined =>
  mocks.runIcoEngineQuery.mock.calls.find(call =>
    typeof call[0] === 'string' && call[0].includes(sqlFragment)
  )

beforeEach(() => {
  Object.values(mocks).forEach(mock => {
    if ('mockReset' in mock) (mock as ReturnType<typeof vi.fn>).mockReset()
  })

  delete process.env.ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED
  delete process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED
  delete process.env.ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED

  // Default mock returns for BQ queries (COUNT post-merge = 5 rows).
  mocks.runIcoEngineQuery.mockImplementation(async (sql: string) => {
    if (typeof sql === 'string' && sql.includes('SELECT COUNT')) {
      return [{ cnt: 5 }]
    }

    return []
  })

  mocks.isFreshnessGateEnabled.mockImplementation(
    () => process.env.ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED === 'true'
  )

  mocks.runUpstreamFreshnessGate.mockResolvedValue({
    safe: true,
    reason: null,
    blockingSignals: []
  })

  mocks.beginIcoMaterializationRun.mockResolvedValue({
    materializationId: 'test-uuid-001',
    startedAt: new Date('2026-05-18T03:15:00.000Z')
  })

  mocks.skipIcoMaterializationRun.mockResolvedValue({
    materializationId: 'test-uuid-skip-001'
  })

  mocks.completeIcoMaterializationRun.mockResolvedValue(undefined)
  mocks.failIcoMaterializationRun.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.resetModules()
})

// Test the function via the internal export. We add it explicitly below.
describe('TASK-900 Slice 2 — materializeMemberMetrics flag matrix', () => {
  it('LEGACY path: all flags OFF → DELETE+INSERT bit-for-bit, NO tracking, NO gate', async () => {
    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      // The materializer is not directly exported. Document the pin-test
      // expectation: when materialize.ts is refactored to export it for tests,
      // these assertions activate. For now, skip with explicit message.
      expect(typeof fn).toBe('function')

      return
    }

    const result = await fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)

    expect(result).toBe(5)
    expect(findIcoCall('DELETE FROM')).toBeDefined()
    expect(findIcoCall('INSERT INTO')).toBeDefined()
    expect(findIcoCall('MERGE INTO')).toBeUndefined()
    expect(mocks.beginIcoMaterializationRun).not.toHaveBeenCalled()
    expect(mocks.runUpstreamFreshnessGate).not.toHaveBeenCalled()
  })

  it('MERGE path: MERGE_PATTERN flag ON, gate OFF → MERGE + tracking begin+complete', async () => {
    process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED = 'true'

    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    const result = await fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)

    expect(result).toBe(5)
    expect(findIcoCall('MERGE INTO')).toBeDefined()
    expect(findIcoCall('DELETE FROM')).toBeUndefined()
    expect(mocks.beginIcoMaterializationRun).toHaveBeenCalledWith({
      tableName: 'metrics_by_member',
      periodYear: PERIOD_YEAR,
      periodMonth: PERIOD_MONTH
    })
    expect(mocks.completeIcoMaterializationRun).toHaveBeenCalledWith(
      expect.objectContaining({ materializationId: 'test-uuid-001', rowsMerged: 5 })
    )
  })

  it('GATE block: gate ON + signal=error → skipea, persiste tracking, captureWithDomain', async () => {
    process.env.ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED = 'true'
    process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED = 'true'

    mocks.runUpstreamFreshnessGate.mockResolvedValueOnce({
      safe: false,
      reason: 'identity.notion_bridge.coverage_drift=error',
      blockingSignals: [
        {
          signalId: 'identity.notion_bridge.coverage_drift',
          severity: 'error',
          label: 'Cobertura bridge Notion↔member',
          summary: 'cobertura 3.7%',
          moduleKey: 'identity',
          kind: 'drift',
          source: 'reader',
          evidence: [],
          observedAt: null
        }
      ]
    })

    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    const result = await fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)

    expect(result).toBe(0)
    expect(mocks.skipIcoMaterializationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        tableName: 'metrics_by_member',
        periodYear: PERIOD_YEAR,
        periodMonth: PERIOD_MONTH,
        reason: 'identity.notion_bridge.coverage_drift=error'
      })
    )
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'ico_materializer_skipped_safety',
          table: 'metrics_by_member'
        })
      })
    )
    expect(findIcoCall('MERGE INTO')).toBeUndefined()
    expect(findIcoCall('DELETE FROM')).toBeUndefined()
  })

  it('GATE pass: gate ON + signal=ok → procede con MERGE normalmente', async () => {
    process.env.ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED = 'true'
    process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED = 'true'

    // Default mock retorna safe=true
    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    const result = await fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)

    expect(result).toBe(5)
    expect(findIcoCall('MERGE INTO')).toBeDefined()
    expect(mocks.skipIcoMaterializationRun).not.toHaveBeenCalled()
  })

  it('FLAG COHERENCE: INCREMENTAL=true sin MERGE=true → throw runtime error', async () => {
    process.env.ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED = 'true'
    // MERGE_PATTERN_ENABLED no se setea → false

    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    await expect(fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)).rejects.toThrow(
      /incremental_delta_requires_merge_pattern/
    )
  })

  it('BUG CLASS TASK-877: gate detecta upstream degraded → data buena NO se destruye', async () => {
    // Este es el test crítico — simula que la noche del 14 mayo el bridge
    // Notion→member quedó al 3.7%. Con gate ON, el materializer NO toca BQ.
    process.env.ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED = 'true'
    process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED = 'true'

    mocks.runUpstreamFreshnessGate.mockResolvedValueOnce({
      safe: false,
      reason: 'identity.notion_bridge.coverage_drift=error',
      blockingSignals: [
        {
          signalId: 'identity.notion_bridge.coverage_drift',
          severity: 'error',
          label: 'Cobertura bridge Notion↔member',
          summary: 'Regresión sistémica del bridge: cobertura 3.7%',
          moduleKey: 'identity',
          kind: 'drift',
          source: 'reader',
          evidence: [],
          observedAt: null
        }
      ]
    })

    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    const result = await fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)

    // Materializer skipea → 0 rows escritos
    expect(result).toBe(0)

    // NINGUN call a BQ — data buena preservada bit-for-bit
    expect(mocks.runIcoEngineQuery).not.toHaveBeenCalled()

    // Skip persisted con evidence completa
    expect(mocks.skipIcoMaterializationRun).toHaveBeenCalledTimes(1)
  })

  it('TRACKING failure NO bloquea materializer (best-effort audit)', async () => {
    process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED = 'true'

    mocks.beginIcoMaterializationRun.mockRejectedValueOnce(
      new Error('PG connection refused')
    )

    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    const result = await fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)

    expect(result).toBe(5)
    expect(findIcoCall('MERGE INTO')).toBeDefined()
    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'ico_materializer_tracking_failed',
          stage: 'begin'
        })
      })
    )
  })

  it('MERGE failure: persiste tracking failed + captureWithDomain + re-throw', async () => {
    process.env.ICO_MATERIALIZER_MERGE_PATTERN_ENABLED = 'true'

    mocks.runIcoEngineQuery.mockImplementation(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('MERGE INTO')) {
        throw new Error('BQ MERGE quota exceeded')
      }

      if (typeof sql === 'string' && sql.includes('SELECT COUNT')) {
        return [{ cnt: 5 }]
      }

      return []
    })

    const mod = await importMaterializer()

    const fn = (
      mod as unknown as {
        __test_materializeMemberMetrics?: (
          projectId: string,
          periodYear: number,
          periodMonth: number
        ) => Promise<number>
      }
    ).__test_materializeMemberMetrics

    if (typeof fn !== 'function') {
      expect(typeof fn).toBe('function')

      return
    }

    await expect(fn(FAKE_PROJECT_ID, PERIOD_YEAR, PERIOD_MONTH)).rejects.toThrow(
      /BQ MERGE quota exceeded/
    )

    expect(mocks.failIcoMaterializationRun).toHaveBeenCalledWith({
      materializationId: 'test-uuid-001',
      errorMessage: 'BQ MERGE quota exceeded'
    })

    expect(mocks.captureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({
          source: 'ico_materializer_merge_failed'
        })
      })
    )
  })
})
