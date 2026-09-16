import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ImageGeneratorModule from '@/lib/ai/image-generator'

vi.mock('server-only', () => ({}))

const generateImage = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: vi.fn().mockResolvedValue({
    tenant: { userId: 'user-agent-e2e-001' },
    errorResponse: null
  })
}))

vi.mock('@/lib/ai/image-generator', async () => {
  const actual = await vi.importActual<typeof ImageGeneratorModule>('@/lib/ai/image-generator')

  return { ...actual, generateImage }
})

const post = async (body: unknown) => {
  const { POST } = await import('../route')

  return POST(
    new Request('http://localhost/api/internal/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  )
}

describe('POST /api/internal/generate-image — enum fields (TASK-1851)', () => {
  beforeEach(() => {
    generateImage.mockReset()
    generateImage.mockResolvedValue({
      path: '/images/generated/x.png',
      filename: 'x.png',
      format: 'png',
      sizeBytes: 1,
      provider: 'openai-image',
      model: 'gpt-image-2',
      requestedModel: 'gpt-image-2',
      modelFallbackReason: null
    })
  })

  it('rejects an unknown provider instead of silently using the default', async () => {
    const response = await post({ prompt: 'an icon', provider: 'midjourney' })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload.code).toBe('invalid_request')
    expect(payload.field).toBe('provider')
    // Nada debe haberse generado: la puerta cierra antes del gasto.
    expect(generateImage).not.toHaveBeenCalled()
  })

  it('rejects the retired google-imagen identifier', async () => {
    const response = await post({ prompt: 'an icon', provider: 'google-imagen' })

    expect(response.status).toBe(400)
    expect(generateImage).not.toHaveBeenCalled()
  })

  it('forwards the 2.5 quality tiers that the route used to discard', async () => {
    const response = await post({ prompt: 'an icon', quality: 'max' })

    expect(response.status).toBe(201)
    expect(generateImage).toHaveBeenCalledWith('an icon', expect.objectContaining({ quality: 'max' }))
  })

  it('still accepts a request with no optional fields', async () => {
    const response = await post({ prompt: 'an icon' })

    expect(response.status).toBe(201)
    expect(generateImage).toHaveBeenCalledWith('an icon', {})
  })
})
