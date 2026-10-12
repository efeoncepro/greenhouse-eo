import { describe, expect, it, vi } from 'vitest'

import { GH_INSIGHTS } from '@/lib/copy/insights'

import type { EvidenceContentScopeV1, EvidenceFactV1, EvidenceSnapshotContentV1, EvidenceSourceV1 } from '../contracts/evidence'
import { buildDeterministicPlan } from './deterministic-planner'
import { validateEditorialPlan } from './plan-validation'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

/**
 * TASK-2033 — el plan declara el alcance de contenido: la línea «Qué mide este informe» nombra el contenido medido,
 * una afirmación lo pone frente al sitio completo citando sus hechos, y el tráfico estimado sale como límite. Sin
 * alcance sellado, el plan es exactamente el de antes.
 */

const CURRENT = { start: '2026-09-01', endExclusive: '2026-10-01', granularity: 'period' as const, partial: false }
const PREVIOUS = { start: '2026-08-01', endExclusive: '2026-09-01', granularity: 'period' as const, partial: false }

const SCOPE: EvidenceContentScopeV1 = {
  version: 1,
  label: 'Artículos, tutoriales, inspiración y guías',
  rules: [{ kind: 'prefix', path: '/articulos' }, { kind: 'prefix', path: '/tutoriales' }]
}

const seo = (metricId: string, window: typeof CURRENT, value: number, unit: EvidenceFactV1['unit'], extra: Partial<EvidenceFactV1> = {}): EvidenceFactV1 => ({
  factVersion: 'evidence_fact_v1',
  factId: `seo.${metricId}.${window.start}_${window.endExclusive}`,
  module: 'seo',
  metricId,
  label: GH_INSIGHTS.metrics[metricId] ?? { clicks: 'Clics orgánicos', impressions: 'Impresiones' }[metricId] ?? metricId,
  value,
  unit,
  numerator: null,
  denominator: null,
  population: 'p',
  source: 'greenhouse_growth.seo_gsc_daily',
  method: { name: 'gsc_window_aggregate', version: 'seo_measurement_v1' },
  coverage: { kind: 'complete', ratio: 1, populationSize: 30 },
  freshness: { asOf: '2026-09-30' },
  observation: 'observed',
  window,
  evidenceRef: 'ref',
  comparisonFactId: window === CURRENT ? `seo.${metricId}.${PREVIOUS.start}_${PREVIOUS.endExclusive}` : null,
  channelId: 'google',
  ...extra
})

const source = (contentScope?: EvidenceContentScopeV1): EvidenceSourceV1 => ({
  module: 'seo',
  adapterVersion: 'seo_report_adapter_v1',
  reader: 'readSeoOverviewKpisForWindow',
  asOf: '2026-09-30',
  method: { name: 'gsc_window_aggregate', version: 'seo_measurement_v1' },
  coverage: { kind: 'complete', ratio: 1, populationSize: 30 },
  servedWindow: CURRENT,
  ...(contentScope ? { contentScope } : {})
})

/** Cifras reales de Berel medidas el 2026-10-12: contenido en alcance 661 → 799; propiedad completa 16.390 → 14.156. */
const scopedSnapshot = (): EvidenceSnapshotContentV1 => ({
  facts: [
    seo('clicks', CURRENT, 799, 'count'),
    seo('clicks', PREVIOUS, 661, 'count'),
    seo('impressions', CURRENT, 168690, 'count'),
    seo('impressions', PREVIOUS, 144492, 'count'),
    seo('site_total.clicks', CURRENT, 14156, 'count', { role: 'reference' }),
    seo('site_total.clicks', PREVIOUS, 16390, 'count', { role: 'reference' }),
    seo('site_total.impressions', CURRENT, 799610, 'count', { role: 'reference' }),
    seo('site_total.impressions', PREVIOUS, 868507, 'count', { role: 'reference' })
  ],
  sources: [source(SCOPE), { ...source(SCOPE), servedWindow: PREVIOUS }],
  rejections: [{ module: 'seo', metricId: 'organic_etv', reason: 'outside_content_scope', detail: 'ETV se estima para el dominio completo; la edición mide el alcance de contenido v1' }]
})

const plan = (snapshot: EvidenceSnapshotContentV1) => buildDeterministicPlan(snapshot, { modules: ['seo'], locale: 'es-CL', editorialV2: true })

