import { describe, expect, it } from 'vitest'

import { buildInsightReportPlanInput } from './report-mapper'
import { InsightsRenderRejectedError } from '../errors'
import type { EditorialPlanV1, PlanChapterV1 } from '../contracts/plan'

const edition = {
  editionId: 'insed-1',
  reportId: 'insrp-1',
  organizationId: 'org-1',
  version: 1,
  audience: 'client',
  state: 'issued',
  periodTimeZone: 'America/Santiago',
  periodStartUtc: '2026-08-01T04:00:00.000Z',
  periodEndUtc: '2026-09-01T04:00:00.000Z',
  issuedAt: '2026-09-03T12:00:00.000Z'
} as never

const report = {
  reportId: 'insrp-1',
  reportCode: 'EO-INS-000014',
  organizationId: 'org-1',
  title: 'Informe de visibilidad y entrega',
  status: 'active'
} as never

const chapter = (over: Partial<PlanChapterV1> = {}): PlanChapterV1 =>
  ({
    chapterId: 'seo',
    module: 'seo',
    title: 'Visibilidad orgánica',
    claims: [{ claimId: 'c1', text: 'La visibilidad creció en el período', factIds: [] }],
    charts: [],
    tables: [],
    limits: [],
    ...over
  }) as PlanChapterV1

const plan = (over: Partial<EditorialPlanV1> = {}): EditorialPlanV1 =>
  ({
    planVersion: 'editorial_plan_v1',
    locale: 'es-CL',
    executiveSummary: [],
    chapters: [chapter()],
    actions: [],
    limits: [],
    methodology: [],
    references: [],
    ...over
  }) as EditorialPlanV1

describe('buildInsightReportPlanInput', () => {
  it('abre con la portada y cierra con los límites', () => {
    const types = buildInsightReportPlanInput({ edition, report, plan: plan() }).slides.map(s => s.contentType)

    expect(types[0]).toBe('report-cover')
    expect(types.at(-1)).toBe('report-limits')
  })

  it('numera los folios de corrido, que es lo que permite resolver el índice sin segunda pasada', () => {
    const input = buildInsightReportPlanInput({ edition, report, plan: plan() })

    expect(input.slides.map(s => (s.slots as { pageFolio: string }).pageFolio)).toEqual(
      input.slides.map((_s, i) => String(i + 1))
    )
  })

  it('NO omite un capítulo sin figura: lo narra', () => {
    const input = buildInsightReportPlanInput({ edition, report, plan: plan() })

    expect(input.slides.some(s => s.contentType === 'report-narrative')).toBe(true)
  })

  it('reparte una tabla larga en varias páginas y declara la continuación', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`/p${i}`, String(i), '+1%'])

    const withTable = plan({
      chapters: [
        chapter({ tables: [{ tableId: 't1', title: 'Páginas', columns: ['Página', 'Impresiones', 'Var'], rows }] as never })
      ]
    })

    const tablePages = buildInsightReportPlanInput({ edition, report, plan: withTable }).slides.filter(
      s => s.contentType === 'report-table'
    )

    expect(tablePages.length).toBe(3)
    expect((tablePages[0]!.slots as Record<string, unknown>).continuationLabel).toBeUndefined()
    expect((tablePages[1]!.slots as Record<string, unknown>).continuationLabel).toBeDefined()
  })

  it('ninguna página de tabla excede la capacidad declarada del molde', () => {
    const rows = Array.from({ length: 60 }, (_, i) => [`/p${i}`, String(i), '+1%'])

    const withTable = plan({
      chapters: [chapter({ tables: [{ tableId: 't1', title: 'T', columns: ['a', 'b', 'c'], rows }] as never })]
    })

    for (const page of buildInsightReportPlanInput({ edition, report, plan: withTable }).slides) {
      if (page.contentType !== 'report-table') continue
      expect((page.slots as { tableRows: unknown[] }).tableRows.length).toBeLessThanOrEqual(26)
    }
  })

  it('emite la página de cierre incluso sin límites: declarar que no los hay también informa', () => {
    const closing = buildInsightReportPlanInput({ edition, report, plan: plan({ limits: [] }) }).slides.filter(
      s => s.contentType === 'report-limits'
    )

    expect(closing).toHaveLength(1)
    expect((closing[0]!.slots as { limits: unknown[] }).limits).toHaveLength(1)
  })

  it('separa el límite en sujeto y causa, porque «sin datos» a secas no dice qué conectar', () => {
    const input = buildInsightReportPlanInput({ edition, report, plan: plan({ limits: ['ico: sin datos.'] }) })
    const closing = input.slides.find(s => s.contentType === 'report-limits')!

    expect((closing.slots as { limits: { subject: string; cause: string }[] }).limits[0]).toEqual({
      subject: 'ico',
      cause: 'sin datos'
    })
  })

  it('rechaza un plan sin capítulos en vez de componer un informe vacío', () => {
    expect(() => buildInsightReportPlanInput({ edition, report, plan: plan({ chapters: [] }) })).toThrow(
      InsightsRenderRejectedError
    )
  })

  it('rechaza una afirmación que excede el molde en vez de recortarla', () => {
    const withLong = plan({
      chapters: [chapter({ claims: [{ claimId: 'c', text: 'x'.repeat(200), factIds: [] }] })]
    })

    expect(() => buildInsightReportPlanInput({ edition, report, plan: withLong })).toThrow(/No se recorta/)
  })

  it('rechaza un capítulo sin ninguna afirmación', () => {
    expect(() => buildInsightReportPlanInput({ edition, report, plan: plan({ chapters: [chapter({ claims: [] })] }) })).toThrow(
      /no tiene ninguna afirmación/
    )
  })
})
