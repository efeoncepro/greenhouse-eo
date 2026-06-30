import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const captureWithDomainMock = vi.fn()

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => captureWithDomainMock(...args)
}))

const generateStructuredAnthropicMock = vi.fn()
const isAnthropicConfiguredMock = vi.fn()

vi.mock('@/lib/ai/anthropic', () => ({
  generateStructuredAnthropic: (...args: unknown[]) => generateStructuredAnthropicMock(...args),
  isAnthropicConfigured: () => isAnthropicConfiguredMock()
}))

import { runProseExtraction } from '@/lib/growth/ai-visibility/normalization/prose-extraction/router'

const FLAG = 'GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED'

const validInput = {
  excerpt: 'BBDO Chile es descrita como la mejor agencia integral del mercado.',
  subjectBrand: 'BBDO Chile',
  subjectDomain: 'bbdo.cl',
  maxTokens: 1024
}

const okAnthropicResponse = {
  data: {
    brandMentioned: 'yes',
    sentimentLabel: 'positive',
    sentimentScore: 0.7,
    categoryAssociations: ['agencia integral'],
    messageDriftClaims: [],
    confidence: 0.85
  },
  model: 'claude-haiku-4-5-20251001',
  stopReason: 'tool_use',
  usage: { inputTokens: 500, outputTokens: 60 }
}

beforeEach(() => {
  delete process.env[FLAG]
  delete process.env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER
  delete process.env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_MAX_COST_USD
  isAnthropicConfiguredMock.mockResolvedValue(true)
  generateStructuredAnthropicMock.mockResolvedValue(okAnthropicResponse)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('prose-extraction router — fallback matrix (honest degradation)', () => {
  it('flag OFF → fields null, status disabled, sin llamar al proveedor', async () => {
    const result = await runProseExtraction(validInput)

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('disabled')
    expect(generateStructuredAnthropicMock).not.toHaveBeenCalled()
  })

  it('excerpt vacío → fields null, status empty_excerpt', async () => {
    process.env[FLAG] = 'true'

    const result = await runProseExtraction({ ...validInput, excerpt: '   ' })

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('empty_excerpt')
    expect(generateStructuredAnthropicMock).not.toHaveBeenCalled()
  })

  it('proveedor desconocido (no en el registry) → not_configured, sin tocar clientes', async () => {
    process.env[FLAG] = 'true'

    const result = await runProseExtraction(validInput, { provider: 'mistral' as never })

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('not_configured')
    expect(generateStructuredAnthropicMock).not.toHaveBeenCalled()
  })

  it('proveedor sin secret → not_configured (sin invocar extract)', async () => {
    process.env[FLAG] = 'true'
    isAnthropicConfiguredMock.mockResolvedValue(false)

    const result = await runProseExtraction(validInput)

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('not_configured')
    expect(generateStructuredAnthropicMock).not.toHaveBeenCalled()
  })

  it('output con schema inválido → schema_invalid, fields null', async () => {
    process.env[FLAG] = 'true'
    generateStructuredAnthropicMock.mockResolvedValue({
      ...okAnthropicResponse,
      data: { brandMentioned: 'definitivamente', sentimentLabel: 'positive', confidence: 0.5 }
    })

    const result = await runProseExtraction(validInput)

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('schema_invalid')
  })

  it('proveedor lanza → provider_error, fields null, captura a growth', async () => {
    process.env[FLAG] = 'true'
    generateStructuredAnthropicMock.mockRejectedValue(new Error('network down'))

    const result = await runProseExtraction(validInput, {
      telemetry: { runId: 'run-1', promptId: 'p03' }
    })

    expect(result.fields).toBeNull()
    expect(result.metadata.status).toBe('provider_error')
    expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
    expect(captureWithDomainMock.mock.calls[0][1]).toBe('growth')
  })
})

describe('prose-extraction router — happy path', () => {
  it('flag ON + anthropic → fields sanitizados, status ok, costo estimado, modelo presente', async () => {
    process.env[FLAG] = 'true'

    const result = await runProseExtraction(validInput)

    expect(result.fields).toEqual({
      brandMentioned: 'yes',
      sentimentLabel: 'positive',
      sentimentScore: 0.7,
      categoryAssociations: ['agencia integral'],
      messageDriftClaims: [],
      confidence: 0.85
    })
    expect(result.metadata.status).toBe('ok')
    expect(result.metadata.providerId).toBe('anthropic')
    expect(result.metadata.model).toBe('claude-haiku-4-5-20251001')
    expect(result.metadata.costEstimateUsd).toBeGreaterThan(0)
    expect(result.metadata.usage).toEqual({ inputTokens: 500, outputTokens: 60 })
  })

  it('sentimentScore fuera de rango → null (sanitización), preserva el resto', async () => {
    process.env[FLAG] = 'true'
    generateStructuredAnthropicMock.mockResolvedValue({
      ...okAnthropicResponse,
      data: { ...okAnthropicResponse.data, sentimentScore: 5 }
    })

    const result = await runProseExtraction(validInput)

    expect(result.fields?.sentimentScore).toBeNull()
    expect(result.fields?.sentimentLabel).toBe('positive')
  })

  it('cost estimate por encima del techo → captura warning, conserva el resultado', async () => {
    process.env[FLAG] = 'true'
    process.env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_MAX_COST_USD = '0'

    const result = await runProseExtraction(validInput)

    expect(result.fields).not.toBeNull()
    expect(result.metadata.status).toBe('ok')
    expect(captureWithDomainMock).toHaveBeenCalledTimes(1)
    expect(captureWithDomainMock.mock.calls[0][2]).toMatchObject({ level: 'warning' })
  })
})
