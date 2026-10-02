import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as OpenAIImageModule from '@/lib/ai/openai-image'

import { maskFromRect } from '../mask'

vi.mock('server-only', () => ({}))

const editOpenAIImage = vi.fn()

vi.mock('@/lib/ai/openai-image', async importOriginal => ({
  ...(await importOriginal<typeof OpenAIImageModule>()),
  editOpenAIImage: (...args: unknown[]) => editOpenAIImage(...args)
}))

const { openAIInpaintAdapter, openAIPickSize } = await import('./openai')

beforeEach(() => editOpenAIImage.mockReset())

describe('adaptador OpenAI', () => {
  it('elige tamaños válidos de la grilla extendida y la legacy', () => {
    const pick25 = openAIPickSize('gpt-image-2.5-sunburst')

    for (const aspect of [1, 1.91, 0.8, 3.5]) {
      const size = pick25(aspect, 1_500_000)

      expect(size.width % 16).toBe(0)
      expect(size.height % 16).toBe(0)
      expect(size.width * size.height).toBeLessThanOrEqual(2560 * 1440)
    }

    expect(openAIPickSize('gpt-image-1.5')(1.4, 1e6)).toEqual({ width: 1536, height: 1024 })
  })

  it('valida antes de gastar: semilla, modelo y calidad', () => {
    expect(() => openAIInpaintAdapter.validate({ model: 'gpt-image-2.5-sunburst', seed: 3 })).toThrow(/semilla/)
    expect(() => openAIInpaintAdapter.validate({ model: 'gpt-imagen-9' })).toThrow(/desconocido/)
    expect(() => openAIInpaintAdapter.validate({ model: 'gpt-image-2', quality: 'max' })).toThrow()
    expect(() => openAIInpaintAdapter.validate({ model: 'gpt-image-2.5-flare', quality: 'max' })).not.toThrow()
  })

  it('estima con la fórmula oficial de tokens', async () => {
    const estimate = await openAIInpaintAdapter.estimate({ model: 'gpt-image-2.5-sunburst', quality: 'low', size: { width: 1024, height: 1024 }, count: 2 })

    expect(estimate.usd).toBeCloseTo(2 * 196 * 30e-6, 4)
  })

  it('envía la máscara en convención alfa (transparente = editable) y mide el costo de salida', async () => {
    editOpenAIImage.mockResolvedValue({
      imageBytesBase64: (await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#808080' } }).png().toBuffer()).toString('base64'),
      model: 'gpt-image-2.5-sunburst',
      size: '1024x1024',
      quality: 'high',
      usage: { output_tokens: 1756 },
      modelFallbackReason: null
    })

    const mask = maskFromRect(1024, 1024, { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 })
    const image = await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#000000' } }).png().toBuffer()
    const output = await openAIInpaintAdapter.run({ prompt: 'x', image, mask, size: { width: 1024, height: 1024 }, model: 'gpt-image-2.5-sunburst', quality: 'high' })
    const call = editOpenAIImage.mock.calls[0][0]
    const alpha = await sharp(call.mask.bytes).ensureAlpha().extractChannel(3).raw().toBuffer()

    expect(call.size).toBe('1024x1024')
    expect(call.format).toBe('png')
    expect(alpha[512 * 1024 + 512]).toBe(0) // centro editable → transparente
    expect(alpha[0]).toBe(255) // esquina protegida → opaca
    expect(output.outputUsd).toBeCloseTo(1756 * 30e-6, 4)
  })
})
