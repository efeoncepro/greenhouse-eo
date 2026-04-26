import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  getGreenhousePostgresConfig: vi.fn(),
  isGreenhousePostgresConfigured: vi.fn(() => true)
}))

vi.mock('@/lib/bigquery', () => ({
  getBlockedQueries: vi.fn(),
  getBigQueryProjectId: vi.fn()
}))

vi.mock('@/lib/cloud/bigquery', () => ({
  getBigQueryMaximumBytesBilled: vi.fn()
}))

vi.mock('@/lib/cloud/cron', () => ({
  getCronSecretState: vi.fn()
}))

vi.mock('@/lib/cloud/gcp-auth', () => ({
  getCloudGcpAuthPosture: vi.fn()
}))

vi.mock('@/lib/cloud/health', () => ({
  buildCloudHealthSnapshot: vi.fn(),
  getCloudPlatformHealthSnapshot: vi.fn()
}))

vi.mock('@/lib/cloud/observability', () => ({
  getCloudObservabilityPosture: vi.fn(),
  getCloudSentryIncidents: vi.fn()
}))

vi.mock('@/lib/cloud/postgres', () => ({
  getCloudPostgresPosture: vi.fn()
}))

vi.mock('@/lib/ico-engine/ai/llm-enrichment-reader', () => ({
  readAiLlmOperationsSnapshot: vi.fn()
}))

vi.mock('@/lib/integrations/notion-delivery-data-quality', () => ({
  getNotionDeliveryDataQualityOverview: vi.fn()
}))

vi.mock('@/lib/operations/reactive-backlog', () => ({
  readReactiveBacklogOverview: vi.fn()
}))

vi.mock('@/lib/sync/reactive-run-tracker', () => ({
  getLastReactiveRun: vi.fn()
}))

import { buildFinanceDataQualitySubsystem } from '@/lib/operations/get-operations-overview'

describe('buildFinanceDataQualitySubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return [{ exists: true }]
      }

      if (sql.includes('ABS(COALESCE(i.amount_paid, 0) - p.total) > 0.01')) {
        return [{ cnt: '1' }]
      }

      if (sql.includes('payment_status IN (\'pending\', \'partial\', \'overdue\')')) {
        return [{ cnt: '7' }]
      }

      if (sql.includes('AS direct_without_client')) {
        return [{ direct_without_client: '2', shared_unallocated: '11' }]
      }

      throw new Error(`Unexpected SQL in test:\n${sql}`)
    })
  })

  it('returns semantic metrics and summary instead of mixing processed and failed counters', async () => {
    const subsystem = await buildFinanceDataQualitySubsystem()

    expect(subsystem).toMatchObject({
      name: 'Finance Data Quality',
      status: 'degraded',
      processed: 4,
      failed: 3
    })

    expect(subsystem.summary).toContain('buckets con issue activo')
    expect(subsystem.summary).toContain('overheads compartidos')
    expect(subsystem.metrics).toEqual([
      {
        key: 'payment_ledger_integrity',
        label: 'Drift de ledger',
        value: 1,
        status: 'warning'
      },
      {
        key: 'direct_cost_without_client',
        label: 'Costo directo sin cliente',
        value: 2,
        status: 'warning'
      },
      {
        key: 'overdue_receivables',
        label: 'Cartera vencida',
        value: 7,
        status: 'error'
      },
      {
        key: 'shared_overhead_unallocated',
        label: 'Overhead compartido no asignado',
        value: 11,
        status: 'info'
      }
    ])
  })
})
