import { describe, expect, it } from 'vitest'

import { sanitizeQuestionDrafts, sanitizeResponseScore } from './contracts'

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
    const out = sanitizeResponseScore({ score: 150, rationale: 'buena respuesta', perCriterion: [{ criterion: 'claridad', score: -5 }] })

    expect(out).not.toBeNull()
    expect(out?.score).toBe(100)
    expect(out?.perCriterion?.[0]).toEqual({ criterion: 'claridad', score: 0, note: undefined })
  })

  it('devuelve null sin score usable o sin rationale', () => {
    expect(sanitizeResponseScore(null)).toBeNull()
    expect(sanitizeResponseScore({ score: 50 })).toBeNull()
    expect(sanitizeResponseScore({ rationale: 'x' })).toBeNull()
  })
})
