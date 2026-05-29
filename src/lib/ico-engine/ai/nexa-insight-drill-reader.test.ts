import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── TASK-947 — Anti-regresión del helper canonical readNexaInsightDrill ────

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const {
  detectNexaIdKind,
  buildNexaInsightDrillHref,
  readNexaInsightDrill,
  NEXA_ID_PREFIXES
} = await import('./nexa-insight-drill-reader')

beforeEach(() => {
  mockQuery.mockReset()
  mockCaptureWithDomain.mockReset()
})

const adminSubject = {
  userId: 'user-1',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['efeonce_admin'] as const,
  routeGroups: ['internal', 'admin'] as const
}

const internalSubject = {
  userId: 'user-2',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['hr_manager'] as const,
  routeGroups: ['internal', 'hr'] as const
}

const collaboratorSubject = {
  userId: 'user-3',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['collaborator'] as const,
  routeGroups: [] as const,
  memberId: 'member-42'
}

const clientSubject = {
  userId: 'client-user',
  tenantType: 'client' as const,
  roleCodes: ['client_executive'] as const,
  routeGroups: ['client'] as const
}

const sampleEnrichmentRow = {
  enrichment_id: 'EO-AIE-12345678',
  signal_id: 'EO-AIS-deadbeef0000',
  signal_type: 'anomaly',
  metric_name: 'ftr_pct',
  severity: 'warning',
  quality_score: 92.4,
  confidence: 0.88,
  explanation_summary: 'FTR cayó',
  root_cause_narrative: 'Causa narrativa',
  recommended_action: 'Acción sugerida',
  processed_at: '2026-05-28T12:00:00.000Z',
  space_id: 'spc-efeonce',
  member_id: null,
  project_id: null,
  period_year: 2026,
  period_month: 5
}

describe('detectNexaIdKind', () => {
  it('dispatch prefix canonical EO-AIS-* → signal', () => {
    expect(detectNexaIdKind('EO-AIS-abc12345abcd')).toBe('signal')
  })

  it('dispatch prefix canonical EO-AIE-* → enrichment', () => {
    expect(detectNexaIdKind('EO-AIE-deadbeef')).toBe('enrichment')
  })

  it('dispatch prefix canonical EO-AIH-* → enrichment_history', () => {
    expect(detectNexaIdKind('EO-AIH-cafef00d')).toBe('enrichment_history')
  })

  it('returns unknown para IDs sin prefix válido', () => {
    expect(detectNexaIdKind('foo-bar')).toBe('unknown')
    expect(detectNexaIdKind('EO-FSIG-12345678ab')).toBe('unknown')
    expect(detectNexaIdKind('')).toBe('unknown')
  })

  it('NEXA_ID_PREFIXES exports canonical values', () => {
    expect(NEXA_ID_PREFIXES.ICO_SIGNAL).toBe('EO-AIS-')
    expect(NEXA_ID_PREFIXES.ICO_ENRICHMENT).toBe('EO-AIE-')
    expect(NEXA_ID_PREFIXES.ICO_ENRICHMENT_HISTORY).toBe('EO-AIH-')
  })
})

