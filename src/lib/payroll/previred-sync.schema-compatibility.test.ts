import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAssertPayrollPostgresReady = vi.fn(async () => undefined)

const mockPublishOutboxEvent = vi.fn(async (_payload?: unknown, _client?: unknown) => {
  void _payload
  void _client

  return 'evt-previred-1'
})

const mockClientQuery = vi.fn(async (...args: [string?, unknown[]?]) => {
  void args

  return { rows: [] }
})

const mockWithGreenhousePostgresTransaction = vi.fn(
  async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery })
)

vi.mock('@/lib/payroll/postgres-store', () => ({
  assertPayrollPostgresReady: () => mockAssertPayrollPostgresReady()
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (payload: unknown, client?: unknown) => mockPublishOutboxEvent(payload, client)
}))

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    mockWithGreenhousePostgresTransaction(callback)
}))

const previredPayload = {
  PreviredID: 12324,
  Fecha: '2026-04-27T06:00:03.727Z',
  PeriodoMY: '042026',
  PeriodoYM: '2604',
  UFValPeriodo: '40120,20',
  UTMVal: '70123',
  RTIAfpUF: '90',
  RTISegCesUF: '135,2',
  RMITrabDepeInd: '539000',
  TasaSIS: '1,54',
  AFPCapitalTasaDepTrab: '11,44',
  AFPCapitalTasaDepAPagar: '11,54',
  AFPCuprumTasaDepTrab: '11,44',
  AFPCuprumTasaDepAPagar: '11,54',
  AFPHabitatTasaDepTrab: '11,27',
  AFPHabitatTasaDepAPagar: '11,37',
  AFPPlanVitalTasaDepTrab: '11,16',
  AFPPlanVitalTasaDepAPagar: '11,26',
  AFPProVidaTasaDepTrab: '11,45',
  AFPProVidaTasaDepAPagar: '11,55',
  AFPModeloTasaDepTrab: '10,58',
  AFPModeloTasaDepAPagar: '10,68',
  AFPUnoTasaDepTrab: '10,46',
  AFPUnoTasaDepAPagar: '10,56'
}

describe('previred sync schema compatibility', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    mockAssertPayrollPostgresReady.mockClear()
    mockPublishOutboxEvent.mockClear()
    mockClientQuery.mockReset()
    mockClientQuery.mockResolvedValue({ rows: [] })
    mockWithGreenhousePostgresTransaction.mockClear()
  })

  it('writes AFP rates using the deployed chile_afp_rates schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify(previredPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    )

    const { syncGaelPreviredPeriod } = await import('./previred-sync')

    const result = await syncGaelPreviredPeriod({ periodYear: 2026, periodMonth: 4 })

    expect(result.previred.status).toBe('ok')
    expect(result.previred.rows).toBe(8)

    const afpInsertCalls = mockClientQuery.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO greenhouse_payroll.chile_afp_rates')
    )

    expect(afpInsertCalls).toHaveLength(7)
    const [firstSql, firstValues] = afpInsertCalls[0] as [string, unknown[]]

    expect(String(firstSql)).not.toContain('worker_rate')
    expect(String(firstSql)).toContain('is_active')
    expect(firstValues).toHaveLength(7)
    expect(firstValues.at(-1)).toBe(true)
  })
})
