import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// ── OpenAI structured (fetch-based) ───────────────────────────────────────────

const resolveSecretMock = vi.fn()

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: (...args: unknown[]) => resolveSecretMock(...args)
}))

// ── Gemini structured (Vertex SDK) ────────────────────────────────────────────

const generateContentMock = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock }
  }
}))

vi.mock('@/lib/google-credentials', () => ({
  getGoogleProjectId: () => 'efeonce-group',
  getGoogleAuthOptions: () => ({})
}))

vi.mock('@/config/nexa-models', () => ({
  resolveNexaModel: () => 'gemini-3-flash-preview'
}))

import { generateStructuredOpenAI } from '@/lib/ai/openai'
import { generateStructuredGemini, isGeminiConfigured } from '@/lib/ai/google-genai'

const schema = { type: 'object', properties: { brandMentioned: { type: 'string' } }, required: ['brandMentioned'] }

const mockFetch = (response: { ok: boolean; status: number; body: unknown }) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: response.ok,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body)
    }))
  )
}

beforeEach(() => {
  resolveSecretMock.mockResolvedValue({ value: 'sk-test', source: 'env' })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('generateStructuredOpenAI — Responses API json_schema', () => {
  it('parsea output_text como JSON tipado + usage', async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: { output_text: '{"brandMentioned":"yes"}', usage: { input_tokens: 120, output_tokens: 12 } }
    })

    const result = await generateStructuredOpenAI<{ brandMentioned: string }>({
      system: 'sys',
      prompt: 'p',
      schemaName: 'record',
      jsonSchema: schema
    })

    expect(result.data.brandMentioned).toBe('yes')
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 12 })
  })

  it('agrega output[].content output_text cuando no hay output_text top-level', async () => {
    mockFetch({
      ok: true,
      status: 200,
      body: {
        output: [{ type: 'message', content: [{ type: 'output_text', text: '{"brandMentioned":"no"}' }] }],
        usage: { input_tokens: 50, output_tokens: 5 }
      }
    })

    const result = await generateStructuredOpenAI<{ brandMentioned: string }>({
      system: 'sys',
      prompt: 'p',
      schemaName: 'record',
      jsonSchema: schema
    })

    expect(result.data.brandMentioned).toBe('no')
  })

  it('HTTP no-ok → lanza (degradación la maneja el caller)', async () => {
    mockFetch({ ok: false, status: 500, body: { error: 'boom' } })

    await expect(
      generateStructuredOpenAI({ system: 's', prompt: 'p', schemaName: 'r', jsonSchema: schema })
    ).rejects.toThrow(/HTTP 500/)
  })
})

describe('generateStructuredGemini — Vertex responseMimeType json', () => {
  it('isGeminiConfigured true cuando hay project id', () => {
    expect(isGeminiConfigured()).toBe(true)
  })

  it('parsea response.text como JSON tipado + usage', async () => {
    generateContentMock.mockResolvedValue({
      text: '{"brandMentioned":"ambiguous"}',
      usageMetadata: { promptTokenCount: 200, candidatesTokenCount: 20 }
    })

    const result = await generateStructuredGemini<{ brandMentioned: string }>({
      system: 'sys',
      prompt: 'p',
      jsonSchema: schema
    })

    expect(result.data.brandMentioned).toBe('ambiguous')
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 20 })
  })

  it('response vacío → lanza', async () => {
    generateContentMock.mockResolvedValue({ text: '   ', usageMetadata: {} })

    await expect(
      generateStructuredGemini({ system: 's', prompt: 'p', jsonSchema: schema })
    ).rejects.toThrow(/vacío/)
  })
})
