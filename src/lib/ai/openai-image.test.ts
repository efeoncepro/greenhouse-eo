import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  editOpenAIImage,
  getOpenAIImageModel,
  isOpenAIImageModel,
  resolveOpenAIImageBackground,
  resolveOpenAIImageRequestModel,
  resolveOpenAIImageSize,
  type OpenAIImageModel
} from '@/lib/ai/openai-image'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: vi.fn().mockResolvedValue({
    value: 'test-openai-key',
    source: 'env'
  })
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('openai-image helpers', () => {
  const testEnv = (env: Record<string, string | undefined>) => env as unknown as NodeJS.ProcessEnv

  it('defaults to gpt-image-2 when OPENAI_IMAGE_MODEL is unset or unsupported', () => {
    expect(getOpenAIImageModel({} as NodeJS.ProcessEnv)).toBe('gpt-image-2')
    expect(getOpenAIImageModel(testEnv({ OPENAI_IMAGE_MODEL: 'dall-e-3' }))).toBe('gpt-image-2')
  })

  it('accepts supported GPT Image models from env', () => {
    expect(getOpenAIImageModel(testEnv({ OPENAI_IMAGE_MODEL: 'gpt-image-1.5' }))).toBe('gpt-image-1.5')
    expect(isOpenAIImageModel('gpt-image-2')).toBe(true)
    expect(isOpenAIImageModel('gpt-5')).toBe(false)
  })

  it.each([
    ['1:1', '2048x2048'],
    ['16:9', '2048x1152'],
    ['9:16', '1152x2048'],
    ['4:3', '2048x1536'],
    ['3:4', '1536x2048']
  ] as const)('maps %s to a GPT Image 2 size', (aspectRatio, expectedSize) => {
    expect(resolveOpenAIImageSize({ model: 'gpt-image-2', aspectRatio })).toBe(expectedSize)
  })

  it.each([
    ['gpt-image-1.5', '16:9', '1536x1024'],
    ['gpt-image-1', '9:16', '1024x1536'],
    ['gpt-image-1-mini', '1:1', '1024x1024']
  ] as Array<[OpenAIImageModel, '1:1' | '16:9' | '9:16', string]>)(
    'maps %s %s to a legacy-compatible size',
    (model, aspectRatio, expectedSize) => {
      expect(resolveOpenAIImageSize({ model, aspectRatio })).toBe(expectedSize)
    }
  )

  it('downgrades explicit non-legacy sizes for older GPT Image models', () => {
    expect(resolveOpenAIImageSize({ model: 'gpt-image-1.5', size: '2048x1152' })).toBe('auto')
    expect(resolveOpenAIImageSize({ model: 'gpt-image-1.5', size: '1024x1536' })).toBe('1024x1536')
  })

  it('falls back to GPT Image 1.5 when transparent background is requested for GPT Image 2', () => {
    expect(resolveOpenAIImageRequestModel({ model: 'gpt-image-2', background: 'transparent' })).toEqual({
      model: 'gpt-image-1.5',
      requestedModel: 'gpt-image-2',
      modelFallbackReason: 'gpt-image-2 does not support transparent backgrounds; using gpt-image-1.5.'
    })
  })

  it('can fail closed for unsupported GPT Image 2 transparent backgrounds', () => {
    expect(() =>
      resolveOpenAIImageBackground({
        model: 'gpt-image-2',
        background: 'transparent',
        transparentBackgroundStrategy: 'throw'
      })
    ).toThrow('gpt-image-2 does not support transparent backgrounds')
  })
})

describe('editOpenAIImage multi-reference requests', () => {
  it('serializes multiple references as ordered image[] multipart fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ b64_json: 'aW1hZ2U=' }]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    await editOpenAIImage({
      prompt: 'Use the first image for composition and the second for product detail.',
      image: [
        {
          bytes: new Uint8Array([1, 2, 3]),
          filename: 'composition.png',
          mimeType: 'image/png'
        },
        {
          bytes: new Uint8Array([4, 5, 6]),
          filename: 'product-detail.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      model: 'gpt-image-2',
      size: '1536x1024',
      quality: 'high'
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = request.body as FormData
    const references = body.getAll('image[]') as File[]

    expect(url).toBe('https://api.openai.com/v1/images/edits')
    expect(body.get('image')).toBeNull()
    expect(references.map(reference => reference.name)).toEqual(['composition.png', 'product-detail.jpg'])
    expect(references.map(reference => reference.type)).toEqual(['image/png', 'image/jpeg'])
    expect(body.get('model')).toBe('gpt-image-2')
    expect(body.get('quality')).toBe('high')
  })

  it('rejects more than ten references before making a paid API request', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    const references = Array.from({ length: 11 }, (_, index) => ({
      bytes: new Uint8Array([index]),
      filename: `reference-${index + 1}.png`,
      mimeType: 'image/png'
    }))

    await expect(
      editOpenAIImage({
        prompt: 'Combine these references.',
        image: references,
        model: 'gpt-image-2'
      })
    ).rejects.toThrow('OpenAI image editing supports at most 10 input images per request.')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
