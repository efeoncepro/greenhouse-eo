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

const mockCountIncomesWithSettlementDrift = vi.fn()

vi.mock('@/lib/finance/income-settlement', () => ({
  countIncomesWithSettlementDrift: (...args: unknown[]) => mockCountIncomesWithSettlementDrift(...args)
}))

import { buildFinanceDataQualitySubsystem } from '@/lib/operations/get-operations-overview'

describe('buildFinanceDataQualitySubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCountIncomesWithSettlementDrift.mockResolvedValue(1)

    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.tables')) {
        return [{ exists: true }]
      }

      if (sql.includes('payment_status IN (\'pending\', \'partial\', \'overdue\')')) {
        return [{ cnt: '7' }]
      }

      if (sql.includes('AS direct_without_client')) {
        return [{ direct_without_client: '2', shared_unallocated: '11' }]
      }

      if (sql.includes('labor_allocation_saturation_drift')) {
        return [{ cnt: '0' }]
      }

      throw new Error(`Unexpected SQL in test:\n${sql}`)
    })
  })

  it('escalates only on platform integrity issues; AR + overhead surfaced as info', async () => {
    const subsystem = await buildFinanceDataQualitySubsystem()

    // processed = platform integrity metrics (drift + direct_without_client + labor_saturation = 3)
    // failed = platform integrity metrics in warning/error (drift + direct_without_client = 2)
    // status = degraded (because 2 platform integrity metrics are in warning state)
    expect(subsystem).toMatchObject({
      name: 'Finance Data Quality',
      status: 'degraded',
      processed: 3,
      failed: 2
    })

    expect(subsystem.summary).toContain('integridades rotas')
    expect(subsystem.summary).toContain('drift de ledger')
    expect(subsystem.summary).toContain('Pendientes operativos paralelos')
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

        // AR vencidas no longer escalates — it's a collections KPI, not a
        // platform health signal. The `info` tone keeps the count visible
        // without firing yellow chips on the reliability dashboard.
        status: 'info'
      },
      {
        key: 'shared_overhead_unallocated',
        label: 'Overhead compartido no asignado',
        value: 11,
        status: 'info'
      },
      {
        // TASK-709: invariante BD que detecta over-saturation (FTE > 100%)
        // por (member, period). Cuando = 0 = ok; > 0 = bug en
        // client_team_assignments upstream. Platform integrity metric.
        key: 'labor_allocation_saturation_drift',
        label: 'Drift de capacidad laboral (FTE > 100%)',
        value: 0,
        status: 'ok'
      }
    ])
  })

  it('keeps platform integrity green when only operational hygiene metrics have value', async () => {
    mockCountIncomesWithSettlementDrift.mockResolvedValueOnce(0)
    mockRunGreenhousePostgresQuery.mockReset()
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.tables')) return [{ exists: true }]
      if (sql.includes('payment_status IN (\'pending\', \'partial\', \'overdue\')')) return [{ cnt: '12' }]
      if (sql.includes('AS direct_without_client')) return [{ direct_without_client: '0', shared_unallocated: '5' }]
      if (sql.includes('labor_allocation_saturation_drift')) return [{ cnt: '0' }]
      throw new Error(`Unexpected SQL in test:\n${sql}`)
    })

    const subsystem = await buildFinanceDataQualitySubsystem()

    expect(subsystem.status).toBe('healthy')
    expect(subsystem.failed).toBe(0)
    expect(subsystem.summary).toContain('Plataforma sana')
    expect(subsystem.summary).toContain('cartera vencida')
  })
})
