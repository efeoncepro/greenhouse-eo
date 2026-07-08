import { describe, expect, it, vi } from 'vitest'

import { runQuestionGeneration, runResponseScoring } from './providers'

// TASK-1361 — adapter honest-degrading: NUNCA throwea; devuelve status + datos/vacío. Mock del
// provider (deps injection) → CI-safe, sin llamar a Gemini/Anthropic reales.

const genInput = { competencyKey: 'seo', competencyName: 'SEO', competencyCategory: 'skill', level: 'nociones' as const, count: 2 }
const scoreInput = { competencyKey: 'leadership', competencyName: 'Liderazgo', level: 'intermedio', questionPrompt: 'q', rubric: {}, candidateAnswer: 'a' }

describe('runQuestionGeneration (honest-degrade)', () => {
  it('not_configured cuando el provider no está configurado', async () => {
    const res = await runQuestionGeneration(genInput, { isConfigured: () => false, generate: vi.fn() as never })

    expect(res.status).toBe('not_configured')
    expect(res.drafts).toEqual([])
  })

  it('provider_error cuando el generate lanza (no propaga la excepción)', async () => {
    const res = await runQuestionGeneration(genInput, {
      isConfigured: () => true,
      generate: (async () => {
        throw new Error('boom')
      }) as never,
    })

    expect(res.status).toBe('provider_error')
    expect(res.drafts).toEqual([])
  })

  it('ok con drafts sanitizados cuando el provider responde bien', async () => {
    const res = await runQuestionGeneration(genInput, {
      isConfigured: () => true,
      generate: (async () => ({
        data: { questions: [{ type: 'single_choice', prompt: '¿Qué es un title tag?', answerKey: { correct: 'b' } }] },
        model: 'gemini-2.5-flash-lite',
        usage: { inputTokens: 10, outputTokens: 5 },
      })) as never,
    })

    expect(res.status).toBe('ok')
    expect(res.drafts).toHaveLength(1)
    expect(res.drafts[0].competencyKey).toBe('seo')
  })

  it('schema_invalid cuando el provider responde una forma inservible', async () => {
    const res = await runQuestionGeneration(genInput, {
      isConfigured: () => true,
      generate: (async () => ({ data: { questions: 'nope' }, model: 'gemini-2.5-flash-lite', usage: {} })) as never,
    })

    expect(res.status).toBe('schema_invalid')
    expect(res.drafts).toEqual([])
  })
})

describe('runResponseScoring (honest-degrade)', () => {
  it('not_configured cuando el provider no está configurado', async () => {
    const res = await runResponseScoring(scoreInput, { isConfigured: async () => false, generate: vi.fn() as never })

    expect(res.status).toBe('not_configured')
    expect(res.score).toBeNull()
  })

  it('ok con score clampeado cuando el provider responde', async () => {
    const res = await runResponseScoring(scoreInput, {
      isConfigured: async () => true,
      generate: (async () => ({
        data: { score: 88, rationale: 'buena respuesta' },
        model: 'claude-sonnet-5',
        stopReason: 'tool_use',
        usage: { inputTokens: 20, outputTokens: 8 },
      })) as never,
    })

    expect(res.status).toBe('ok')
    expect(res.score?.score).toBe(88)
    expect(res.model).toBe('claude-sonnet-5')
  })
})
