import { describe, expect, it } from 'vitest'

import {
  buildGoldSetSample,
  computeCellQuotas,
  computeGoldSetSizing,
  DEFAULT_GOLD_SET_SIZING_INPUTS,
  goldSetCaseId,
  percentile,
  resolveGoldSetStratumBand,
  tagGoldSetDifficulty,
  type GoldSetSourceResponse,
} from './gold-set-sampling'
import { DEFAULT_AI_RUN_PROMOTION_THRESHOLDS } from './promotion-eval'

// TASK-1734 Slice 3 — el muestreo del gold set: dimensionamiento FUNDAMENTADO (no un N inventado),
// estratificación determinística, sobre-muestreo de casos difíciles, anonimización, y —lo más
// importante— que el instrumento NUNCA salga con ratings humanos fabricados.

const makeSource = (over: Partial<GoldSetSourceResponse> = {}): GoldSetSourceResponse => ({
  responseId: 'arsp-0000',
  questionId: 'qst-1',
  templateKey: 'atpl-account-manager-l2',
  templateVersion: 'v1',
  competencyKey: 'leadership',
  competencyName: 'Liderazgo',
  competencyWeight: 10,
  level: 'intermedio',
  questionPrompt: '¿Cómo lo harías?',
  rubric: { criteria: ['criterio uno'] },
  answerText: 'Una respuesta de largo razonable para no disparar la señal de respuesta corta.',
  priorHumanScore: 70,
  routerReasons: [],
  ...over,
})

const buildOptions = {
  seed: 'test-seed',
  datasetVersion: 'promotion-dataset.test.v1',
  generatedAt: '2026-08-16T00:00:00.000Z',
  notes: 'test',
  raterTrainingReference: 'docs/documentation/hr/gold-set-rubrica-de-anclaje.md',
}

describe('resolveGoldSetStratumBand', () => {
  it('usa las fronteras operativas de Talent (60/80), no las del harness (40/70)', () => {
    expect(resolveGoldSetStratumBand(0)).toBe('baja')
    expect(resolveGoldSetStratumBand(59.9)).toBe('baja')
    expect(resolveGoldSetStratumBand(60)).toBe('media')
    expect(resolveGoldSetStratumBand(79.9)).toBe('media')
    expect(resolveGoldSetStratumBand(80)).toBe('alta')
    expect(resolveGoldSetStratumBand(100)).toBe('alta')
  })
})

describe('computeGoldSetSizing', () => {
  it('deriva el N del IC 95% que el harness necesita, no de un número universal', () => {
    const sizing = computeGoldSetSizing(DEFAULT_AI_RUN_PROMOTION_THRESHOLDS)

    // p=0.85, h=0.10 ⇒ 1.96²·0.85·0.15/0.01 = 48.98 ⇒ 49
    expect(sizing.standardTotalFloor).toBe(49)
    // p=0.85, h=0.075 ⇒ 87.08 ⇒ 88
    expect(sizing.standardTotalTarget).toBe(88)
    // regla de tres: 3/0.25 = 12
    expect(sizing.perHarnessBandFloor).toBe(12)
    expect(sizing.perHarnessBandTarget).toBe(15)
    expect(sizing.rationale.join(' ')).toContain('minWithinToleranceRate')
  })

  it('un threshold más exigente exige más casos (el N no es una constante)', () => {
    const strict = computeGoldSetSizing(DEFAULT_AI_RUN_PROMOTION_THRESHOLDS, {
      ...DEFAULT_GOLD_SET_SIZING_INPUTS,
      headlineHalfWidthFloor: 0.05,
    })

    expect(strict.standardTotalFloor).toBeGreaterThan(
      computeGoldSetSizing(DEFAULT_AI_RUN_PROMOTION_THRESHOLDS).standardTotalFloor,
    )
  })

  it('el piso nunca baja del mínimo mecánico del harness por banda', () => {
    const sizing = computeGoldSetSizing(
      { ...DEFAULT_AI_RUN_PROMOTION_THRESHOLDS, minCasesPerStratum: 40 },
      { ...DEFAULT_GOLD_SET_SIZING_INPUTS, headlineHalfWidthFloor: 0.5, perStratumZeroFailureUpperBoundFloor: 0.9 },
    )

    expect(sizing.standardTotalFloor).toBeGreaterThanOrEqual(120)
  })
})

describe('computeCellQuotas', () => {
  it('reparte proporcional al peso de la competencia y nunca deja una celda en cero', () => {
    const quotas = computeCellQuotas(
      [
        { key: 'client_relationship_comm', weight: 20 },
        { key: 'delivery_coordination', weight: 7 },
      ],
      90,
    )

    // 30 por banda; 20/27 vs 7/27 del peso total
    expect(quotas.get('client_relationship_comm:baja')).toBe(22)
    expect(quotas.get('delivery_coordination:baja')).toBe(8)
    expect([...quotas.values()].every((v) => v >= 1)).toBe(true)
    expect(quotas.size).toBe(6)
  })

  it('sin pesos declarados reparte parejo', () => {
    const quotas = computeCellQuotas(
      [
        { key: 'a', weight: null },
        { key: 'b', weight: null },
      ],
      60,
    )

    expect(quotas.get('a:alta')).toBe(quotas.get('b:alta'))
  })
})

