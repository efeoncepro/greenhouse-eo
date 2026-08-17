import { describe, expect, it } from 'vitest'

import { sanitizeQuestionDrafts, sanitizeResponseScore, summarizeCriterionContribution } from './contracts'

// TASK-1361 — sanitizers PUROS (frontera de enforcement). CI-safe (sin PG, sin provider).

describe('sanitizeQuestionDrafts', () => {
  const ctx = { competencyKey: 'seo', level: 'nociones' }

  it('inyecta competencyKey+level y conserva los drafts válidos', () => {
    const out = sanitizeQuestionDrafts(
      { questions: [{ type: 'single_choice', prompt: '¿Qué es un title tag?', answerKey: { correct: 'b' } }] },
      ctx,
    )

    expect(out).toHaveLength(1)
    expect(out[0].competencyKey).toBe('seo')
    expect(out[0].level).toBe('nociones')
    expect(out[0].type).toBe('single_choice')
  })

  it('descarta drafts sin type válido o sin prompt', () => {
    const out = sanitizeQuestionDrafts(
      { questions: [{ type: 'no_existe', prompt: 'x' }, { type: 'open_text', prompt: '' }, { type: 'open_text', prompt: 'ok' }] },
      ctx,
    )

    expect(out).toHaveLength(1)
    expect(out[0].prompt).toBe('ok')
  })

  it('devuelve [] ante forma inservible o nivel inválido', () => {
    expect(sanitizeQuestionDrafts(null, ctx)).toEqual([])
    expect(sanitizeQuestionDrafts({ questions: 'nope' }, ctx)).toEqual([])
    expect(sanitizeQuestionDrafts({ questions: [{ type: 'open_text', prompt: 'ok' }] }, { competencyKey: 'seo', level: 'invalido' })).toEqual([])
  })
})

describe('sanitizeResponseScore', () => {
  it('clampa el score a 0–100 y conserva rationale + perCriterion', () => {
    const out = sanitizeResponseScore({
      score: 150,
      rationale: 'buena respuesta',
      perCriterion: [{ criterion: 'claridad', weight: 100, score: -5 }],
    })

    expect(out).not.toBeNull()
    expect(out?.score).toBe(100)
    expect(out?.perCriterion?.[0]).toEqual({ criterion: 'claridad', weight: 100, score: 0, note: undefined })
  })

  it('devuelve null sin score usable o sin rationale', () => {
    expect(sanitizeResponseScore(null)).toBeNull()
    expect(sanitizeResponseScore({ score: 50 })).toBeNull()
    expect(sanitizeResponseScore({ rationale: 'x' })).toBeNull()
  })
})

// ── Escala declarada de perCriterion (delta 2026-08-17, prompt `...scoring.v2`) ──

describe('sanitizeResponseScore — escala declarada de perCriterion', () => {
  it('valida la escala del contrato: los aportes suman el score global y cada uno respeta su peso', () => {
    const out = sanitizeResponseScore({
      score: 91,
      rationale: 'Respuesta sólida.',
      perCriterion: [
        { criterion: 'estado real', weight: 25, score: 18 },
        { criterion: 'plan', weight: 25, score: 25 },
        { criterion: 'riesgo', weight: 25, score: 25 },
        { criterion: 'estructura', weight: 25, score: 23 },
      ],
    })

    expect(out?.perCriterion).toHaveLength(4)

    const summary = summarizeCriterionContribution(out?.perCriterion)

    expect(summary.contribution).toBe(91)
    expect(summary.weightTotal).toBe(100)
    expect(summary.impliedScore).toBe(91)
  })

  it('reparte el peso en partes iguales cuando el modelo no lo declara', () => {
    const out = sanitizeResponseScore({
      score: 50,
      rationale: 'ok',
      perCriterion: [
        { criterion: 'a', score: 25 },
        { criterion: 'b', score: 25 },
        { criterion: 'c', score: 0 },
        { criterion: 'd', score: 0 },
      ],
    })

    expect(out?.perCriterion?.map(c => c.weight)).toEqual([25, 25, 25, 25])
    expect(summarizeCriterionContribution(out?.perCriterion).impliedScore).toBe(50)
  })

  it('acota un criterio calificado en escala propia 0–100 a su peso (drift del prompt v1)', () => {
    const out = sanitizeResponseScore({
      score: 18,
      rationale: 'floja',
      // El modelo v1 mezclaba escalas: 90 sobre un criterio de 25 puntos.
      perCriterion: [
        { criterion: 'regulación', weight: 25, score: 90 },
        { criterion: 'acciones', weight: 25, score: 5 },
      ],
    })

    expect(out?.perCriterion?.[0].score).toBe(25)
  })

  it('renormaliza cuando los pesos declarados no suman 100', () => {
    const summary = summarizeCriterionContribution([
      { criterion: 'a', weight: 30, score: 30 },
      { criterion: 'b', weight: 20, score: 10 },
    ])

    // 40 aportes sobre 50 puntos disponibles → 80 en escala 0–100.
    expect(summary.impliedScore).toBe(80)
  })

  it('sin criterios no implica score alguno (el router no puede inventar contradicción)', () => {
    expect(summarizeCriterionContribution(undefined).impliedScore).toBeNull()
    expect(summarizeCriterionContribution([]).impliedScore).toBeNull()
  })
})
