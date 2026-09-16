import { describe, expect, it } from 'vitest'

import { getHiggsfieldSchema, HIGGSFIELD_CAPABILITIES, HIGGSFIELD_CAPABILITY_PREFIX } from '@/lib/ai/higgsfield-capabilities'
import {
  buildHiggsfieldInput,
  rankHiggsfieldResolution,
  validateHiggsfieldInput,
  type HiggsfieldFlagValues
} from '@/lib/ai/higgsfield-input-rules'
import { estimateHiggsfieldFormulaCost } from '@/lib/ai/higgsfield-pricing'

const flags = (overrides: Partial<HiggsfieldFlagValues> = {}): HiggsfieldFlagValues => ({
  images: [],
  videos: [],
  audios: [],
  noAudio: false,
  thinking: false,
  noPromptExpansion: false,
  ...overrides
})

const schemaOf = (endpoint: string) => {
  const schema = getHiggsfieldSchema(endpoint)

  if (!schema) throw new Error(`sin esquema: ${endpoint}`)

  return schema
}

const IMG = 'https://cdn.example.com/a.png'

describe('catálogo Higgsfield', () => {
  it('cada capacidad tiene id hf- único y un esquema (snapshot o documentado)', () => {
    const ids = HIGGSFIELD_CAPABILITIES.map(item => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(id => id.startsWith(HIGGSFIELD_CAPABILITY_PREFIX))).toBe(true)

    for (const capability of HIGGSFIELD_CAPABILITIES) {
      expect(getHiggsfieldSchema(capability.endpoint), capability.id).not.toBeNull()
    }
  })

  it('Recraft de Higgsfield es raster: el esquema no ofrece svg', () => {
    for (const endpoint of ['recraft/v4.1/text-to-image', 'recraft/v4.1/pro/text-to-image']) {
      const format = (schemaOf(endpoint).properties as Record<string, { enum?: string[] }>).output_format

      expect(format.enum).not.toContain('svg')
    }
  })
})

describe('buildHiggsfieldInput', () => {
  it('elige la resolución más barata y lo avisa', () => {
    const { input, notes } = buildHiggsfieldInput({
      capabilityLabel: 'hf-wan3-t2v',
      schema: schemaOf('alibaba/wan-3.0/text-to-video'),
      flags: flags({ prompt: 'x' })
    })

    expect(input.resolution).toBe('480p')
    expect(notes[0]).toMatch(/la más barata/)
  })

  it('respeta --resolution sin importar mayúsculas y rechaza valores fuera del enum', () => {
    const schema = schemaOf('minimax/h3/text-to-video')

    expect(buildHiggsfieldInput({ capabilityLabel: 'h3', schema, flags: flags({ prompt: 'x', resolution: '2k' }) }).input.resolution).toBe('2K')
    expect(() => buildHiggsfieldInput({ capabilityLabel: 'h3', schema, flags: flags({ prompt: 'x', resolution: '720p' }) })).toThrow(/Opciones: 2K/)
  })

  it('una imagen va al campo singular; varias, al plural', () => {
    const grok = schemaOf('xai/grok-imagine-video/v1.5/reference-to-video')

    expect(buildHiggsfieldInput({ capabilityLabel: 'g', schema: grok, flags: flags({ prompt: 'x', images: [IMG] }) }).input.image_url).toBe(IMG)
    expect(buildHiggsfieldInput({ capabilityLabel: 'g', schema: grok, flags: flags({ prompt: 'x', images: [IMG, IMG] }) }).input.image_urls).toEqual([IMG, IMG])
  })

  it('primer y último cuadro de Kling O3 van a first_frame_url / last_frame_url', () => {
    const { input } = buildHiggsfieldInput({
      capabilityLabel: 'o3',
      schema: schemaOf('kling-video/o3/first-last-frame'),
      flags: flags({ prompt: 'x', images: [IMG], endImage: IMG })
    })

    expect(input).toMatchObject({ first_frame_url: IMG, last_frame_url: IMG })
  })

  it('en editar, el primer --video es el origen y el resto son referencias', () => {
    const { input } = buildHiggsfieldInput({
      capabilityLabel: 'edit',
      schema: schemaOf('bytedance/seedance-2.5/video-edit'),
      flags: flags({ prompt: 'x', videos: ['https://v/1.mp4', 'https://v/2.mp4'] })
    })

    expect(input).toMatchObject({ video_url: 'https://v/1.mp4', video_urls: ['https://v/2.mp4'] })
  })

  it('--no-audio usa el campo del endpoint (generate_audio o sound)', () => {
    expect(buildHiggsfieldInput({ capabilityLabel: 's', schema: schemaOf('bytedance/seedance-2.5/text-to-video'), flags: flags({ prompt: 'x', noAudio: true }) }).input.generate_audio).toBe(false)
    expect(buildHiggsfieldInput({ capabilityLabel: 'k', schema: schemaOf('kling-video/v3.0/std/text-to-video'), flags: flags({ prompt: 'x', noAudio: true }) }).input.sound).toBe('off')
  })

  it('rechaza por nombre un flag que el endpoint no tiene', () => {
    expect(() =>
      buildHiggsfieldInput({ capabilityLabel: 'hf-soul2', schema: schemaOf('higgsfield-ai/soul/v2/standard'), flags: flags({ prompt: 'x', duration: '5' }) })
    ).toThrow(/--duration no aplica a "hf-soul2"/)
  })

  it('--input gana sobre los flags', () => {
    const { input } = buildHiggsfieldInput({
      capabilityLabel: 'soul',
      schema: schemaOf('higgsfield-ai/soul/v2/standard'),
      flags: flags({ prompt: 'x', aspect: '1:1', extraInput: { aspect_ratio: '16:9' } })
    })

    expect(input.aspect_ratio).toBe('16:9')
  })
})