describe('TASK-2033 — el plan declara el alcance de contenido', () => {
  it('«Qué mide este informe» nombra el contenido medido, sin cifras, y el plan valida completo', () => {
    const snapshot = scopedSnapshot()
    const built = plan(snapshot)

    expect(built.scopeLines).toEqual(['Visibilidad orgánica de artículos, tutoriales, inspiración y guías: sus clics, impresiones y posiciones en Google, sin el resto del sitio.'])
    expect(built.scopeLines![0]).not.toMatch(/\d/)
    expect(built.chapters[0]!.opening!.text).toBe(GH_INSIGHTS.contentScope.chapterOpening)
    expect(validateEditorialPlan(built, snapshot)).toEqual([])
  })

  it('una afirmación pone el contenido medido frente al sitio completo y cita los dos hechos', () => {
    const snapshot = scopedSnapshot()
    const built = plan(snapshot)
    const context = built.chapters[0]!.claims.find(item => item.claimId === 'claim.seo.content_scope_context')!

    // 661 → 799 = +20,9 %; 16.390 → 14.156 = −13,6 %.
    expect(context.text).toBe('Los clics de este contenido variaron +20,9 % frente al período anterior; los de todo el sitio, -13,6 %.')
    expect(context.factIds).toEqual(['seo.clicks.2026-09-01_2026-10-01', 'seo.site_total.clicks.2026-09-01_2026-10-01'])
    expect(context.role).toBe('finding')
    // Es la última afirmación del capítulo: contexto de lo anterior, no su titular.
    expect(built.chapters[0]!.claims.at(-1)!.claimId).toBe('claim.seo.content_scope_context')
  })

  it('el sitio completo nunca es un hallazgo propio, ni va a tablas ni a las referencias', () => {
    const built = plan(scopedSnapshot())
    const chapter = built.chapters[0]!
    const siteIds = new Set(['seo.site_total.clicks.2026-09-01_2026-10-01', 'seo.site_total.impressions.2026-09-01_2026-10-01'])

    expect(chapter.claims.filter(item => item.claimId !== 'claim.seo.content_scope_context').some(item => item.factIds.some(id => siteIds.has(id)))).toBe(false)
    expect(chapter.tables.flatMap(table => table.rows).some(row => row.some(cell => cell === GH_INSIGHTS.metrics['site_total.clicks']))).toBe(false)
    expect(built.references.some(reference => reference.referenceId.includes('site_total'))).toBe(false)
    // Las cifras del capítulo son las del alcance: 799 clics, no 14.156.
    expect(JSON.stringify(chapter.claims.filter(item => item.claimId !== 'claim.seo.content_scope_context'))).not.toContain('14.156')
  })

  it('el tráfico estimado sale como límite en lenguaje del lector, no como «no forma parte»', () => {
    const built = plan(scopedSnapshot())

    expect(built.limits).toContain(`${GH_INSIGHTS.metrics.organic_etv}: ${GH_INSIGHTS.readerLimits.outsideContentScope}.`)
    expect(built.limits.join(' ')).not.toContain(GH_INSIGHTS.rejections.outside_content_scope)
  })

  it('sin período anterior en el sitio completo no hay lectura de contexto (nunca una variación contra nada)', () => {
    const snapshot = scopedSnapshot()

    snapshot.facts = snapshot.facts.filter(fact => !(fact.metricId.startsWith('site_total.') && fact.window === PREVIOUS)).map(fact => (fact.metricId.startsWith('site_total.') ? { ...fact, comparisonFactId: null } : fact))

    const built = plan(snapshot)

    expect(built.chapters[0]!.claims.some(item => item.claimId === 'claim.seo.content_scope_context')).toBe(false)
    expect(validateEditorialPlan(built, snapshot)).toEqual([])
  })

  it('sin alcance sellado, la línea, la entrada y las afirmaciones son las de siempre', () => {
    const snapshot: EvidenceSnapshotContentV1 = {
      facts: [seo('clicks', CURRENT, 14156, 'count'), seo('clicks', PREVIOUS, 16390, 'count'), seo('impressions', CURRENT, 799610, 'count'), seo('impressions', PREVIOUS, 868507, 'count')],
      sources: [source()],
      rejections: []
    }

    const built = plan(snapshot)

    expect(built.scopeLines).toEqual([GH_INSIGHTS.scopeLines.seo])
    expect(built.chapters[0]!.opening!.text).toBe(GH_INSIGHTS.chapterOpenings.seo)
    expect(built.chapters[0]!.claims.some(item => item.claimId === 'claim.seo.content_scope_context')).toBe(false)
    expect(validateEditorialPlan(built, snapshot)).toEqual([])
  })

  it('cuando el nombre de la página no cabe en la lectura de su figura, la frase sin nombre sigue bien construida', () => {
    const snapshot = scopedSnapshot()

    const page = (rank: string, label: string, window: typeof CURRENT, value: number): EvidenceFactV1 => ({
      ...seo('driver.page.clicks', window, value, 'count'),
      factId: `seo.driver.page.clicks.${window.start}_${window.endExclusive}.${rank}`,
      label,
      comparisonFactId: window === CURRENT ? `seo.driver.page.clicks.${PREVIOUS.start}_${PREVIOUS.endExclusive}.${rank}` : null,
      dimension: { page: label, rank }
    })

    // Caso real de Berel (septiembre de 2026): la guía de la raíz, cuyo nombre no cabe en la conclusión de la figura.
    snapshot.facts.push(
      page('1', '…/pintura-y-barniz-para-madera-como-elegir', CURRENT, 82),
      page('1', '…/pintura-y-barniz-para-madera-como-elegir', PREVIOUS, 14),
      page('2', '/articulos/como-pintar-una-pared', CURRENT, 60),
      page('2', '/articulos/como-pintar-una-pared', PREVIOUS, 40)
    )

    const built = plan(snapshot)
    const reading = built.chapters[0]!.readings!.find(item => item.chartId === 'chart.seo.drivers.page')!

    expect(reading.conclusion!.text).toBe('La página que más cambió subió de 14 a 82 clics (+485,7 %).')
    expect(reading.conclusion!.text).not.toContain('fue subió')
    // El hallazgo del capítulo, que no tiene ese tope, la nombra completa.
    expect(built.chapters[0]!.claims.some(item => item.text.startsWith('La página que más cambió fue «…/pintura-y-barniz-para-madera-como-elegir»'))).toBe(true)
    expect(validateEditorialPlan(built, snapshot)).toEqual([])
  })

  it('con contrato v1 (sin editorial v2) el alcance no cambia la forma del plan', () => {
    const built = buildDeterministicPlan(scopedSnapshot(), { modules: ['seo'], locale: 'es-CL' })

    expect(built.scopeLines).toBeUndefined()
    expect(built.chapters[0]!.claims.some(item => item.claimId === 'claim.seo.content_scope_context')).toBe(false)
  })
})