describe('tagGoldSetDifficulty', () => {
  const context = { longAnswerCharsP75: 1000, minAnswerChars: 40 }

  it('detecta respuesta corta bajo el propio umbral del router', () => {
    expect(tagGoldSetDifficulty(makeSource({ answerText: 'Sí.' }), context)).toContain('answer_short')
  })

  it('detecta larga sin sustancia (larga + banda baja)', () => {
    const tags = tagGoldSetDifficulty(
      makeSource({ answerText: 'x'.repeat(1200), priorHumanScore: 45 }),
      context,
    )

    expect(tags).toContain('answer_long_low_substance')
  })

  it('no marca larga-sin-sustancia si el score es alto (larga y buena es sólo buena)', () => {
    const tags = tagGoldSetDifficulty(
      makeSource({ answerText: 'x'.repeat(1200), priorHumanScore: 90 }),
      context,
    )

    expect(tags).not.toContain('answer_long_low_substance')
  })

  it('hereda las señales del router de riesgo', () => {
    const tags = tagGoldSetDifficulty(
      makeSource({ routerReasons: ['per_criterion_contradictory', 'answer_too_short'] }),
      context,
    )

    expect(tags).toContain('router_per_criterion_contradictory')
    expect(tags).toContain('router_answer_too_short')
  })
})

describe('percentile', () => {
  it('interpola linealmente y tolera lista vacía', () => {
    expect(percentile([], 0.75)).toBe(0)
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(25)
    expect(percentile([10], 0.75)).toBe(10)
  })
})

describe('buildGoldSetSample — límite ético', () => {
  it('JAMÁS fabrica ratings humanos: el instrumento sale con todo en null', () => {
    const sources = Array.from({ length: 12 }, (_, i) =>
      makeSource({ responseId: `arsp-${i}`, priorHumanScore: 20 + i * 7 }),
    )

    const { instrument } = buildGoldSetSample(sources, buildOptions)

    expect(instrument.cases.length).toBeGreaterThan(0)

    for (const c of instrument.cases) {
      expect(c.humanRatingA).toBeNull()
      expect(c.humanRatingB).toBeNull()
      expect(c.adjudicatedScore).toBeNull()
      expect(c.band).toBeNull()
    }

    expect(instrument._meta.ratingDesign).toBe('unrated_instrument')
    expect(instrument._meta.synthetic).toBe(false)
    expect(instrument._meta.doubleRating.independent).toBe(false)
  })

  it('el instrumento no lleva responseId, score previo ni banda de estratificación (anti-anclaje)', () => {
    const sources = [makeSource({ responseId: 'arsp-secreto', priorHumanScore: 92 })]
    const { instrument, stratificationKey } = buildGoldSetSample(sources, buildOptions)
    const serialized = JSON.stringify(instrument)

    expect(serialized).not.toContain('arsp-secreto')
    expect(serialized).not.toContain('92')
    expect(serialized).not.toContain('priorHumanScore')
    expect(serialized).not.toContain('stratumBand')

    // El mapeo vive SÓLO en la llave sellada.
    expect(stratificationKey.entries[0].responseId).toBe('arsp-secreto')
    expect(stratificationKey.entries[0].stratumBand).toBe('alta')
    expect(stratificationKey._warning).toContain('NO ABRIR')
  })

  it('redacta PII autodeclarada en el texto de la respuesta', () => {
    const sources = [
      makeSource({
        answerText: 'Escríbeme a juan.perez@ejemplo.cl o al +56 9 8765 4321. Mi RUT es 12.345.678-9.',
      }),
    ]

    const { instrument } = buildGoldSetSample(sources, buildOptions)
    const answer = instrument.cases[0].answerText

    // Lo que importa es que el dato NO esté, no con qué etiqueta quedó: el redactor canónico
    // aplica teléfono antes que RUT, así que un RUT con puntos sale como `[teléfono omitido]`.
    // Mal etiquetado, correctamente redactado.
    expect(answer).not.toContain('juan.perez@ejemplo.cl')
    expect(answer).not.toContain('8765 4321')
    expect(answer).not.toContain('12.345.678-9')
    expect(answer).toContain('[correo omitido]')
    expect(answer).toMatch(/\[(teléfono|identidad) omitid[ao]\]/)
  })
})

