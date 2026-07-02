import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regresión 2026-07-02 (smoke TASK-1321): el router de brand-intelligence debe CAER al siguiente
 * provider cuando uno configurado errora en `extract()` (no sólo cuando `isConfigured()=false`).
 * Antes, Gemini (Vertex con credencial rota) se auto-declaraba configurado pero erroraba → tumbaba
 * toda la lectura aunque OpenAI/Anthropic estuvieran sanos → categoría unknown → runs saltados.
 */

const state = {
  gemini: { configured: true, extract: vi.fn() },
  openai: { configured: true, extract: vi.fn() },
  anthropic: { configured: true, extract: vi.fn() },
}

const okData = (node: string) => ({
  data: {
    whatTheBrandDoes: 'x',
    candidateCategoryNode: node,
    fineCategory: 'y',
    candidateBusinessModel: 'retail_ecommerce',
    signalsUsed: ['home'],
    confidence: 0.8,
  },
  model: 'm',
  usage: { inputTokens: 1, outputTokens: 1 },
})

vi.mock('@/lib/growth/ai-visibility/flags', () => ({ isBrandIntelligenceEnabled: () => true }))
vi.mock('../gemini-provider', () => ({
  geminiBrandIntelligenceProvider: { id: 'gemini', isConfigured: async () => state.gemini.configured, extract: (i: unknown) => state.gemini.extract(i) },
}))
vi.mock('../openai-provider', () => ({
  openAiBrandIntelligenceProvider: { id: 'openai', isConfigured: async () => state.openai.configured, extract: (i: unknown) => state.openai.extract(i) },
}))
vi.mock('../anthropic-provider', () => ({
  anthropicBrandIntelligenceProvider: { id: 'anthropic', isConfigured: async () => state.anthropic.configured, extract: (i: unknown) => state.anthropic.extract(i) },
}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const input = () => ({ brandName: 'B', websiteUrl: 'https://b.example', hubspotIndustry: null, siteContent: 'rich site content', entitySignals: null, allowedNodes: [], maxTokens: 700 })

const load = async () => (await import('../router')).runBrandIntelligence

beforeEach(() => {
  state.gemini = { configured: true, extract: vi.fn() }
  state.openai = { configured: true, extract: vi.fn() }
  state.anthropic = { configured: true, extract: vi.fn() }
})

describe('runBrandIntelligence — provider fallthrough', () => {
  it('gemini extract THROWS → falls through to openai (ok)', async () => {
    state.gemini.extract.mockRejectedValue(new Error('vertex credential broken'))
    state.openai.extract.mockResolvedValue(okData('industry:retail'))
    const run = await load()

    const r = await run(input())

    expect(r.metadata.status).toBe('ok')
    expect(r.metadata.providerId).toBe('openai')
    expect(r.fields?.candidateCategoryNode).toBe('industry:retail')
    expect(state.gemini.extract).toHaveBeenCalledTimes(1)
    expect(state.openai.extract).toHaveBeenCalledTimes(1)
  })

  it('gemini unconfigured (existing behavior) → openai still used', async () => {
    state.gemini.configured = false
    state.openai.extract.mockResolvedValue(okData('industry:technology'))
    const run = await load()

    const r = await run(input())

    expect(r.metadata.providerId).toBe('openai')
    expect(state.gemini.extract).not.toHaveBeenCalled()
  })

  it('all configured providers throw → provider_error, fields null (no crash)', async () => {
    state.gemini.extract.mockRejectedValue(new Error('a'))
    state.openai.extract.mockRejectedValue(new Error('b'))
    state.anthropic.extract.mockRejectedValue(new Error('c'))
    const run = await load()

    const r = await run(input())

    expect(r.fields).toBeNull()
    expect(r.metadata.status).toBe('provider_error')
  })

  it('no site signals → no LLM call (honest degrade)', async () => {
    const run = await load()

    const r = await run({ ...input(), siteContent: '', entitySignals: null })

    expect(r.metadata.status).toBe('no_signals')
    expect(state.gemini.extract).not.toHaveBeenCalled()
  })
})