describe('buildNexaInsightDrillHref', () => {
  it('genera URL canonical top-level /nexa/insights/<id>', () => {
    expect(buildNexaInsightDrillHref('EO-AIS-abc12345abcd')).toBe('/nexa/insights/EO-AIS-abc12345abcd')
  })

  it('NO emite /agency/insights/* legacy', () => {
    const href = buildNexaInsightDrillHref('EO-AIE-deadbeef')

    expect(href).not.toMatch(/\/agency\//)
    expect(href.startsWith('/nexa/insights/')).toBe(true)
  })
})

describe('readNexaInsightDrill — dispatch + states canonical', () => {
  it('not_found cuando ID kind unknown (anti-oracle)', async () => {
    const result = await readNexaInsightDrill('bogus-id', adminSubject)

    expect(result).toEqual({ state: 'not_found' })
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('client tenant SIEMPRE → not_found (V1 internal-only, anti-oracle)', async () => {
    mockQuery.mockResolvedValueOnce([sampleEnrichmentRow]) // pretend row exists

    const result = await readNexaInsightDrill('EO-AIS-deadbeef0000', clientSubject)

    expect(result).toEqual({ state: 'not_found' })
  })

  it('signal-anchored EO-AIS-* + admin + signal vigente → current', async () => {
    mockQuery
      .mockResolvedValueOnce([sampleEnrichmentRow]) // fetchEnrichmentBySignalId
      .mockResolvedValueOnce([{ signal_id: sampleEnrichmentRow.signal_id }]) // isSignalStillActive

    const result = await readNexaInsightDrill('EO-AIS-deadbeef0000', adminSubject)

    expect(result.state).toBe('current')

    if (result.state === 'current') {
      expect(result.insight.enrichmentId).toBe('EO-AIE-12345678')
      expect(result.insight.signalId).toBe('EO-AIS-deadbeef0000')
    }
  })

  it('signal-anchored EO-AIS-* + signal resolved (NO en ico_ai_signals) → expired', async () => {
    mockQuery
      .mockResolvedValueOnce([sampleEnrichmentRow])
      .mockResolvedValueOnce([]) // signal not in ico_ai_signals → resolved

    const result = await readNexaInsightDrill('EO-AIS-deadbeef0000', adminSubject)

    expect(result.state).toBe('expired')

    if (result.state === 'expired') {
      expect(result.resolvedAt).toBe('2026-05-28T12:00:00.000Z')
    }
  })

  it('enrichment-anchored EO-AIE-* tier 1 (current) → current', async () => {
    mockQuery.mockResolvedValueOnce([sampleEnrichmentRow]) // fetchEnrichmentById succeeds

    const result = await readNexaInsightDrill('EO-AIE-12345678', adminSubject)

    expect(result.state).toBe('current')
  })

  it('enrichment-anchored EO-AIE-* tier 2 (history fallback) → superseded', async () => {
    mockQuery
      .mockResolvedValueOnce([]) // tier 1 current: miss
      .mockResolvedValueOnce([sampleEnrichmentRow]) // tier 2 history: hit
      .mockResolvedValueOnce([sampleEnrichmentRow]) // current exists for same signal_id

    const result = await readNexaInsightDrill('EO-AIE-12345678', adminSubject)

    expect(result.state).toBe('superseded')

    if (result.state === 'superseded') {
      expect(result.currentSignalDrillId).toBe(sampleEnrichmentRow.signal_id)
    }
  })

  it('enrichment-anchored EO-AIE-* + ambos tiers miss → not_found', async () => {
    mockQuery
      .mockResolvedValueOnce([]) // tier 1 miss
      .mockResolvedValueOnce([]) // tier 2 miss

    const result = await readNexaInsightDrill('EO-AIE-deadbeef', adminSubject)

    expect(result).toEqual({ state: 'not_found' })
  })

  it('enrichment-history forensic EO-AIH-* → superseded snapshot', async () => {
    mockQuery
      .mockResolvedValueOnce([sampleEnrichmentRow]) // history by history_id
      .mockResolvedValueOnce([sampleEnrichmentRow]) // current for signal_id

    const result = await readNexaInsightDrill('EO-AIH-cafef00d', adminSubject)

    expect(result.state).toBe('superseded')
  })

  it('subject-aware filter: internal sin admin + space_id poblado → permitido', async () => {
    mockQuery
      .mockResolvedValueOnce([sampleEnrichmentRow])
      .mockResolvedValueOnce([{ signal_id: sampleEnrichmentRow.signal_id }])

    const result = await readNexaInsightDrill('EO-AIS-deadbeef0000', internalSubject)

    expect(result.state).toBe('current')
  })

  it('subject-aware filter: collaborator sin route_group y member_id NO match → not_found', async () => {
    mockQuery.mockResolvedValueOnce([
      { ...sampleEnrichmentRow, member_id: 'member-99' }
    ])

    const result = await readNexaInsightDrill('EO-AIS-deadbeef0000', collaboratorSubject)

    expect(result).toEqual({ state: 'not_found' })
  })

  it('subject-aware filter: collaborator + member_id match → current', async () => {
    mockQuery
      .mockResolvedValueOnce([
        { ...sampleEnrichmentRow, member_id: 'member-42' }
      ])
      .mockResolvedValueOnce([{ signal_id: sampleEnrichmentRow.signal_id }])

    const result = await readNexaInsightDrill('EO-AIS-deadbeef0000', collaboratorSubject)

    expect(result.state).toBe('current')
  })

  it('PG read failure → degraded + captureWithDomain(delivery)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG connection refused'))

    const result = await readNexaInsightDrill('EO-AIE-deadbeef', adminSubject)

    expect(result.state).toBe('degraded')

    if (result.state === 'degraded') {
      expect(result.reason).toBe('pg_read_failed')
    }

    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'nexa_insight_detail', stage: 'pg_read' })
      })
    )
  })
})