describe('validateHiggsfieldInput', () => {
  it('lista todos los problemas juntos', () => {
    const problems = validateHiggsfieldInput(schemaOf('higgsfield-ai/soul/v2/standard'), { aspect_ratio: '5:7', batch_size: 2 })

    expect(problems).toEqual([
      'prompt: es obligatorio',
      expect.stringMatching(/^aspect_ratio: "5:7" no es válido/),
      expect.stringMatching(/^batch_size: 2 no es válido/)
    ])
  })

  it('rechaza campos extra sólo si el esquema declara additionalProperties: false', () => {
    // Recraft lo declara; SOUL 2 no (ahí decide la estimación del proveedor).
    expect(validateHiggsfieldInput(schemaOf('recraft/v4.1/text-to-image'), { prompt: 'x', extra: true })).toEqual([
      'extra: el endpoint no acepta este campo'
    ])
    expect(validateHiggsfieldInput(schemaOf('higgsfield-ai/soul/v2/standard'), { prompt: 'x', extra: true })).toEqual([])
  })

  it('Seedance referencias exige al menos una referencia', () => {
    const schema = schemaOf('bytedance/seedance-2.5/reference-to-video')

    expect(validateHiggsfieldInput(schema, { prompt: 'x' })).toEqual(['entrada: necesita al menos uno de image_urls, video_urls, audio_urls'])
    expect(validateHiggsfieldInput(schema, { prompt: 'x', audio_urls: ['https://a/x.wav'] })).toEqual([])
  })

  it('Kling O3: sin multi_shots rige la rama simple; con multi_shots exige multi_prompt', () => {
    const schema = schemaOf('kling-video/o3/first-last-frame')

    expect(validateHiggsfieldInput(schema, { prompt: 'x', first_frame_url: IMG })).toEqual([])
    expect(validateHiggsfieldInput(schema, { multi_shots: true, first_frame_url: IMG })).toContain('multi_prompt: es obligatorio')
  })

  it('valida rangos y URLs', () => {
    const problems = validateHiggsfieldInput(schemaOf('bytedance/seedance-2.5/image-to-video'), { image_url: 'local.png', duration: 40 })

    expect(problems).toEqual(expect.arrayContaining(['image_url: debe ser una URL pública http(s)', 'duration: máximo 30, llegó 40']))
  })
})

describe('precio por fórmula', () => {
  it('ordena resoluciones por costo', () => {
    expect(['4k', '480p', '1k', '1080p', 'raro'].sort((a, b) => rankHiggsfieldResolution(a) - rankHiggsfieldResolution(b))).toEqual([
      '480p',
      '1080p',
      '1k',
      '4k',
      'raro'
    ])
  })

  it('Wan 3.0: segundos × tarifa por resolución (default del proveedor 1080p, 5 s)', () => {
    expect(estimateHiggsfieldFormulaCost({ endpoint: 'alibaba/wan-3.0/text-to-video', input: {} })?.usd).toBe(1)
    expect(estimateHiggsfieldFormulaCost({ endpoint: 'alibaba/wan-3.0/text-to-video', input: { resolution: '480p', duration: 10 } })?.usd).toBe(0.5)
  })

  it('Seedance 2.5: tokens = segundos × área × 24 / 1024', () => {
    const estimate = estimateHiggsfieldFormulaCost({ endpoint: 'bytedance/seedance-2.5/text-to-video', input: { resolution: '480p', duration: 5 } })
    const tokens = Math.ceil((5 * 864 * 496 * 24) / 1024)

    expect(estimate?.usd).toBeCloseTo((tokens / 1000) * 0.0214, 3)
  })

  it('sin la duración del video de entrada no inventa un monto', () => {
    expect(
      estimateHiggsfieldFormulaCost({ endpoint: 'bytedance/seedance-2.5/video-edit', input: { resolution: '480p', video_url: 'https://v/x.mp4' } })
    ).toBeNull()

    expect(
      estimateHiggsfieldFormulaCost({ endpoint: 'bytedance/seedance-2.5/video-edit', input: { resolution: '480p', video_url: 'https://v/x.mp4' }, inputVideoSeconds: 4 })?.usd
    ).toBeGreaterThan(0)
  })

  it('un endpoint sin regla devuelve null', () => {
    expect(estimateHiggsfieldFormulaCost({ endpoint: 'kling-video/v3.0/std/text-to-video', input: {} })).toBeNull()
  })
})
