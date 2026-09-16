import { describe, expect, it } from 'vitest'

import type { EditorialPlanV1 } from '../contracts/plan'
import type { EvidenceSnapshotRecord, InsightEditionRecord, InsightReportRecord } from '../stores/records'

import { buildInsightDeckPlanInput } from './deck-mapper'

/**
 * TASK-1846 — el mapper V1 respeta los presupuestos del catálogo `deck-axis`, nunca trunca cifras ni
 * afirmaciones (rechaza con causa), deduplica los límites en el render y NO emite una portada de
 * propuesta. Los contratos reales de slots se ejercitan en el test del composer, no acá.
 */

const edition = (overrides: Partial<InsightEditionRecord> = {}): InsightEditionRecord =>
  ({
    editionId: 'insed-1', reportId: 'insr-1', organizationId: 'org-a', version: 2, audience: 'client', state: 'ready_for_review', failedPhase: null,
    request: { requestVersion: 'insight_request_v1', organizationId: 'org-a', modules: ['seo', 'ico'], period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' }, comparison: { kind: 'previous_period' }, audience: 'client', locale: 'es-CL', depth: 'standard', outputs: ['deck_pdf'], brand: { efeoncePackVersion: 'axis-current', clientBrandRef: null }, projectIds: [] },
    requestHash: 'h'.repeat(64), idempotencyKey: 'k', modules: ['seo', 'ico'], outputs: ['deck_pdf'], periodTimeZone: 'America/Santiago', periodStartUtc: '2026-08-01T04:00:00.000Z', periodEndUtc: '2026-09-01T04:00:00.000Z',
    supersedesEditionId: null, reviewOwnerUserId: null, issuedAt: null, issuedByUserId: null, issuedHash: null, withdrawnAt: null, createdByActorKind: 'member', createdByUserId: 'u', createdByMemberId: 'm', createdAt: 'c', updatedAt: 'u', ...overrides
  }) as InsightEditionRecord

const report: InsightReportRecord = { reportId: 'insr-1', reportCode: 'EO-INS-000001', organizationId: 'org-a', purpose: 'monthly', title: 'Berel · Informe mensual', status: 'active', createdByActorKind: 'member', createdByUserId: 'u', createdByMemberId: 'm', createdAt: 'c', updatedAt: 'u' }

const fact = (id: string, module: 'seo' | 'ico', value: number | null, unit = 'count') => ({
  factVersion: 'evidence_fact_v1', factId: id, module, metricId: id.split('.')[1] ?? id, label: `Métrica ${id}`, value, unit, numerator: null, denominator: null,
  population: 'sitio', source: 's', method: { name: 'm', version: '1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, freshness: { asOf: '2026-08-31' }, observation: 'observed',
  window: { start: '2026-08-01', endExclusive: '2026-09-01', granularity: 'period', partial: false }, evidenceRef: `ref:${id}`, comparisonFactId: null
})

const snapshot = (facts: unknown[]): EvidenceSnapshotRecord =>
  ({ snapshotId: 's1', editionId: 'insed-1', organizationId: 'org-a', retentionClass: 'std', facts, sources: [], rejections: [], asOfMin: null, asOfMax: null, snapshotHash: 'a'.repeat(64), sealedAt: 'x', createdAt: 'c', updatedAt: 'u' }) as unknown as EvidenceSnapshotRecord

const plan = (overrides: Partial<EditorialPlanV1> = {}): EditorialPlanV1 => ({
  planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], actions: [], references: [],
  chapters: [
    { chapterId: 'chapter.seo', module: 'seo', title: 'Visibilidad orgánica', claims: [
      { claimId: 'c1', text: 'Los clics subieron respecto del período previo.', factIds: ['seo.clicks.w'] },
      { claimId: 'c2', text: 'Las impresiones se mantuvieron.', factIds: ['seo.impressions.w'] },
      { claimId: 'c3', text: 'El CTR bajó levemente.', factIds: ['seo.ctr.w'] }
    ], charts: [], tables: [], limits: [] },
    { chapterId: 'chapter.ico', module: 'ico', title: 'Entrega', claims: [{ claimId: 'c4', text: 'Sin datos de entrega en el período.', factIds: [] }], charts: [], tables: [], limits: ['ico: sin datos.'] }
  ],
  limits: ['ico: sin datos.', 'ico: sin datos.', 'ico: sin datos.'],
  methodology: ['seo: reader · v1 · corte 2026-08-31'],
  ...overrides
})

describe('buildInsightDeckPlanInput', () => {
  it('abre con un divisor (nunca una portada de propuesta), KPIs para capítulos con ≥3 hechos y narrativa para el resto', () => {
    const input = buildInsightDeckPlanInput({
      edition: edition(), report, plan: plan(),
      snapshot: snapshot([fact('seo.clicks.w', 'seo', 1240), fact('seo.impressions.w', 'seo', 88000), fact('seo.ctr.w', 'seo', 1.4, 'percent')])
    })

    expect(input.artifactId).toBe('insed-1')
    expect(input.slides.map(s => s.contentType)).toEqual(['section-divider', 'several-kpis', 'narrative', 'narrative'])
    expect(input.slides.some(s => s.contentType === 'cover')).toBe(false)

    const kpis = (input.slides[1]!.slots as { kpis: Array<{ value: string; evidenceRef: string; label: string }> }).kpis

    expect(kpis).toHaveLength(3)

    // Toda cifra viaja con su evidencia (el catálogo lo exige) y cabe en el presupuesto de 8.
    for (const k of kpis) {
      expect(k.evidenceRef).toMatch(/^ref:/)
      expect(k.value.length).toBeLessThanOrEqual(8)
      expect(k.label.length).toBeLessThanOrEqual(32)
    }

    expect(kpis.map(k => k.value)).toEqual(['1.240', '88.000', '1,4%'])
  })

  it('deduplica los límites en el render sin tocar el plan congelado', () => {
    const frozen = plan()
    const input = buildInsightDeckPlanInput({ edition: edition(), report, plan: frozen, snapshot: snapshot([]) })
    const closer = input.slides.at(-1)!.slots as { body: string[] }

    expect(closer.body[0]).toBe('ico: sin datos.')
    expect(frozen.limits).toHaveLength(3)
  })

  it('rechaza con causa una afirmación que excede el presupuesto: nunca la trunca', () => {
    const long = 'x'.repeat(301)

    expect(() =>
      buildInsightDeckPlanInput({
        edition: edition(), report, snapshot: snapshot([]),
        plan: plan({ chapters: [{ chapterId: 'chapter.ico', module: 'ico', title: 'Entrega', claims: [{ claimId: 'c9', text: long, factIds: [] }], charts: [], tables: [], limits: [] }] })
      })
    ).toThrowError(/no se trunca en silencio/)
  })

  it('un plan sin capítulos no se compone', () => {
    expect(() => buildInsightDeckPlanInput({ edition: edition(), report, plan: plan({ chapters: [] }), snapshot: snapshot([]) })).toThrowError(/no tiene capítulos/)
  })
})
