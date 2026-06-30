import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const anthropicMock = vi.fn()
const geminiMock = vi.fn()
const openaiMock = vi.fn()
const isGeminiConfiguredMock = vi.fn(() => true)

vi.mock('@/lib/ai/anthropic', () => ({
  generateStructuredAnthropic: (...a: unknown[]) => anthropicMock(...a),
  isAnthropicConfigured: () => Promise.resolve(true)
}))

vi.mock('@/lib/ai/google-genai', () => ({
  generateStructuredGemini: (...a: unknown[]) => geminiMock(...a),
  isGeminiConfigured: () => isGeminiConfiguredMock()
}))

vi.mock('@/lib/ai/openai', () => ({
  generateStructuredOpenAI: (...a: unknown[]) => openaiMock(...a),
  isOpenAIConfigured: () => Promise.resolve(true)
}))

import {
  runProseExtraction,
  getRegisteredProseProvider
} from '@/lib/growth/ai-visibility/normalization/prose-extraction/router'

const FLAG = 'GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED'

const input = { excerpt: 'La marca es descrita como líder.', subjectBrand: 'X', subjectDomain: 'x.cl', maxTokens: 1024 }

const fields = {
  brandMentioned: 'yes',
  sentimentLabel: 'positive',
  sentimentScore: 0.6,
  categoryAssociations: [],
  messageDriftClaims: [],
  confidence: 0.8
}

beforeEach(() => {
  process.env[FLAG] = 'true'
  delete process.env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER
  isGeminiConfiguredMock.mockReturnValue(true)
  anthropicMock.mockResolvedValue({ data: fields, model: 'claude-haiku', usage: { inputTokens: 1, outputTokens: 1 } })
  geminiMock.mockResolvedValue({ data: fields, model: 'gemini-2.5-flash-lite', usage: { inputTokens: 1, outputTokens: 1 } })
  openaiMock.mockResolvedValue({ data: fields, model: 'gpt-4.1-nano', usage: { inputTokens: 1, outputTokens: 1 } })
})

afterEach(() => {
  delete process.env[FLAG]
  vi.clearAllMocks()
})

describe('prose-extraction router — provider dispatch (Slice 2)', () => {
  it('los tres adapters están registrados', () => {
    expect(getRegisteredProseProvider('anthropic')).toBeDefined()
    expect(getRegisteredProseProvider('gemini')).toBeDefined()
    expect(getRegisteredProseProvider('openai')).toBeDefined()
  })

  it('provider=gemini (forzado) → despacha a Gemini, no a Anthropic', async () => {
    const result = await runProseExtraction(input, { provider: 'gemini' })

    expect(geminiMock).toHaveBeenCalledTimes(1)
    expect(anthropicMock).not.toHaveBeenCalled()
    expect(result.metadata.providerId).toBe('gemini')
    expect(result.metadata.model).toBe('gemini-2.5-flash-lite')
    expect(result.fields).not.toBeNull()
  })

  it('flag PROVIDER=openai → despacha a OpenAI', async () => {
    process.env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER = 'openai'

    const result = await runProseExtraction(input)

    expect(openaiMock).toHaveBeenCalledTimes(1)
    expect(result.metadata.providerId).toBe('openai')
  })

  it('isConfigured() lanza (credencial ausente) → not_configured, el router NO lanza', async () => {
    isGeminiConfiguredMock.mockImplementation(() => {
      throw new Error('Missing GCP_PROJECT')
    })

    const result = await runProseExtraction(input, { provider: 'gemini' })

    expect(result.metadata.status).toBe('not_configured')
    expect(geminiMock).not.toHaveBeenCalled()
  })

  it('default sin flag → anthropic (behavior-preserving)', async () => {
    const result = await runProseExtraction(input)

    expect(anthropicMock).toHaveBeenCalledTimes(1)
    expect(geminiMock).not.toHaveBeenCalled()
    expect(openaiMock).not.toHaveBeenCalled()
    expect(result.metadata.providerId).toBe('anthropic')
  })
})
