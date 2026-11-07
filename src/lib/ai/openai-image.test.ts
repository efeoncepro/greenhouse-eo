import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertOpenAIImageInputFidelitySupported,
  assertOpenAIImageModelAvailable,
  assertOpenAIImageOptionsSupported,
  assertOpenAIImageSizeSupported,
  isOpenAIImageOutputFormat,
  editOpenAIImage,
  estimateOpenAIImageOutputTokens,
  estimateOpenAIImageOutputUsd,
  generateOpenAIImage,
  isOpenAIImageBackground,
  isOpenAIImageFormat,
  getOpenAIImageModel,
  isOpenAIImageModel,
  isOpenAIImageQuality,
  openAIImageModelsWith,
  resolveOpenAIImageBackground,
  resolveOpenAIImageRequestModel,
  resolveOpenAIImageSize,
  runOpenAIImageTool,
  type OpenAIImageModel,
  type OpenAIImageSize
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
  const testEnv = (env: Record<string, string | undefined>) => env

  it('defaults to gpt-image-2 when OPENAI_IMAGE_MODEL is unset', () => {
    expect(getOpenAIImageModel({})).toBe('gpt-image-2')
  })

  // TASK-1851: este caso afirmaba la degradación silenciosa como comportamiento correcto.
  // Devolver el default ante un valor desconocido hacía que pedir 2.5 generara —y cobrara— gpt-image-2.
  it('throws instead of silently downgrading an unknown OPENAI_IMAGE_MODEL', () => {
    expect(() => getOpenAIImageModel(testEnv({ OPENAI_IMAGE_MODEL: 'dall-e-3' }))).toThrow(
      /not a supported OpenAI image model/
    )

    // Una familia sin variante es el typo plausible: el mensaje tiene que ofrecer las válidas.
    expect(() => getOpenAIImageModel(testEnv({ OPENAI_IMAGE_MODEL: 'gpt-image-2.5' }))).toThrow(
      /gpt-image-2\.5-flare/
    )
  })

  it('validates quality identifiers for the CLI gate', () => {
    expect(isOpenAIImageQuality('max')).toBe(true)
    expect(isOpenAIImageQuality('xhigh')).toBe(true)
    expect(isOpenAIImageQuality('ultra')).toBe(false)
    expect(isOpenAIImageQuality('')).toBe(false)
  })

  it('accepts the 2.5 family from env', () => {
    expect(getOpenAIImageModel(testEnv({ OPENAI_IMAGE_MODEL: 'gpt-image-2.5-flare' }))).toBe('gpt-image-2.5-flare')
    expect(getOpenAIImageModel(testEnv({ OPENAI_IMAGE_MODEL: 'gpt-image-2.5-sunburst-2026-09-08' }))).toBe(
      'gpt-image-2.5-sunburst-2026-09-08'
    )
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

  it('keeps GPT Image 2 when transparent background is requested', () => {
    expect(resolveOpenAIImageRequestModel({ model: 'gpt-image-2', background: 'transparent' })).toEqual({
      model: 'gpt-image-2',
      requestedModel: 'gpt-image-2',
      modelFallbackReason: null
    })
  })

  it('preserves transparent background for GPT Image 2', () => {
    expect(resolveOpenAIImageBackground({ model: 'gpt-image-2', background: 'transparent' })).toBe('transparent')
  })

  it('serializes GPT Image 2 transparent PNG without changing the model', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      background: 'transparent',
      data: [{ b64_json: 'aW1hZ2U=' }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    vi.stubGlobal('fetch', fetchMock)

    const result = await generateOpenAIImage({
      prompt: 'A reusable icon.',
      model: 'gpt-image-2',
      background: 'transparent',
      format: 'png'
    })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(request.body)) as Record<string, unknown>

    expect(body).toMatchObject({ model: 'gpt-image-2', background: 'transparent', output_format: 'png', n: 1 })
    expect(result).toMatchObject({ model: 'gpt-image-2', requestedModel: 'gpt-image-2', modelFallbackReason: null, background: 'transparent' })
  })

  it('rejects transparent JPEG and multiple outputs before a paid request', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await expect(generateOpenAIImage({
      prompt: 'A reusable icon.',
      background: 'transparent',
      format: 'jpeg'
    })).rejects.toThrow('Transparent OpenAI image output requires PNG or WebP')

    await expect(generateOpenAIImage({
      prompt: 'Two icons.',
      numberOfImages: 2
    })).rejects.toThrow('This OpenAI image helper returns one image')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects partial images until the Responses helper implements SSE', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await expect(runOpenAIImageTool({
      prompt: 'A reusable icon.',
      partialImages: 1
    })).rejects.toThrow('OpenAI partial images require an SSE streaming transport')

    expect(fetchMock).not.toHaveBeenCalled()
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

  it('rejects more than sixteen references before making a paid API request', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    const references = Array.from({ length: 17 }, (_, index) => ({
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
    ).rejects.toThrow('OpenAI image editing supports at most 16 input images per request.')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a mask whose format differs from the first image before a paid request', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await expect(editOpenAIImage({
      prompt: 'Edit the transparent area.',
      image: { bytes: new Uint8Array([1]), filename: 'source.png', mimeType: 'image/png' },
      mask: { bytes: new Uint8Array([2]), filename: 'mask.webp', mimeType: 'image/webp' }
    })).rejects.toThrow('OpenAI image mask must use the same format as the first image input.')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('GPT Image 2.5 family contract (TASK-1851)', () => {
  const jsonResponse = () =>
    new Response(JSON.stringify({ data: [{ b64_json: 'aW1hZ2U=' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  it.each([
    'gpt-image-2.5-flare',
    'gpt-image-2.5-flare-2026-09-08',
    'gpt-image-2.5-sunburst',
    'gpt-image-2.5-sunburst-2026-09-08'
  ])('recognizes %s as a supported model', model => {
    expect(isOpenAIImageModel(model)).toBe(true)
  })

  it.each([
    ['1:1', '2048x2048'],
    ['16:9', '2048x1152'],
    ['9:16', '1152x2048'],
    ['4:3', '2048x1536'],
    ['3:4', '1536x2048']
  ] as const)('resolves the 2.5 family %s to the extended size grid, not the legacy one', (aspectRatio, expectedSize) => {
    expect(resolveOpenAIImageSize({ model: 'gpt-image-2.5-flare', aspectRatio })).toBe(expectedSize)
    expect(resolveOpenAIImageSize({ model: 'gpt-image-2.5-sunburst', aspectRatio })).toBe(expectedSize)
  })

  it('keeps an explicit extended size for the 2.5 family instead of collapsing it to auto', () => {
    expect(resolveOpenAIImageSize({ model: 'gpt-image-2.5-flare', size: '2048x2048' })).toBe('2048x2048')
    expect(resolveOpenAIImageSize({ model: 'gpt-image-2.5-sunburst', size: '2048x1152' })).toBe('2048x1152')
  })

  it.each(['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare', 'gpt-image-2'] as const)(
    'rejects input_fidelity on %s before any network call, instead of dropping it silently',
    async model => {
      const fetchMock = vi.fn()

      vi.stubGlobal('fetch', fetchMock)

      await expect(
        editOpenAIImage({
          prompt: 'Change only the background colour, keep everything else the same.',
          image: { bytes: new Uint8Array([1, 2, 3]), filename: 'anchor.png', mimeType: 'image/png' },
          model,
          inputFidelity: 'high'
        })
      ).rejects.toThrow(/does not accept input_fidelity.*gpt-image-1\.5/)

      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it('rejects an invalid input_fidelity value before any network call', () => {
    expect(() => assertOpenAIImageInputFidelitySupported({ model: 'gpt-image-1.5', inputFidelity: 'max' as never })).toThrow(/not valid/)
  })

  it('lists the models with input_fidelity from the capability table', () => {
    expect(openAIImageModelsWith('inputFidelity')).toEqual(['gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'])
  })

  it('still sends input_fidelity for the earlier models that document it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())

    vi.stubGlobal('fetch', fetchMock)

    await editOpenAIImage({
      prompt: 'Keep the subject identical.',
      image: { bytes: new Uint8Array([1, 2, 3]), filename: 'anchor.png', mimeType: 'image/png' },
      model: 'gpt-image-1.5',
      inputFidelity: 'high'
    })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect((request.body as FormData).get('input_fidelity')).toBe('high')
  })

  it.each(['xhigh', 'max'] as const)('rejects quality %s on a pre-2.5 model before any network call', async quality => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      generateOpenAIImage({ prompt: 'An icon.', model: 'gpt-image-2', quality })
    ).rejects.toThrow(/only exists on the GPT Image 2.5 and 2.6 families/)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['xhigh', 'max'] as const)('accepts quality %s on the 2.5 family', async quality => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())

    vi.stubGlobal('fetch', fetchMock)

    await generateOpenAIImage({ prompt: 'An icon.', model: 'gpt-image-2.5-flare', quality })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(JSON.parse(String(request.body))).toMatchObject({ model: 'gpt-image-2.5-flare', quality })
  })

  it('leaves the gpt-image-2 request body byte-for-byte unchanged by this task', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())

    vi.stubGlobal('fetch', fetchMock)

    await generateOpenAIImage({
      prompt: 'A reusable icon.',
      model: 'gpt-image-2',
      aspectRatio: '16:9',
      quality: 'high',
      format: 'png'
    })

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://api.openai.com/v1/images/generations')
    expect(JSON.parse(String(request.body))).toEqual({
      model: 'gpt-image-2',
      prompt: 'A reusable icon.',
      n: 1,
      size: '2048x1152',
      quality: 'high',
      output_format: 'png'
    })
  })
})

describe('ai:image — validación local y estimación de costo', () => {
  // Fórmula oficial de la calculadora de OpenAI; reproduce lo medido en el repo el 2026-09-16.
  it('reproduce los tokens de salida medidos de GPT Image 2.5 a 1024×1024', () => {
    const model: OpenAIImageModel = 'gpt-image-2.5-flare'

    expect(estimateOpenAIImageOutputTokens({ model, quality: 'low', size: '1024x1024' })).toBe(196)
    expect(estimateOpenAIImageOutputTokens({ model, quality: 'high', size: '1024x1024' })).toBe(1756)
    expect(estimateOpenAIImageOutputTokens({ model, quality: 'max', size: '1024x1024' })).toBe(7024)
  })

  it('iguala la tabla oficial de GPT Image 2 (high 1536×1024 ≈ USD 0,165) y equivalencias con 2.5', () => {
    expect(estimateOpenAIImageOutputUsd({ model: 'gpt-image-2', quality: 'high', size: '1536x1024' })).toBeCloseTo(0.165, 3)
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2', quality: 'medium', size: '1024x1024' })).toBe(
      estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.5-sunburst', quality: 'high', size: '1024x1024' })
    )
  })

  it('no estima auto ni modelos sin grilla publicada', () => {
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.5-flare', quality: 'auto', size: '1024x1024' })).toBeNull()
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.5-flare', quality: 'high', size: 'auto' })).toBeNull()
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-1', quality: 'high', size: '1024x1024' })).toBeNull()
  })

  it('valida --size contra la grilla del modelo antes de la red', () => {
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2.5-flare', size: '3840x2160' })).not.toThrow()
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2', size: 'auto' })).not.toThrow()
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2', size: '1000x1000' })).toThrow('múltiplos de 16')
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2', size: '4096x2304' })).toThrow('3840')
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2', size: '3840x1024' })).toThrow('3:1')
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2', size: '512x512' })).toThrow('área')
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-1', size: '2048x1152' })).toThrow('sólo acepta')
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2', size: 'grande' })).toThrow('ANCHOxALTO')
  })

  it('reconoce fondos y formatos válidos', () => {
    expect(isOpenAIImageBackground('transparent')).toBe(true)
    expect(isOpenAIImageBackground('clear')).toBe(false)
    expect(isOpenAIImageFormat('webp')).toBe(true)
    // `isOpenAIImageFormat` es el conjunto RASTER (entrada, transparencia, compresión); gif y svg son de salida.
    expect(isOpenAIImageFormat('gif')).toBe(false)
    expect(isOpenAIImageOutputFormat('gif')).toBe(true)
    expect(isOpenAIImageOutputFormat('svg')).toBe(true)
    expect(isOpenAIImageOutputFormat('tiff')).toBe(false)
  })
})

