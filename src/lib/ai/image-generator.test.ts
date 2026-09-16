import { describe, expect, it } from 'vitest'

import {
  getImageGenerationProvider,
  isImageGenerationProvider,
  IMAGE_GENERATION_PROVIDERS
} from '@/lib/ai/image-generator'

describe('image generation provider selection (TASK-1851)', () => {
  const withEnv = (value: string | undefined, run: () => void) => {
    const previous = process.env.GREENHOUSE_IMAGE_PROVIDER

    if (value === undefined) delete process.env.GREENHOUSE_IMAGE_PROVIDER
    else process.env.GREENHOUSE_IMAGE_PROVIDER = value

    try {
      run()
    } finally {
      if (previous === undefined) delete process.env.GREENHOUSE_IMAGE_PROVIDER
      else process.env.GREENHOUSE_IMAGE_PROVIDER = previous
    }
  }

  it('never defaults to a provider whose model is retired', () => {
    // imagen-4.0-generate-001 respondió 404 NOT_FOUND el 2026-09-16: el default no puede apuntar ahí.
    withEnv(undefined, () => {
      expect(getImageGenerationProvider()).toBe('openai-image')
    })
  })

  it('honours an explicit provider argument over the environment', () => {
    withEnv('openai-image', () => {
      expect(getImageGenerationProvider('google-gemini-image')).toBe('google-gemini-image')
    })
  })

  it('honours a valid GREENHOUSE_IMAGE_PROVIDER', () => {
    withEnv('google-gemini-image', () => {
      expect(getImageGenerationProvider()).toBe('google-gemini-image')
    })
  })

  it('throws instead of silently falling back when GREENHOUSE_IMAGE_PROVIDER is unknown', () => {
    withEnv('google-imagen', () => {
      // El identificador retirado es justamente el typo plausible tras la migración.
      expect(() => getImageGenerationProvider()).toThrow(/not a supported image provider/)
    })

    withEnv('midjourney', () => {
      expect(() => getImageGenerationProvider()).toThrow(/openai-image/)
    })
  })

  it('exposes exactly the supported providers', () => {
    expect([...IMAGE_GENERATION_PROVIDERS].sort()).toEqual(['google-gemini-image', 'openai-image'])
    expect(isImageGenerationProvider('google-imagen')).toBe(false)
    expect(isImageGenerationProvider('google-gemini-image')).toBe(true)
  })
})
