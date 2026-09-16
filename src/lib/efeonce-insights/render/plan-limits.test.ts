import { describe, expect, it } from 'vitest'

import type { EditorialPlanV1 } from '../contracts/plan'

import { dedupeLimitLines, withDedupedLimits } from './plan-limits'

describe('dedupeLimitLines', () => {
  it('colapsa el caso real del canary: un rechazo por métrica del mismo módulo', () => {
    // Nace de `snapshot.rejections.map(r => \`${r.module}: ${TEXT[r.reason]}.\`)`, que descarta el
    // detail: cuatro rechazos no_data de ICO producen cuatro líneas idénticas.
    const limits = ['ico: sin datos.', 'ico: sin datos.', 'ico: sin datos.', 'ico: sin datos.']

    expect(dedupeLimitLines(limits)).toEqual(['ico: sin datos.'])
  })

  it('preserva el orden de primera aparición y no colapsa módulos distintos', () => {
    const limits = ['seo: sin datos.', 'ico: sin datos.', 'seo: sin datos.', 'aeo: ventana no soportada.']

    expect(dedupeLimitLines(limits)).toEqual([
      'seo: sin datos.',
      'ico: sin datos.',
      'aeo: ventana no soportada.'
    ])
  })

  it('trata como idénticas las que sólo difieren en espacio al borde, y descarta vacías', () => {
    expect(dedupeLimitLines(['ico: sin datos.', 'ico: sin datos. ', '', '   '])).toEqual(['ico: sin datos.'])
  })

  it('no inventa ni reordena cuando no hay duplicados', () => {
    const limits = ['seo: sin datos.', 'aeo: datos insuficientes.']

    expect(dedupeLimitLines(limits)).toEqual(limits)
  })
})

const planWith = (limits: string[], chapterLimits: string[]): EditorialPlanV1 =>
  ({
    planVersion: 'editorial_plan_v1',
    locale: 'es-CL',
    executiveSummary: [],
    chapters: [{ chapterId: 'chapter.ico', module: 'ico', title: 'ICO', claims: [], charts: [], tables: [], limits: chapterLimits }],
    actions: [],
    limits,
    methodology: [],
    references: []
  }) as unknown as EditorialPlanV1

describe('withDedupedLimits', () => {
  it('deduplica arriba y en cada capítulo', () => {
    const plan = planWith(['ico: sin datos.', 'ico: sin datos.'], ['ico: sin datos.', 'ico: sin datos.'])
    const rendered = withDedupedLimits(plan)

    expect(rendered.limits).toEqual(['ico: sin datos.'])
    expect(rendered.chapters[0]!.limits).toEqual(['ico: sin datos.'])
  })

  it('NO muta el plan congelado', () => {
    const plan = planWith(['ico: sin datos.', 'ico: sin datos.'], [])

    withDedupedLimits(plan)

    // El plan sellado es inmutable por contrato: el render trabaja sobre una copia.
    expect(plan.limits).toHaveLength(2)
  })
})
