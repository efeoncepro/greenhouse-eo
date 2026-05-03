import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
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

const mockGetFinanceLedgerHealth = vi.fn()

vi.mock('@/lib/finance/ledger-health', () => ({
  getFinanceLedgerHealth: (...args: unknown[]) => mockGetFinanceLedgerHealth(...args)
}))

import { buildFinanceDataQualitySubsystem } from '@/lib/operations/get-operations-overview'

const cleanT708 = {
  paymentsPendingAccountResolutionRuntime: 0,
  paymentsPendingAccountResolutionHistorical: 0,
  settlementLegsPrincipalWithoutInstrument: 0,
  reconciledRowsAgainstUnscopedTarget: 0,
  externalCashSignalsUnresolvedOverThreshold: 0,
  externalCashSignalsPromotedInvariantViolation: 0
}

describe('buildFinanceDataQualitySubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockCountIncomesWithSettlementDrift.mockResolvedValue(1)
    mockGetFinanceLedgerHealth.mockResolvedValue({ task708: cleanT708 })

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

    // processed = platform integrity metrics (drift + direct_without_client + labor_saturation
    //   + 4 TASK-708 metrics = 7).
    // failed = platform integrity metrics in warning/error (drift + direct_without_client = 2).
    expect(subsystem).toMatchObject({
      name: 'Finance Data Quality',
      status: 'degraded',
      processed: 7,
      failed: 2
    })

    expect(subsystem.summary).toContain('integridades rotas')
    expect(subsystem.summary).toContain('drift de ledger')
    expect(subsystem.summary).toContain('Pendientes operativos paralelos')

    const metricsByKey = new Map((subsystem.metrics ?? []).map(m => [m.key, m]))

    expect(metricsByKey.get('payment_ledger_integrity')).toMatchObject({ value: 1, status: 'warning' })
    expect(metricsByKey.get('direct_cost_without_client')).toMatchObject({ value: 2, status: 'warning' })
    expect(metricsByKey.get('overdue_receivables')).toMatchObject({ value: 7, status: 'info' })
    expect(metricsByKey.get('shared_overhead_unallocated')).toMatchObject({ value: 11, status: 'info' })
    expect(metricsByKey.get('labor_allocation_saturation_drift')).toMatchObject({ value: 0, status: 'ok' })

    // TASK-708 platform integrity metrics — all clean.
    expect(metricsByKey.get('task708_payments_pending_account_runtime')).toMatchObject({ value: 0, status: 'ok' })
    expect(metricsByKey.get('task708_settlement_legs_principal_without_instrument')).toMatchObject({ value: 0, status: 'ok' })
    expect(metricsByKey.get('task708_reconciled_against_unscoped')).toMatchObject({ value: 0, status: 'ok' })
    expect(metricsByKey.get('task708_external_signals_promoted_invariant')).toMatchObject({ value: 0, status: 'ok' })

    // TASK-708 informational metrics — historical phantoms + unresolved queue.
    expect(metricsByKey.get('task708_payments_pending_account_historical')).toMatchObject({ status: 'info' })
    expect(metricsByKey.get('task708_external_signals_unresolved_overdue')).toMatchObject({ status: 'info' })
  })

  it('keeps platform integrity green when only operational hygiene metrics have value', async () => {
    mockCountIncomesWithSettlementDrift.mockResolvedValueOnce(0)
    mockGetFinanceLedgerHealth.mockResolvedValueOnce({ task708: cleanT708 })
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

  it('escalates to degraded when TASK-708 runtime invariant is violated', async () => {
    mockCountIncomesWithSettlementDrift.mockResolvedValueOnce(0)
    mockGetFinanceLedgerHealth.mockResolvedValueOnce({
      task708: {
        ...cleanT708,
        paymentsPendingAccountResolutionRuntime: 1,
        externalCashSignalsPromotedInvariantViolation: 0
      }
    })
    mockRunGreenhousePostgresQuery.mockReset()
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.tables')) return [{ exists: true }]
      if (sql.includes('payment_status IN (\'pending\', \'partial\', \'overdue\')')) return [{ cnt: '0' }]
      if (sql.includes('AS direct_without_client')) return [{ direct_without_client: '0', shared_unallocated: '0' }]
      if (sql.includes('labor_allocation_saturation_drift')) return [{ cnt: '0' }]
      throw new Error(`Unexpected SQL in test:\n${sql}`)
    })

    const subsystem = await buildFinanceDataQualitySubsystem()

    expect(subsystem.status).toBe('degraded')
    expect(subsystem.failed).toBeGreaterThanOrEqual(1)
    const runtimeMetric = (subsystem.metrics ?? []).find(m => m.key === 'task708_payments_pending_account_runtime')

    expect(runtimeMetric).toMatchObject({ value: 1, status: 'error' })
  })
})
