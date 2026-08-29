import { describe, expect, it } from 'vitest'

import { reportLensCoverage } from '../../lens-coverage'
import { WORK_QUEUE_NOT_FIGURES, buildWorkQueueProvenance, type ReadSeoWorkQueueResult } from '../reader'

/**
 * TASK-1785 — la deuda de procedencia de `work-queue` quemada: cada hoja numérica del DTO
 * tiene EXACTAMENTE un dueño o está declarada como no-cifra.
 *
 * ⚠️ El fixture está tipado contra el resultado real del reader y puebla A MANO todos los
 * campos OPCIONALES del breakdown (`competingPages`, `mainPageShare`, `snippetCeilingClicks`,
 * `alsoSurfacedBy`): el caminador corre sobre fixtures, así que un opcional ausente es una
 * hoja que el guard no llega a ver — la mitigación declarada en `lens-coverage.ts`. Un campo
 * numérico REQUERIDO nuevo rompe este fixture en `tsc` y obliga a declararle dueño.
 */

type OkResult = Extract<ReadSeoWorkQueueResult, { ok: true }>

const COMPUTED_AT = '2026-08-29T20:56:57.000Z'

const fixture: OkResult = {
  ok: true,
  snapshot: {
    snapshotId: 'seowqs-1',
    organizationId: 'org-1',
    seoTargetId: 'seot-1',
    priorityScoreVersion: 'incremental-clicks-v2',
    windowDays: 28,
    itemCount: 2,
    computedAt: COMPUTED_AT,
    expiresAt: '2026-08-30T22:56:57.000Z'
  },
  items: [
    {
      itemId: 'seowqi-1',
      rank: 1,
      origin: 'gsc_striking_distance',
      keyword: 'pinturas',
      targetUrl: 'https://example.com/pinturas',
      recommendedVerb: 'optimize',
      scoreBasis: 'measured_incremental_clicks',
      scoreBand: 1,
      priorityScore: 72.14,
      breakdown: {
        impressions: 5000,
        clicks: 40,
        currentCtr: 0.008,
        weightedPosition: 9.3,
        targetPosition: 5,
        expectedCtrAtTarget: 0.052,
        ctrCurveSource: 'org_measured',
        curveSampleImpressions: 1200,
        curveSampleClicks: 12,
        windowDays: 28,
        incrementalClicks: 72.14,
        basisReason: 'demanda medida con curva utilizable',
        alsoSurfacedBy: [{ origin: 'aeo_gap', verb: 'optimize' }],
        snippetCeilingClicks: 31
      },
      evidenceRef: 'seo:gsc_query:pinturas',
      sourceScoreVersion: null
    },
    {
      itemId: 'seowqi-2',
      rank: 2,
      origin: 'consolidation',
      keyword: 'sellador',
      targetUrl: null,
      recommendedVerb: 'consolidate',
      scoreBasis: 'measured_without_curve',
      scoreBand: 2,
      priorityScore: null,
      breakdown: {
        impressions: 800,
        clicks: 3,
        currentCtr: null,
        weightedPosition: null,
        targetPosition: 5,
        expectedCtrAtTarget: null,
        ctrCurveSource: 'unusable',
        curveSampleImpressions: null,
        curveSampleClicks: null,
        windowDays: 28,
        incrementalClicks: null,
        basisReason: 'canibalizada; sin curva utilizable',
        competingPages: 3,
        mainPageShare: 0.41
      },
      evidenceRef: 'seo:gsc_query:sellador',
      sourceScoreVersion: null
    }
  ],
  originHealth: [
    {
      origin: 'gsc_striking_distance',
      state: 'ok',
      reason: null,
      asOf: '2026-08-28',
      itemCount: 2
    }
  ],
  priorityScoreVersion: 'incremental-clicks-v2',
  asOf: COMPUTED_AT,
  staleness: 'fresh',
  nextCursor: null,
  provenance: buildWorkQueueProvenance(COMPUTED_AT)
}

describe('TASK-1785 — cobertura de procedencia del DTO de la cola', () => {
  it('cada hoja numérica tiene exactamente un dueño, y toda sección con cifras lleva as-of', () => {
    const report = reportLensCoverage({
      dto: fixture,
      provenance: fixture.provenance,
      notFigures: [...WORK_QUEUE_NOT_FIGURES]
    })

    expect(report.unclaimed).toEqual([])
    expect(report.ambiguous).toEqual([])
    expect(report.figuresWithoutAsOf).toEqual([])
  })

  it('lo observado es ● gsc y lo modelado es ◑ own_ctr_model — jamás una lente única por fila', () => {
    const provenance = buildWorkQueueProvenance(COMPUTED_AT)
    const byLens = new Set(provenance.map(entry => entry.lens))

    // El caso «◑ junto a ● en la MISMA fila»: si esto colapsa a una sola lente, alguien
    // rotuló el resultado entero — el defecto que la lista de procedencias existe para evitar.
    expect(byLens).toEqual(new Set(['measured', 'estimated']))

    const modelSections = provenance.filter(entry => entry.source === 'own_ctr_model').map(entry => entry.section)

    // El score y sus derivados del modelo JAMÁS se rotulan gsc: insumos medidos, resultado
    // estimado.
    expect(modelSections.some(section => section.includes('priorityScore'))).toBe(true)
    expect(modelSections.some(section => section.includes('snippetCeilingClicks'))).toBe(true)
  })

  it('sin snapshot no se fabrica procedencia', () => {
    expect(buildWorkQueueProvenance(null)).toEqual([])
  })
})
