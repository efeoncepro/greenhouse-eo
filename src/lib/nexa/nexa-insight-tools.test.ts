import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NexaRuntimeContext } from './nexa-contract'

// ── Mocks de los readers canónicos (un primitive, muchos consumers) ──────────
// Los tools son wrappers finos: NO queryean PG, delegan en estos readers que aplican
// el subject anti-oracle. Acá validamos el mapeo + la derivación del subject + gaps honestos.
const readNexaInsightDrill = vi.fn()
const listNexaInsightsForPeriod = vi.fn()

vi.mock('@/lib/ico-engine/ai/nexa-insight-drill-reader', () => ({
  readNexaInsightDrill: (...args: unknown[]) => readNexaInsightDrill(...args)
}))

vi.mock('@/lib/ico-engine/ai/nexa-insight-list-reader', () => ({
  listNexaInsightsForPeriod: (...args: unknown[]) => listNexaInsightsForPeriod(...args)
}))

import { executeNexaTool, getNexaToolDeclarations } from './nexa-tools'

const internalTenant = (overrides: Partial<NexaRuntimeContext> = {}): NexaRuntimeContext => ({
  userId: 'user-1',
  clientId: '',
  clientName: '',
  tenantType: 'efeonce_internal',
  role: 'efeonce_admin',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['internal'],
  timezone: 'America/Santiago',
  memberId: 'member-1',
  ...overrides
})

const clientTenant = (): NexaRuntimeContext => ({
  userId: 'user-c',
  clientId: 'client-1',
  clientName: 'Cliente',
  tenantType: 'client',
  role: 'client_executive',
  roleCodes: ['client_executive'],
  routeGroups: ['client'],
  timezone: 'America/Santiago'
})

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  enrichmentId: 'EO-AIE-1',
  signalId: 'EO-AIS-1',
  signalType: 'root_cause',
  metricName: 'otd_pct',
  severity: 'critical',
  qualityScore: 0.9,
  confidence: 0.8,
  explanationSummary: 'OTD bajó por bloqueo en revisión',
  rootCauseNarrative: 'La fase de revisión acumuló tareas atrasadas',
  recommendedAction: 'Redistribuir la carga de revisión',
  processedAt: '2026-06-10T00:00:00.000Z',
  spaceId: 'space-1',
  memberId: 'member-9',
  projectId: null,
  periodYear: 2026,
  periodMonth: 6,
  ...overrides
})

const exec = (toolName: string, args: Record<string, unknown>, tenant: NexaRuntimeContext) =>
  executeNexaTool({ toolCallId: 'call-1', toolName, args, context: tenant })

beforeEach(() => {
  readNexaInsightDrill.mockReset()
  listNexaInsightsForPeriod.mockReset()
})

describe('availability (anti-oracle: client tenants nunca acceden)', () => {
  it('expone get_insight/list_insights a tenants internos', () => {
    const names = getNexaToolDeclarations(internalTenant()).map(d => d.name)

    expect(names).toContain('get_insight')
    expect(names).toContain('list_insights')
  })

  it('NO expone los insight tools a tenants cliente', () => {
    const names = getNexaToolDeclarations(clientTenant()).map(d => d.name)

    expect(names).not.toContain('get_insight')
    expect(names).not.toContain('list_insights')
  })

  it('executeNexaTool degrada honesto si un cliente fuerza el tool', async () => {
    const result = await exec('get_insight', { insightId: 'EO-AIS-1' }, clientTenant())

    expect(result.result.available).toBe(false)
    expect(readNexaInsightDrill).not.toHaveBeenCalled()
  })
})

describe('get_insight', () => {
  it('deriva el subject del runtimeContext y mapea el estado current', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'current', insight: snapshot() })

    const result = await exec('get_insight', { insightId: 'EO-AIS-1' }, internalTenant())

    expect(readNexaInsightDrill).toHaveBeenCalledWith('EO-AIS-1', {
      userId: 'user-1',
      tenantType: 'efeonce_internal',
      roleCodes: ['efeonce_admin'],
      routeGroups: ['internal'],
      memberId: 'member-1'
    })
    expect(result.result.available).toBe(true)
    expect(result.result.summary).toContain('Redistribuir la carga de revisión')
    expect(result.result.raw?.drillHref).toBe('/nexa/insights/EO-AIS-1')
    expect((result.result.raw?.insight as Record<string, unknown>).enrichmentId).toBe('EO-AIE-1')
  })

  it('gap honesto cuando falta el id', async () => {
    const result = await exec('get_insight', {}, internalTenant())

    expect(result.result.available).toBe(false)
    expect(readNexaInsightDrill).not.toHaveBeenCalled()
  })

  it('not_found → gap honesto (no leakea existencia)', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'not_found' })

    const result = await exec('get_insight', { insightId: 'EO-AIS-x' }, internalTenant())

    expect(result.result.available).toBe(false)
  })

  it('degraded → gap honesto', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'degraded', reason: 'pg_read_failed', partial: null })

    const result = await exec('get_insight', { insightId: 'EO-AIS-1' }, internalTenant())

    expect(result.result.available).toBe(false)
  })

  it('superseded añade la nota de estado', async () => {
    readNexaInsightDrill.mockResolvedValue({
      state: 'superseded',
      insight: snapshot(),
      currentSignalDrillId: 'EO-AIS-1'
    })

    const result = await exec('get_insight', { insightId: 'EO-AIE-1' }, internalTenant())

    expect(result.result.available).toBe(true)
    expect(result.result.summary).toContain('superado')
  })
})

describe('list_insights', () => {
  it('lista los insights del período con drillHref por item', async () => {
    listNexaInsightsForPeriod.mockResolvedValue({
      state: 'ready',
      insights: [snapshot(), snapshot({ signalId: 'EO-AIS-2', severity: 'warning', metricName: 'rpa_avg' })],
      totalCount: 2,
      periodLabel: 'junio 2026'
    })

    const result = await exec('list_insights', { periodYear: 2026, periodMonth: 6 }, internalTenant())

    expect(listNexaInsightsForPeriod).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', tenantType: 'efeonce_internal' }),
      { periodYear: 2026, periodMonth: 6 }
    )
    expect(result.result.available).toBe(true)
    expect(result.result.summary).toContain('junio 2026')
    const insights = result.result.raw?.insights as Array<Record<string, unknown>>

    expect(insights).toHaveLength(2)
    expect(insights[0].drillHref).toBe('/nexa/insights/EO-AIS-1')
  })

  it('empty-positive → mensaje honesto sin inventar', async () => {
    listNexaInsightsForPeriod.mockResolvedValue({ state: 'empty-positive', periodLabel: 'junio 2026' })

    const result = await exec('list_insights', {}, internalTenant())

    expect(result.result.available).toBe(true)
    expect(result.result.summary).toContain('No hay insights')
  })

  it('degraded → gap honesto', async () => {
    listNexaInsightsForPeriod.mockResolvedValue({ state: 'degraded', reason: 'pg_read_failed' })

    const result = await exec('list_insights', {}, internalTenant())

    expect(result.result.available).toBe(false)
  })

  it('clampa periodMonth inválido al mes actual de Santiago', async () => {
    listNexaInsightsForPeriod.mockResolvedValue({ state: 'empty-positive', periodLabel: 'período' })

    await exec('list_insights', { periodYear: 2026, periodMonth: 99 }, internalTenant())

    const callArg = listNexaInsightsForPeriod.mock.calls[0][1] as { periodMonth: number }

    expect(callArg.periodMonth).toBeGreaterThanOrEqual(1)
    expect(callArg.periodMonth).toBeLessThanOrEqual(12)
  })
})
