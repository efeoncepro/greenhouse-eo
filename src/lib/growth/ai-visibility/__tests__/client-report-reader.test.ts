import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1243 — Tenant boundary del reader client-scoped.
 *
 * Prueba que `readClientGraderReport`:
 *  - resuelve el run SIEMPRE pasando la `organizationId` de la sesión al store (el filtro por
 *    org vive en el SQL del store; el reader nunca confía en un id del browser);
 *  - cliente A NO ve un run de cliente B: si el store no resuelve un run de ESA org → `not_found`
 *    (sin revelar la existencia del run ajeno);
 *  - mapea `score_not_found` del builder a `report_unavailable`;
 *  - devuelve el DTO CLIENTE (audience 'client'), reusando la orquestación canónica.
 */

vi.mock('../store', () => ({
  getClientGraderRunById: vi.fn(),
  getLatestClientGraderRun: vi.fn()
}))

vi.mock('../report/command', async () => {
  // Mantiene GraderReportError real (para el instanceof del reader) y mockea solo readGraderReport.
  const actual = (await vi.importActual('../report/command')) as Record<string, unknown>

  return { ...actual, readGraderReport: vi.fn() }
})

import { getClientGraderRunById, getLatestClientGraderRun } from '../store'
import { GraderReportError, readGraderReport } from '../report/command'
import { ClientGraderReportError, readClientGraderReport } from '../client/command'

const ORG_A = 'org-aerolinea-a'
const ORG_B = 'org-banco-b'

const fakeRun = (runId: string) => ({ runId }) as Awaited<ReturnType<typeof getClientGraderRunById>>

const fakeInternalReport = () =>
  ({
    audience: 'internal_sales',
    recommendations: [],
    dimensions: [],
    findings: [],
    primaryGap: null,
    recommendedMotion: null,
    reportVersion: 'ai_visibility_report_v1',
    recommendationPackVersion: 'ai_visibility_recommendation_pack_v1',
    gate: { status: 'ready', reason: 'r', nextAction: 'n' },
    headline: { dimensionKey: 'ai_visibility', metric: 'm', value: '0/100', frame: 'f', severity: 'critico' },
    overallScore: 10,
    overallSeverity: 'critico',
    competitiveSov: { brandMentions: 0, competitors: [] },
    sourceTypeSummary: [],
    citationInsight: { ownDomainShare: null, findingsWithCitations: 0, findingsCitingOwnDomain: 0 },
    citationSourceBreakdown: { domains: [], totalCitations: 0, uniqueDomains: 0, reason: 'sin_citas_evaluables' },
    categoryTaxonomySummary: {
      taxonomyVersion: 'category_taxonomy_v1',
      status: 'unknown',
      categories: [],
      totalSignals: 0,
      unmappedCount: 0,
      ambiguousCount: 0
    },
    sentimentSummary: { positive: 0, neutral: 0, negative: 0, mixed: 0, evaluated: 0, net: 'sin_dato' },
    positionSummary: { best: null, average: null, ranked: 0 },
    trend: { status: 'sin_historico', reason: 'r', previousAsOf: null, overall: null, dimensions: [] },
    provenance: { asOfDate: null, promptPackVersion: 'p', scoreVersion: 's', providersSampled: [], promptCount: 0 },
    disclaimer: 'd'
  }) as unknown as Awaited<ReturnType<typeof readGraderReport>>['report']

beforeEach(() => {
  vi.mocked(getClientGraderRunById).mockReset()
  vi.mocked(getLatestClientGraderRun).mockReset()
  vi.mocked(readGraderReport).mockReset()
})

describe('readClientGraderReport — tenant boundary', () => {
  it('runId path: pasa la org de la sesión al store y devuelve el DTO cliente', async () => {
    vi.mocked(getClientGraderRunById).mockResolvedValue(fakeRun('run-a-1'))
    vi.mocked(readGraderReport).mockResolvedValue({ report: fakeInternalReport(), publicReport: {} as never })

    const result = await readClientGraderReport({ organizationId: ORG_A, runId: 'run-a-1' })

    expect(getClientGraderRunById).toHaveBeenCalledWith({ runId: 'run-a-1', organizationId: ORG_A })
    expect(readGraderReport).toHaveBeenCalledWith({ runId: 'run-a-1' })
    expect(result.report.audience).toBe('client')
  })

  it('cliente A NO ve un run de cliente B: store no resuelve → not_found (sin revelar existencia)', async () => {
    // El run existe pero pertenece a ORG_B → el SQL del store (WHERE organization_id = ORG_A) no lo devuelve.
    vi.mocked(getClientGraderRunById).mockResolvedValue(null)

    await expect(
      readClientGraderReport({ organizationId: ORG_A, runId: 'run-de-org-b' })
    ).rejects.toMatchObject({ code: 'not_found' })

    expect(getClientGraderRunById).toHaveBeenCalledWith({ runId: 'run-de-org-b', organizationId: ORG_A })
    expect(readGraderReport).not.toHaveBeenCalled()
  })

  it('latest path: consulta el run reportable más reciente de la org', async () => {
    vi.mocked(getLatestClientGraderRun).mockResolvedValue(fakeRun('run-a-latest'))
    vi.mocked(readGraderReport).mockResolvedValue({ report: fakeInternalReport(), publicReport: {} as never })

    const result = await readClientGraderReport({ organizationId: ORG_A })

    expect(getLatestClientGraderRun).toHaveBeenCalledWith(ORG_A)
    expect(getClientGraderRunById).not.toHaveBeenCalled()
    expect(result.report.audience).toBe('client')
  })

  it('latest sin runs reportables → not_found', async () => {
    vi.mocked(getLatestClientGraderRun).mockResolvedValue(null)

    await expect(readClientGraderReport({ organizationId: ORG_B })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('run sin score persistido → report_unavailable', async () => {
    vi.mocked(getClientGraderRunById).mockResolvedValue(fakeRun('run-a-2'))
    vi.mocked(readGraderReport).mockRejectedValue(new GraderReportError('score_not_found', 'sin score'))

    await expect(
      readClientGraderReport({ organizationId: ORG_A, runId: 'run-a-2' })
    ).rejects.toMatchObject({ code: 'report_unavailable' })
  })

  it('el error es un ClientGraderReportError tipado', async () => {
    vi.mocked(getLatestClientGraderRun).mockResolvedValue(null)

    await expect(readClientGraderReport({ organizationId: ORG_A })).rejects.toBeInstanceOf(ClientGraderReportError)
  })
})
