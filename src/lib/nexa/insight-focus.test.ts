import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NexaRuntimeContext } from './nexa-contract'

const readNexaInsightDrill = vi.fn()

vi.mock('@/lib/ico-engine/ai/nexa-insight-drill-reader', () => ({
  readNexaInsightDrill: (...args: unknown[]) => readNexaInsightDrill(...args),
  buildNexaInsightDrillHref: (id: string) => `/nexa/insights/${id}`
}))

import { buildFocusedInsightNote, buildNexaInsightSubject } from './insight-focus'

const tenant = (overrides: Partial<NexaRuntimeContext> = {}): NexaRuntimeContext => ({
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

beforeEach(() => readNexaInsightDrill.mockReset())

describe('buildNexaInsightSubject', () => {
  it('mapea el runtimeContext al subject mínimo del reader', () => {
    expect(buildNexaInsightSubject(tenant())).toEqual({
      userId: 'user-1',
      tenantType: 'efeonce_internal',
      roleCodes: ['efeonce_admin'],
      routeGroups: ['internal'],
      memberId: 'member-1'
    })
  })

  it('memberId ausente → null', () => {
    expect(buildNexaInsightSubject(tenant({ memberId: undefined })).memberId).toBeNull()
  })
})

describe('buildFocusedInsightNote', () => {
  it('sin focusRef → null (sin ancla)', async () => {
    expect(await buildFocusedInsightNote(tenant())).toBeNull()
    expect(readNexaInsightDrill).not.toHaveBeenCalled()
  })

  it('focusRef de otro kind → null', async () => {
    const note = await buildFocusedInsightNote(tenant({ focusRef: { kind: 'otro' as 'nexa_insight', id: 'x' } }))

    expect(note).toBeNull()
    expect(readNexaInsightDrill).not.toHaveBeenCalled()
  })

  it('current → nota con resumen, acción y enlace; deriva el subject del turno', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'current', insight: snapshot() })

    const note = await buildFocusedInsightNote(tenant({ focusRef: { kind: 'nexa_insight', id: 'EO-AIS-1' } }))

    expect(readNexaInsightDrill).toHaveBeenCalledWith('EO-AIS-1', {
      userId: 'user-1',
      tenantType: 'efeonce_internal',
      roleCodes: ['efeonce_admin'],
      routeGroups: ['internal'],
      memberId: 'member-1'
    })
    expect(note).toContain('CONTEXTO ENFOCADO')
    expect(note).toContain('Redistribuir la carga de revisión')
    expect(note).toContain('/nexa/insights/EO-AIS-1')
  })

  it('not_found (anti-oracle) → null, sin ancla', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'not_found' })

    expect(await buildFocusedInsightNote(tenant({ focusRef: { kind: 'nexa_insight', id: 'EO-AIS-x' } }))).toBeNull()
  })

  it('degraded → null, sin ancla', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'degraded', reason: 'pg_read_failed', partial: null })

    expect(await buildFocusedInsightNote(tenant({ focusRef: { kind: 'nexa_insight', id: 'EO-AIS-1' } }))).toBeNull()
  })

  it('superseded → nota con la aclaración de estado', async () => {
    readNexaInsightDrill.mockResolvedValue({ state: 'superseded', insight: snapshot(), currentSignalDrillId: 'EO-AIS-1' })

    const note = await buildFocusedInsightNote(tenant({ focusRef: { kind: 'nexa_insight', id: 'EO-AIE-1' } }))

    expect(note).toContain('superado')
  })
})
