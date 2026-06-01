import { describe, expect, it, vi } from 'vitest'

import {
  getOpenAIImageModel,
  isOpenAIImageModel,
  resolveOpenAIImageBackground,
  resolveOpenAIImageRequestModel,
  resolveOpenAIImageSize,
  type OpenAIImageModel
} from '@/lib/ai/openai-image'

vi.mock('server-only', () => ({}))

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