describe('buildGoldSetSample — estratificación', () => {
  it('es determinística: la misma semilla da exactamente la misma muestra y el mismo orden', () => {
    const sources = Array.from({ length: 20 }, (_, i) =>
      makeSource({ responseId: `arsp-${i}`, priorHumanScore: 10 + i * 4 }),
    )

    const a = buildGoldSetSample(sources, buildOptions)
    const b = buildGoldSetSample(sources, buildOptions)

    expect(a.instrument.cases.map((c) => c.id)).toEqual(b.instrument.cases.map((c) => c.id))
  })

  it('otra semilla cambia ids y orden (la muestra no está congelada por accidente)', () => {
    const sources = Array.from({ length: 20 }, (_, i) =>
      makeSource({ responseId: `arsp-${i}`, priorHumanScore: 10 + i * 4 }),
    )

    const a = buildGoldSetSample(sources, buildOptions)
    const b = buildGoldSetSample(sources, { ...buildOptions, seed: 'otra-semilla' })

    expect(a.instrument.cases.map((c) => c.id)).not.toEqual(b.instrument.cases.map((c) => c.id))
  })

  it('ignora las respuestas sin score previo: sin score no hay banda de origen', () => {
    const sources = [
      makeSource({ responseId: 'arsp-scored', priorHumanScore: 70 }),
      makeSource({ responseId: 'arsp-unscored', priorHumanScore: null }),
    ]

    const { instrument, stratificationKey } = buildGoldSetSample(sources, buildOptions)

    expect(instrument.cases).toHaveLength(1)
    expect(stratificationKey.totals.poolAvailable).toBe(2)
    expect(stratificationKey.totals.poolStratifiable).toBe(1)
  })

  it('declara el estrato incompleto en vez de rellenarlo con casos de otro estrato', () => {
    // Sólo banda alta disponible; baja y media quedan vacías.
    const sources = Array.from({ length: 3 }, (_, i) =>
      makeSource({ responseId: `arsp-${i}`, priorHumanScore: 90 }),
    )

    const { instrument, stratificationKey } = buildGoldSetSample(sources, buildOptions)

    expect(instrument.cases).toHaveLength(3)
    expect(stratificationKey.incompleteStrata).toContain('leadership:baja')
    expect(stratificationKey.incompleteStrata).toContain('leadership:media')

    const baja = stratificationKey.quotas.find((q) => q.band === 'baja')

    expect(baja?.selected).toBe(0)
    expect(baja?.shortfall).toBeGreaterThan(0)

    // Ningún caso de banda alta fue "prestado" para tapar el hueco.
    expect(stratificationKey.entries.every((e) => e.stratumBand === 'alta')).toBe(true)
  })

  it('reporta el faltante contra el piso y el objetivo fundamentados', () => {
    const sources = [makeSource({ responseId: 'arsp-1', priorHumanScore: 70 })]
    const { stratificationKey } = buildGoldSetSample(sources, buildOptions)

    expect(stratificationKey.totals.selected).toBe(1)
    expect(stratificationKey.totals.shortfallVsFloor).toBe(48)
    expect(stratificationKey.totals.shortfallVsTarget).toBe(87)
    // Los adversariales se autoran aparte: nunca se muestrean de data real.
    expect(stratificationKey.totals.adversarialPresent).toBe(0)
    expect(stratificationKey.totals.adversarialRequired).toBeGreaterThan(0)
  })

  it('prioriza los casos difíciles cuando la cuota obliga a elegir', () => {
    // Cuota de 1 para la celda (una sola competencia de peso 100, objetivo/3 → redondeo alto),
    // así que se fuerza el desempate por dificultad.
    const easy = makeSource({ responseId: 'arsp-easy', priorHumanScore: 90, competencyWeight: 100 })

    const hard = makeSource({
      responseId: 'arsp-hard',
      priorHumanScore: 90,
      competencyWeight: 100,
      routerReasons: ['per_criterion_contradictory'],
    })

    const { stratificationKey } = buildGoldSetSample([easy, hard], {
      ...buildOptions,
      // Objetivo minúsculo ⇒ cuota 1 por celda ⇒ sólo entra uno de los dos.
      thresholds: { ...DEFAULT_AI_RUN_PROMOTION_THRESHOLDS, minCasesPerStratum: 1 },
      sizingInputs: {
        headlineHalfWidthFloor: 0.9,
        headlineHalfWidthTarget: 0.9,
        perStratumZeroFailureUpperBoundFloor: 3,
        perStratumZeroFailureUpperBoundTarget: 3,
      },
    })

    const selected = stratificationKey.entries.filter((e) => e.stratumBand === 'alta')

    expect(selected).toHaveLength(1)
    expect(selected[0].responseId).toBe('arsp-hard')
    expect(selected[0].difficultyTags).toContain('router_per_criterion_contradictory')
  })
})

describe('goldSetCaseId', () => {
  it('es opaco, estable por semilla y distinto entre semillas', () => {
    expect(goldSetCaseId('s1', 'arsp-x')).toBe(goldSetCaseId('s1', 'arsp-x'))
    expect(goldSetCaseId('s1', 'arsp-x')).not.toBe(goldSetCaseId('s2', 'arsp-x'))
    expect(goldSetCaseId('s1', 'arsp-x')).toMatch(/^gs-[0-9a-f]{12}$/)
    expect(goldSetCaseId('s1', 'arsp-x')).not.toContain('arsp')
  })
})
