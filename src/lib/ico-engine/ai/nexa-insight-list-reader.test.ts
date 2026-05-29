import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── TASK-950 — Anti-regresión del helper canonical listNexaInsightsForPeriod ─

vi.mock('server-only', () => ({}))

const mockQuery = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const { listNexaInsightsForPeriod } = await import('./nexa-insight-list-reader')

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

const internalBroadSubject = {
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

const collaboratorWithoutMemberId = {
  userId: 'user-4',
  tenantType: 'efeonce_internal' as const,
  roleCodes: ['collaborator'] as const,
  routeGroups: [] as const
}

const clientSubject = {
  userId: 'client-user',
  tenantType: 'client' as const,
  roleCodes: ['client_executive'] as const,
  routeGroups: ['client'] as const
}

const sampleRow = {
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

const baseInput = { periodYear: 2026, periodMonth: 5 }

describe('listNexaInsightsForPeriod — anti-oracle subject filter (TASK-950)', () => {
  it('client tenant → empty-positive sin tocar PG (anti-oracle TASK-872)', async () => {
    const result = await listNexaInsightsForPeriod(clientSubject, baseInput)

    expect(result.state).toBe('empty-positive')

    if (result.state === 'empty-positive') {
      expect(result.periodLabel).toBe('05/2026')
    }

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('internal collaborator sin memberId → empty-positive sin tocar PG', async () => {
    const result = await listNexaInsightsForPeriod(collaboratorWithoutMemberId, baseInput)

    expect(result.state).toBe('empty-positive')
    expect(mockQuery).not.toHaveBeenCalled()
  })
})

describe('listNexaInsightsForPeriod — ready / empty-positive de PG', () => {
  it('admin con resultados → ready + insights ordenados + periodLabel', async () => {
    mockQuery.mockResolvedValueOnce([sampleRow, { ...sampleRow, enrichment_id: 'EO-AIE-99999999' }])

    const result = await listNexaInsightsForPeriod(adminSubject, baseInput)

    expect(result.state).toBe('ready')

    if (result.state === 'ready') {
      expect(result.insights).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.periodLabel).toBe('05/2026')
      expect(result.insights[0].enrichmentId).toBe('EO-AIE-12345678')
    }
  })

  it('admin sin resultados → empty-positive', async () => {
    mockQuery.mockResolvedValueOnce([])

    const result = await listNexaInsightsForPeriod(adminSubject, baseInput)

    expect(result.state).toBe('empty-positive')

    if (result.state === 'empty-positive') {
      expect(result.periodLabel).toBe('05/2026')
    }
  })

  it('internal broad (hr_manager) → admin SQL flag true ($3=true, $4=null)', async () => {
    mockQuery.mockResolvedValueOnce([sampleRow])

    await listNexaInsightsForPeriod(internalBroadSubject, baseInput)

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [, params] = mockQuery.mock.calls[0]

    expect(params).toEqual([2026, 5, true, null, 24])
  })

  it('collaborator self → SQL params $3=false, $4=memberId', async () => {
    mockQuery.mockResolvedValueOnce([sampleRow])

    await listNexaInsightsForPeriod(collaboratorSubject, baseInput)

    const [, params] = mockQuery.mock.calls[0]

    expect(params).toEqual([2026, 5, false, 'member-42', 24])
  })

  it('limit canonical default 24', async () => {
    mockQuery.mockResolvedValueOnce([])

    await listNexaInsightsForPeriod(adminSubject, baseInput)

    const [, params] = mockQuery.mock.calls[0]

    expect(params[4]).toBe(24)
  })

  it('limit override aplicado al SQL', async () => {
    mockQuery.mockResolvedValueOnce([])

    await listNexaInsightsForPeriod(adminSubject, { ...baseInput, limit: 5 })

    const [, params] = mockQuery.mock.calls[0]

    expect(params[4]).toBe(5)
  })
})

describe('listNexaInsightsForPeriod — honest degradation', () => {
  it('PG falla → state degraded + captureWithDomain delivery', async () => {
    mockQuery.mockRejectedValueOnce(new Error('PG connection refused'))

    const result = await listNexaInsightsForPeriod(adminSubject, baseInput)

    expect(result.state).toBe('degraded')

    if (result.state === 'degraded') {
      expect(result.reason).toBe('pg_read_failed')
    }

    expect(mockCaptureWithDomain).toHaveBeenCalledWith(
      expect.any(Error),
      'delivery',
      expect.objectContaining({
        tags: expect.objectContaining({ source: 'nexa_insight_list', stage: 'pg_read' }),
        extra: expect.objectContaining({ periodYear: 2026, periodMonth: 5 })
      })
    )
  })
})

describe('listNexaInsightsForPeriod — SQL shape canonical', () => {
  it('query SQL incluye filter status=succeeded + ORDER BY severity + LIMIT', async () => {
    mockQuery.mockResolvedValueOnce([])

    await listNexaInsightsForPeriod(adminSubject, baseInput)

    const [sql] = mockQuery.mock.calls[0]

    expect(sql).toContain('greenhouse_serving.ico_ai_signal_enrichments')
    expect(sql).toContain("status = 'succeeded'")
    expect(sql).toContain('ORDER BY')
    expect(sql).toContain('LIMIT $5')
    expect(sql).toContain("WHEN 'critical' THEN 0")
  })

  it('SQL filter dual: WHERE period_year + period_month + subject-aware OR', async () => {
    mockQuery.mockResolvedValueOnce([])

    await listNexaInsightsForPeriod(collaboratorSubject, baseInput)

    const [sql] = mockQuery.mock.calls[0]

    expect(sql).toContain('period_year = $1')
    expect(sql).toContain('period_month = $2')
    expect(sql).toContain('$3::boolean = TRUE')
    expect(sql).toContain('member_id = $4')
  })
})