describe('GPT Image 2.6 family contract (Sunburst/Flare, 2026-11-04)', () => {
  const jsonResponse = (extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ data: [{ b64_json: 'aW1hZ2U=' }], ...extra }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  const pngWith = async (width: number, height: number, alpha: boolean) =>
    new Uint8Array(
      await sharp({ create: { width, height, channels: alpha ? 4 : 3, background: alpha ? { r: 0, g: 0, b: 0, alpha: 0 } : '#ffffff' } })
        .png()
        .toBuffer()
    )

  it.each(['gpt-image-2.6-sunburst', 'gpt-image-2.6-flare', 'gpt-image-2-2026-04-21'])('recognizes %s as a supported model', model => {
    expect(isOpenAIImageModel(model)).toBe(true)
  })

  // Tokens medidos el 2026-11-05 (ai-generations/2026-11-05_gpt-image-2-6-canary/results.json). `high` midió 1.758: el
  // factor 1 lo estima en 1.756, dentro de ±0,2 %.
  it.each([
    ['low', '1024x1024', 824],
    ['low', '2048x1152', 660],
    ['medium', '1024x1024', 1449],
    ['high', '1024x1024', 1756],
    ['xhigh', '1024x1024', 3122],
    ['max', '1024x1024', 7024]
  ] as const)('estimates 2.6 %s at %s close to the measured usage', (quality, size, tokens) => {
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.6-flare', quality, size })).toBe(tokens)
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.6-sunburst', quality, size })).toBe(tokens)
  })

  it('does not reuse the 2.5 grid for 2.6: low costs ~4.2x the 2.5 twin', () => {
    const low26 = estimateOpenAIImageOutputUsd({ model: 'gpt-image-2.6-flare', quality: 'low', size: '1024x1024' })!
    const low25 = estimateOpenAIImageOutputUsd({ model: 'gpt-image-2.5-flare', quality: 'low', size: '1024x1024' })!

    expect(low26 / low25).toBeGreaterThan(4)
  })

  it('does not estimate GIF (the frame sheet does not follow the grid) but estimates the SVG raster reference', () => {
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.6-flare', quality: 'low', size: '816x816', format: 'gif' })).toBeNull()
    expect(estimateOpenAIImageOutputTokens({ model: 'gpt-image-2.6-flare', quality: 'low', size: '1024x1024', format: 'svg' })).toBe(824)
  })

  it('sends complexity, SVG options and returns svg_usage on a 2.6 generation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ svg_usage: { model: 'gpt-5.5', input_tokens: 10, output_tokens: 5 } }))

    vi.stubGlobal('fetch', fetchMock)

    const result = await generateOpenAIImage({
      prompt: 'Flat icon.',
      model: 'gpt-image-2.6-flare',
      size: '1024x1024',
      quality: 'low',
      format: 'svg',
      complexity: 'low',
      svg: { model: 'gpt-5.5', reasoningEffort: 'low' }
    })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(JSON.parse(String(request.body))).toEqual({
      model: 'gpt-image-2.6-flare',
      prompt: 'Flat icon.',
      n: 1,
      size: '1024x1024',
      quality: 'low',
      output_format: 'svg',
      complexity: 'low',
      svg: { model: 'gpt-5.5', reasoning: { effort: 'low' } }
    })
    expect(result.svgUsage).toMatchObject({ model: 'gpt-5.5', output_tokens: 5 })
  })

  it('sends GIF frame options on a 2.6 generation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())

    vi.stubGlobal('fetch', fetchMock)

    await generateOpenAIImage({ prompt: 'Loop.', model: 'gpt-image-2.6-flare', size: '640x640' as OpenAIImageSize, quality: 'low', format: 'gif', gif: { frameCount: 9, frameDurationMs: 120 } })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(JSON.parse(String(request.body))).toMatchObject({ output_format: 'gif', frame_count: 9, frame_duration_ms: 120 })
  })

  it.each([
    [{ model: 'gpt-image-2.5-flare', complexity: 'low' }, /no acepta complexity/],
    [{ model: 'gpt-image-2.5-sunburst', format: 'svg', svg: { model: 'gpt-5.5' } }, /no genera SVG/],
    [{ model: 'gpt-image-2', format: 'gif' }, /no genera GIF/],
    [{ model: 'gpt-image-2.6-flare', format: 'svg' }, /svg\.model/],
    [{ model: 'gpt-image-2.6-flare', format: 'gif', gif: { frameCount: 1 } }, /frame_count/],
    [{ model: 'gpt-image-2.6-flare', format: 'gif', gif: { frameDurationMs: 5 } }, /frame_duration_ms/],
    [{ model: 'gpt-image-2.6-flare', format: 'png', outputCompression: 80 }, /sólo aplica a jpeg y webp/],
    [{ model: 'gpt-image-2.6-flare', format: 'png', gif: { frameCount: 4 } }, /sólo aplican con formato gif/]
  ] as const)('rejects unsupported 2.6 options before any network call (%#)', async (input, message) => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await expect(generateOpenAIImage({ prompt: 'x', quality: 'low', size: '1024x1024', ...(input as object) } as never)).rejects.toThrow(message)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects SVG on edits and markup combined with a mask before any network call', async () => {
    const fetchMock = vi.fn()
    const base = { bytes: await pngWith(64, 64, false), filename: 'base.png', mimeType: 'image/png' }

    vi.stubGlobal('fetch', fetchMock)

    expect(() => assertOpenAIImageOptionsSupported({ model: 'gpt-image-2.6-flare', operation: 'edit', format: 'svg', svg: { model: 'gpt-5.5' } })).toThrow(/sólo existe al generar/)
    await expect(editOpenAIImage({ prompt: 'x', image: base, mask: base, markup: base, model: 'gpt-image-2.6-flare' })).rejects.toThrow(/no se combina con mask/)
    await expect(editOpenAIImage({ prompt: 'x', image: base, markup: base, model: 'gpt-image-2' })).rejects.toThrow(/no acepta markup/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends a transparent markup layer of the same size as the base on a 2.5/2.6 edit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse())

    vi.stubGlobal('fetch', fetchMock)

    await editOpenAIImage({
      prompt: 'Follow the red marks.',
      image: { bytes: await pngWith(64, 64, false), filename: 'base.png', mimeType: 'image/png' },
      markup: { bytes: await pngWith(64, 64, true), filename: 'marks.png', mimeType: 'image/png' },
      model: 'gpt-image-2.6-flare',
      complexity: 'low',
      size: '1024x1024'
    })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = request.body as FormData

    expect(body.get('markup')).toBeInstanceOf(Blob)
    expect(body.get('complexity')).toBe('low')
  })

  it('rejects a flattened or mis-sized markup layer before any network call', async () => {
    const fetchMock = vi.fn()
    const image = { bytes: await pngWith(64, 64, false), filename: 'base.png', mimeType: 'image/png' }

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      editOpenAIImage({ prompt: 'x', image, markup: { bytes: await pngWith(64, 64, false), filename: 'm.png', mimeType: 'image/png' }, model: 'gpt-image-2.6-flare' })
    ).rejects.toThrow(/canal alfa/)
    await expect(
      editOpenAIImage({ prompt: 'x', image, markup: { bytes: await pngWith(32, 32, true), filename: 'm.png', mimeType: 'image/png' }, model: 'gpt-image-2.6-flare' })
    ).rejects.toThrow(/mismo que la primera imagen/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cuts retired models before the network and keeps the dated shutdowns', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)

    await expect(generateOpenAIImage({ prompt: 'x', model: 'gpt-image-1' })).rejects.toThrow(/se apagó el 2026-10-23/)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(() => assertOpenAIImageModelAvailable('gpt-image-1.5', '2026-11-30')).not.toThrow()
    expect(() => assertOpenAIImageModelAvailable('gpt-image-1.5', '2026-12-01')).toThrow(/se apagó/)
  })

  it('validates GIF frame size without the per-image area minimum (640x640 with 9 frames passed live)', () => {
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2.6-flare', size: '640x640', format: 'gif' })).not.toThrow()
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2.6-flare', size: '640x640' })).toThrow('área')
    expect(() => assertOpenAIImageSizeSupported({ model: 'gpt-image-2.6-flare', size: '650x650', format: 'gif' })).toThrow('múltiplos de 16')
  })

  it('sets the image model of the Responses tool only when asked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'resp_1', output: [{ type: 'image_generation_call', id: 'ig_1', result: 'aW1hZ2U=' }] }), { status: 200 })
    )

    vi.stubGlobal('fetch', fetchMock)

    await runOpenAIImageTool({ prompt: 'x', imageModel: 'gpt-image-2.6-flare', size: '1024x1024' })

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(JSON.parse(String(request.body)).tools[0].model).toBe('gpt-image-2.6-flare')
  })

  it('lists models by capability from the capability table', () => {
    expect(openAIImageModelsWith('svgOutput')).toEqual(['gpt-image-2.6-sunburst', 'gpt-image-2.6-flare'])
    expect(openAIImageModelsWith('markup')).toEqual([
      'gpt-image-2.6-sunburst',
      'gpt-image-2.6-flare',
      'gpt-image-2.5-sunburst',
      'gpt-image-2.5-sunburst-2026-09-08',
      'gpt-image-2.5-flare',
      'gpt-image-2.5-flare-2026-09-08'
    ])
  })
})
