import { describe, expect, it, vi } from 'vitest'

import type { EvidenceFactV1, EvidenceSnapshotContentV1 } from '../contracts/evidence'
import type { EditorialPlanV1 } from '../contracts/plan'
import { buildDeterministicPlan } from './deterministic-planner'
import { extractNumberTokens, formatDeltaPoints } from './format'
import { validateEditorialPlan } from './plan-validation'

vi.mock('server-only', () => ({}))

/**
 * TASK-1888 Slice 2 — contrato editorial v2: los campos nuevos pasan por la MISMA regla de cifras, un plan v1 sellado
 * valida igual, y la variación de una métrica en porcentaje se imprime en puntos porcentuales.
 */

const fact = (overrides: Partial<EvidenceFactV1> & Pick<EvidenceFactV1, 'factId' | 'metricId' | 'value' | 'unit'>): EvidenceFactV1 => ({
  factVersion: 'evidence_fact_v1',
  module: 'ico',
  label: overrides.metricId,
  numerator: null,
  denominator: null,
  population: 'p',
  source: 's',
  method: { name: 'ico_engine_monthly', version: '1' },
  coverage: { kind: 'complete', ratio: 1, populationSize: null },
  freshness: { asOf: '2026-08-31' },
  observation: 'observed',
  window: { start: '2026-08-01', endExclusive: '2026-08-01', granularity: 'month', partial: false },
  evidenceRef: 'ref',
  comparisonFactId: null,
  ...overrides
})

// Caso Sky (EO-INS-000022, 2026-09-25): OTD 80,1 % → 81,9 % salió «+2,2 %».
const snapshot: EvidenceSnapshotContentV1 = {
  facts: [
    fact({ factId: 'ico.otd.cur', metricId: 'otd', label: 'OTD · Sky · 2026-08', value: 81.9, unit: 'percent', numerator: 131, denominator: 160, comparisonFactId: 'ico.otd.prev' }),
    fact({ factId: 'ico.otd.prev', metricId: 'otd', label: 'OTD · Sky · 2026-07', value: 80.1, unit: 'percent', window: { start: '2026-07-01', endExclusive: '2026-07-01', granularity: 'month', partial: false } }),
    fact({ factId: 'ico.rpa.cur', metricId: 'rpa', label: 'RpA · Sky · 2026-08', value: 1.33, unit: 'ratio', comparisonFactId: 'ico.rpa.prev' }),
    fact({ factId: 'ico.rpa.prev', metricId: 'rpa', label: 'RpA · Sky · 2026-07', value: 1.44, unit: 'ratio', window: { start: '2026-07-01', endExclusive: '2026-07-01', granularity: 'month', partial: false } })
  ],
  sources: [],
  rejections: []
}

const v1Plan = () => buildDeterministicPlan(snapshot, { modules: ['ico'], locale: 'es-CL' })

const claim = (claimId: string, text: string, factIds: string[] = []) => ({ claimId, text, factIds })

const rulesOf = (plan: EditorialPlanV1) => validateEditorialPlan(plan, snapshot).map(violation => `${violation.where}:${violation.rule}`)

describe('TASK-1888 — variación en puntos porcentuales', () => {
  it('OTD 80,1 → 81,9 se imprime «+1,8 pp» y valida; RpA sigue en variación relativa', () => {
    const plan = v1Plan()
    const otd = plan.chapters[0]!.claims.find(item => item.claimId === 'claim.ico.otd.cur')!
    const rpa = plan.chapters[0]!.claims.find(item => item.claimId === 'claim.ico.rpa.cur')!

    expect(formatDeltaPoints(81.9, 80.1, 'es-CL')).toBe('+1,8 pp')
    // Berel CTR 1,83 % vs 1,87 %: nunca «0,0 pp» entre dos cifras que se ven distintas.
    expect(formatDeltaPoints(1.83, 1.87, 'es-CL')).toBe('-0,04 pp')
    expect(formatDeltaPoints(2.5, 2.5, 'es-CL')).toBe('0,0 pp')
    expect(otd.text).toBe('OTD · Sky · 2026-08: 81,9 % (período anterior 80,1 %, variación +1,8 pp).')
    expect(rpa.text).toBe('RpA · Sky · 2026-08: 1,33 (período anterior 1,44, variación -7,6 %).')
    expect(extractNumberTokens('variación +1,8 pp.')).toEqual(['+1,8 pp'])
    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
  })

  it('un plan sellado antes de TASK-1888 con la variación relativa («+2,2 %») sigue validando', () => {
    const plan = v1Plan()

    const sealed = {
      ...plan,
      chapters: plan.chapters.map(chapter => ({
        ...chapter,
        claims: chapter.claims.map(item => (item.claimId === 'claim.ico.otd.cur' ? { ...item, text: 'OTD · Sky · 2026-08: 81,9 % (período anterior 80,1 %, variación +2,2 %).' } : item))
      }))
    }

    expect(validateEditorialPlan(sealed, snapshot)).toEqual([])
  })

  it('un «pp» que no sale de los hechos se rechaza', () => {
    const plan = v1Plan()

    const tampered = { ...plan, chapters: plan.chapters.map(chapter => ({ ...chapter, claims: [claim('x', 'OTD subió +2,5 pp.', ['ico.otd.cur'])] })) }

    expect(rulesOf(tampered)).toEqual(['chapter.ico:unreferenced_number'])
  })
})

