import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const anthropicMock = vi.fn()

// La propuesta sólo habla con el cliente canónico de `src/lib/ai/`.
vi.mock('@/lib/ai/anthropic', () => ({
  generateStructuredAnthropic: (...args: unknown[]) => anthropicMock(...args)
}))

const { DECK_PLAN_MAX_ATTEMPTS, DeckPlanContextError, normalizeDeckPlanContext, proposeDeckPlan } = await import('../propose')

const fixtures = path.join(__dirname, 'fixtures')
const context = JSON.parse(readFileSync(path.join(fixtures, 'context-brochure.json'), 'utf8'))
const golden = JSON.parse(readFileSync(path.join(fixtures, 'golden-brochure.json'), 'utf8')) as { slides: { recipeId: string }[] }

const answer = (recipeIds: string[]) => ({
  data: { rationale: 'Portada con foto, servicio, prueba y cierre sin foto.', slides: recipeIds.map(recipeId => ({ recipeId, purpose: `Lámina ${recipeId}` })) },
  model: 'claude-sonnet-5',
  stopReason: 'tool_use',
  usage: { inputTokens: 1000, outputTokens: 200 }
})

const GOLDEN = golden.slides.map(slide => slide.recipeId)
const TWO_PHOTO_FRAMES = ['cover-brochure-cine-lines', 'proposal-cinematic-creative', 'close-brochure-horizon']

describe('proposeDeckPlan', () => {
  beforeEach(() => anthropicMock.mockReset())

  it('devuelve el plan cuando la propuesta pasa el validador (eval golden)', async () => {
    anthropicMock.mockResolvedValueOnce(answer(GOLDEN))

    const result = await proposeDeckPlan(context)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.plan.slides.map(slide => slide.recipeId)).toEqual(GOLDEN)
    expect(result.plan.document).toBe('brochure')
    expect(result.attempts).toBe(1)
    expect(result.usage).toEqual({ inputTokens: 1000, outputTokens: 200 })
    expect(anthropicMock).toHaveBeenCalledTimes(1)
  })

  it('le pasa al modelo sólo ids del catálogo del documento, como enum', async () => {
    anthropicMock.mockResolvedValueOnce(answer(GOLDEN))

    await proposeDeckPlan(context)

    const call = anthropicMock.mock.calls[0]![0] as { inputSchema: { properties: { slides: { items: { properties: { recipeId: { enum: string[] } } } } } }; prompt: string }
    const ids = call.inputSchema.properties.slides.items.properties.recipeId.enum

    expect(ids).toContain('cover-brochure-cine-lines')
    expect(ids).not.toContain('content-pricing')
    expect(ids.some(id => id.startsWith('deck.') || /^[A-Z]/.test(id))).toBe(false)
    expect(JSON.parse(call.prompt).context).toEqual(normalizeDeckPlanContext(context))
  })

  it('reintenta una vez con los issues y entrega el plan corregido (eval adversarial)', async () => {
    anthropicMock.mockResolvedValueOnce(answer(TWO_PHOTO_FRAMES)).mockResolvedValueOnce(answer(GOLDEN))

    const result = await proposeDeckPlan(context)

    expect(result.ok).toBe(true)
    expect(result.attempts).toBe(2)
    expect(result.usage).toEqual({ inputTokens: 2000, outputTokens: 400 })

    const retry = JSON.parse((anthropicMock.mock.calls[1]![0] as { prompt: string }).prompt)

    expect(retry.fixTheseIssues.map((issue: { code: string }) => issue.code)).toContain('frame-photo-must-alternate')
  })

  it('falla cerrado cuando el plan sigue inválido tras el reintento', async () => {
    anthropicMock.mockResolvedValue(answer(TWO_PHOTO_FRAMES))

    const result = await proposeDeckPlan(context)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.attempts).toBe(DECK_PLAN_MAX_ATTEMPTS)
    expect(result.issues.every(issue => issue.severity === 'error')).toBe(true)
    expect(result.rejectedPlan?.slides.map(slide => slide.recipeId)).toEqual(TWO_PHOTO_FRAMES)
    expect(anthropicMock).toHaveBeenCalledTimes(DECK_PLAN_MAX_ATTEMPTS)
  })

  it('falla cerrado, sin filtrar el error, cuando el proveedor no responde', async () => {
    anthropicMock.mockRejectedValueOnce(new Error('ANTHROPIC 529 overloaded key=sk-ant-secret'))

    const result = await proposeDeckPlan(context)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues).toEqual([expect.objectContaining({ code: 'proposal-unavailable', source: 'agent' })])
    expect(JSON.stringify(result)).not.toContain('sk-ant')
  })

  it('nunca entrega como bueno un plan con recetas inventadas', async () => {
    anthropicMock.mockResolvedValue(answer(['cover-brochure-cine-lines', 'CoverBrochure', 'close-brochure-orbit']))

    const result = await proposeDeckPlan(context)

    expect(result.ok).toBe(false)
  })
})

describe('normalizeDeckPlanContext', () => {
  it('rechaza claves fuera de la allowlist (ids de organización, montos)', () => {
    expect(() => normalizeDeckPlanContext({ ...context, organizationId: 'EO-ORG-0007' })).toThrow(DeckPlanContextError)
    expect(() => normalizeDeckPlanContext({ ...context, amount: 1000 })).toThrow(DeckPlanContextError)
  })

  it('exige documento válido y un esqueleto de secciones', () => {
    expect(() => normalizeDeckPlanContext({ ...context, document: 'memo' })).toThrow(DeckPlanContextError)
    expect(() => normalizeDeckPlanContext({ ...context, sections: [] })).toThrow(DeckPlanContextError)
  })
})