describe('TASK-1888 — campos v2 del plan bajo la misma regla de cifras', () => {
  it('un plan v1 (sin campos v2) valida igual', () => {
    const plan = v1Plan()

    expect(plan.essentials).toBeUndefined()
    expect(plan.chapters[0]!.readings).toBeUndefined()
    expect(validateEditorialPlan(plan, snapshot)).toEqual([])
  })

  it('acepta todos los campos v2 cuando cada cifra cita su hecho', () => {
    const plan = v1Plan()
    const chartId = plan.chapters[0]!.charts[0]!.chartId

    const v2: EditorialPlanV1 = {
      ...plan,
      essentials: [claim('e1', 'Entregas a tiempo: 81,9 %.', ['ico.otd.cur'])],
      scopeLines: ['Entrega: cuánto de lo comprometido llegó a tiempo.'],
      decision: claim('d', 'Decidir si se sostiene el ritmo de 81,9 %.', ['ico.otd.cur']),
      measurement: claim('m', 'Se medirá con el mismo tablero mensual.'),
      ask: claim('a', 'Confirmar las fechas de entrega del próximo ciclo.'),
      cover: { theme: 'light', source: 'auto', logoAssetId: null, logoVariant: null },
      actions: [{ actionId: 'act', text: 'Ordenar la cola de revisión.', ownerRef: null, factIds: [], impact: 3, effort: 1, weeks: '1-2' }],
      chapters: plan.chapters.map(chapter => ({
        ...chapter,
        opening: claim('o', 'Cuánto de lo comprometido se entregó a tiempo.'),
        readings: [{
          chartId,
          keyFigure: { factId: 'ico.otd.cur', value: '81,9 %', caption: claim('k', 'OTD · Sky · 2026-08, período anterior 80,1 %.', ['ico.otd.cur']) },
          meaning: claim('mean', 'Subió +1,8 pp contra julio.', ['ico.otd.cur']),
          nextStep: null
        }]
      }))
    }

    expect(validateEditorialPlan(v2, snapshot)).toEqual([])
  })

  it('rechaza una cifra no citada en cada campo nuevo', () => {
    const plan = v1Plan()
    const chartId = plan.chapters[0]!.charts[0]!.chartId
    const bad = (id: string) => claim(id, 'Mejoró 12 %.', ['ico.otd.cur'])

    const v2: EditorialPlanV1 = {
      ...plan,
      essentials: [bad('e')],
      scopeLines: ['Entrega: 3 métricas.'],
      decision: bad('d'),
      measurement: bad('m'),
      ask: bad('a'),
      chapters: plan.chapters.map(chapter => ({
        ...chapter,
        opening: bad('o'),
        readings: [{ chartId, keyFigure: { factId: 'ico.otd.cur', value: '82 %', caption: bad('k') }, conclusion: bad('c'), meaning: bad('mean'), nextStep: bad('n') }]
      }))
    }

    const reading = `chapter.ico.reading.${chartId}:unreferenced_number`

    expect(rulesOf(v2).sort()).toEqual(
      ['essentials:unreferenced_number', 'scopeLines:unreferenced_number', 'decision:unreferenced_number', 'measurement:unreferenced_number', 'ask:unreferenced_number', 'chapter.ico.opening:unreferenced_number', reading, reading, reading, reading, reading].sort()
    )
  })

  it('rechaza formas inválidas: más de 5 esenciales, lectura huérfana, acciones y portada incoherentes', () => {
    const plan = v1Plan()
    const essential = claim('e', 'Entregas a tiempo: 81,9 %.', ['ico.otd.cur'])

    const v2: EditorialPlanV1 = {
      ...plan,
      essentials: Array.from({ length: 6 }, () => essential),
      cover: { theme: 'dark', source: 'organization', logoAssetId: 'asset-1', logoVariant: 'default' },
      actions: [{ actionId: 'act', text: 'Ordenar la cola.', ownerRef: null, factIds: [], impact: 4 as 3, weeks: '3-2' }],
      chapters: plan.chapters.map(chapter => ({ ...chapter, readings: [{ chartId: 'chart.nope', meaning: claim('m', 'Sin cifras.'), nextStep: null }] }))
    }

    expect(rulesOf(v2).sort()).toEqual(['actions:invalid_field', 'actions:invalid_field', 'chapter.ico.reading.chart.nope:invalid_field', 'cover:invalid_field', 'essentials:invalid_field'].sort())
  })
})
