import { describe, expect, it } from 'vitest'

import { FAL_CAPABILITIES, FAL_CAPABILITY_IDS, findFalCapability } from '@/lib/ai/fal-capabilities'

describe('registro de capacidades fal', () => {
  it('no repite ids ni slugs', () => {
    expect(new Set(FAL_CAPABILITY_IDS).size).toBe(FAL_CAPABILITIES.length)
    expect(new Set(FAL_CAPABILITIES.map(c => c.slug)).size).toBe(FAL_CAPABILITIES.length)
  })

  it.each(FAL_CAPABILITIES)('$id declara un contrato de entrada coherente', capability => {
    // Si recibe medios, tiene que decir por qué campo viajan; si no recibe, no puede declarar campo.
    if (capability.inputMedia === 'none') expect(capability.inputMediaField).toBeNull()
    else expect(capability.inputMediaField).not.toBeNull()

    // Un campo singular nunca transporta varias entradas, y el plural nunca una sola.
    if (capability.inputMediaField === 'image_url') expect(capability.inputMedia).toBe('one')
    if (capability.inputMediaField === 'image_urls') expect(capability.inputMedia).toBe('many')

    if (capability.inputMediaField === 'start_image_url' || capability.inputMediaField === 'video_url') {
      expect(capability.inputMedia).toBe('one')
    }
  })

  it.each(FAL_CAPABILITIES)('$id declara un slug literal, no compuesto', capability => {
    expect(capability.slug.trim()).toBe(capability.slug)
    expect(capability.slug).not.toContain('${')
    expect(capability.slug.split('/').length).toBeGreaterThanOrEqual(2)
  })

  it.each(FAL_CAPABILITIES)('$id sólo se declara verificado con una fecha real', capability => {
    if (capability.verifiedAt !== null) expect(capability.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  // El prefijo NO es una regla del proveedor sino del endpoint: Seedream 5 va sin `fal-ai/` y
  // Seedream 4/4.5 con él. Verificado contra el API de modelos el 2026-09-16. Este test existe para
  // que nadie "corrija" los slugs de la v5 agregándoles el prefijo por simetría: con él, el submit
  // responde 200 y el resultado da 404 — falla silenciosa.
  it('conserva los slugs de Seedream 5 SIN el prefijo fal-ai/', () => {
    const seedream5 = FAL_CAPABILITIES.filter(c => c.slug.includes('seedream/v5'))

    expect(seedream5.length).toBeGreaterThan(0)

    for (const capability of seedream5) {
      expect(capability.slug.startsWith('bytedance/')).toBe(true)
      expect(capability.slug.startsWith('fal-ai/')).toBe(false)
    }
  })

  it('toda capacidad de video operable declara su contrato y su salida', () => {
    const video = FAL_CAPABILITIES.filter(c => c.kind === 'video' && !c.unsupportedReason)

    expect(video.length).toBeGreaterThan(0)
    expect(video.every(c => c.outputKey === 'video')).toBe(true)
    // Sin contrato el CLI no podría validar límites y dejaría pasar un pedido que el proveedor cobra y rechaza.
    expect(video.every(c => Boolean(c.video))).toBe(true)
  })

  it.each(FAL_CAPABILITIES.filter(c => c.video))('$id declara límites de video plausibles', capability => {
    const contract = capability.video!

    if (contract.duration) {
      expect(contract.duration.min).toBeGreaterThan(0)
      expect(contract.duration.max).toBeGreaterThanOrEqual(contract.duration.min)
    } else {
      // Sin duración sólo se admite cuando el endpoint parte de un video o de un draft ya generado.
      expect(['video-edit', 'draft-enhance']).toContain(capability.operation)
    }

    // Sin resolución sólo en drafts o endpoints que heredan del origen.
    if (contract.resolutions.length === 0) {
      expect(contract.draftCache === 'produces' || contract.duration === null).toBe(true)
    }

    // Un aspect ratio vacío es legítimo, pero sólo cuando el encuadre lo impone un medio de entrada.
    if (contract.aspectRatios.length === 0) expect(['image_url', 'video_url', null]).toContain(capability.inputMediaField)
    else expect(contract.aspectRatios).toContain('16:9')

    if (contract.endImageRequired) expect(contract.acceptsEndImage).toBe(true)

    // Referencias y `task` sólo tienen sentido en reference-to-video; el último cuadro, sólo con imagen de partida.
    if (contract.references || contract.acceptsTask) expect(capability.operation).toBe('reference-to-video')
    if (contract.acceptsEndImage) expect(['image_url', 'start_image_url']).toContain(capability.inputMediaField)
    if (contract.promptExpansion) expect(contract.promptExpansion.modes).toContain(contract.promptExpansion.defaultMode)
  })

  it.each(FAL_CAPABILITIES.filter(c => c.operation === 'reference-to-video'))(
    '$id declara por qué campo viaja cada referencia',
    capability => {
      expect(capability.video?.references?.images?.field).toBe(capability.inputMediaField)
    }
  )

  // Asimetría real y contraintuitiva, verificada contra el OpenAPI de cada endpoint el 2026-09-16:
  // la versión NUEVA dura más pero rinde menos resolución. Si alguien "empareja" estos números por
  // simetría, el CLI empezaría a aceptar pedidos que el proveedor rechaza después de cobrar la cola.
  it('conserva la asimetría medida entre Seedance 2.5 y 2.0', () => {
    const v25 = FAL_CAPABILITIES.find(c => c.id === 'seedance25-t2v')?.video
    const v20 = FAL_CAPABILITIES.find(c => c.id === 'seedance20-t2v')?.video
    const mini = FAL_CAPABILITIES.find(c => c.id === 'seedance20-mini-t2v')?.video

    expect(v25?.duration?.max).toBe(30)
    expect(v20?.duration?.max).toBe(15)
    expect(v25?.resolutions).not.toContain('4k')
    expect(v20?.resolutions).toContain('4k')
    expect(mini?.supportsBitrateMode).toBe(false)
  })

  // `task` existe sólo en Seedance 2.5 reference-to-video. El CLI lo aceptaba en toda r2v y la 2.0 lo
  // rechazaba después de encolar.
  it('sólo Seedance 2.5 reference-to-video acepta task', () => {
    expect(FAL_CAPABILITIES.filter(c => c.video?.acceptsTask).map(c => c.id)).toEqual(['seedance25-r2v'])
  })

  // Minimax H3 cambia la FORMA de los campos respecto de Seedance (medido contra el OpenAPI 2026-09-16):
  // duración entera 5–15 sin `auto`, resolución en mayúsculas, referencias por `reference_*_urls` con topes,
  // y en Max/Turbo `prompt_expansion_mode` es obligatorio. Si se "normaliza" contra Seedance, el proveedor
  // rechaza el pedido después de encolarlo.
  it('conserva el contrato propio de Minimax H3', () => {
    const h3 = FAL_CAPABILITIES.filter(c => c.slug.startsWith('minimax/h3') && c.video)

    expect(h3.length).toBe(12)

    for (const capability of h3) {
      const contract = capability.video!

      expect(capability.slug.startsWith('fal-ai/')).toBe(false)
      expect(contract.duration).toEqual({ encoding: 'integer', min: 5, max: 15, acceptsAuto: false })
      expect(contract.resolutions.every(r => r === r.toUpperCase())).toBe(true)
      expect(contract.supportsBitrateMode).toBe(false)

      const isBase = capability.slug.startsWith('minimax/h3/')

      expect(contract.resolutions.includes('4K')).toBe(isBase)
      expect(contract.promptExpansion?.required).toBe(!isBase)
      expect(contract.loras !== undefined).toBe(capability.slug.endsWith('/lora'))

      if (capability.operation === 'reference-to-video') {
        expect(contract.references).toEqual({
          images: { field: 'reference_image_urls', max: 9 },
          videos: { field: 'reference_video_urls', max: 3 },
          audios: { field: 'reference_audio_urls', max: 3 }
        })
      }

      if (capability.operation === 'image-to-video') expect(contract.aspectRatios).toEqual([])
    }

    expect(findFalCapability('h3max-camera')?.video?.cameraTrajectory?.maxKeyframes).toBe(12)
    expect(findFalCapability('h3max-camera')?.requiresPrompt).toBe(false)
  })

  // Flux 3 en fal es VIDEO (medido contra el catálogo 2026-09-16): nadie debe "buscarlo" entre los modelos de
  // imagen. Sus slugs viven bajo blackforestlabs/, sin fal-ai/, y el flujo draft → enhance depende de que
  // cada draft declare que produce draft_cache y que sólo flux3-enhance lo consuma.
  it('conserva el contrato propio de Flux 3', () => {
    const flux3 = FAL_CAPABILITIES.filter(c => c.slug.startsWith('blackforestlabs/flux-3/'))

    expect(flux3.length).toBe(12)
    expect(flux3.every(c => c.kind === 'video' && Boolean(c.video))).toBe(true)

    const drafts = flux3.filter(c => c.slug.endsWith('/draft'))

    expect(drafts.length).toBe(5)
    expect(drafts.every(c => c.video?.draftCache === 'produces' && c.video.resolutions.length === 0)).toBe(true)
    expect(flux3.filter(c => c.video?.draftCache === 'consumes').map(c => c.id)).toEqual(['flux3-enhance'])

    expect(findFalCapability('flux3-t2v')?.video?.duration).toEqual({ encoding: 'integer', min: 5, max: 20, acceptsAuto: true })
    expect(findFalCapability('flux3-flf')?.video?.duration?.acceptsAuto).toBe(false)
    expect(findFalCapability('flux3-flf')?.video?.endImageRequired).toBe(true)
    expect(findFalCapability('flux3-keyframes')?.video?.keyframes).toEqual({ max: 10 })
    expect(findFalCapability('flux3-edit')?.video?.duration).toBeNull()
    expect(flux3.filter(c => c.inputMediaField === 'video_url').map(c => c.id).sort()).toEqual([
      'flux3-edit',
      'flux3-extend',
      'flux3-extend-draft'
    ])
  })

  // Seedance no tiene endpoint video-to-video: vive en reference-to-video (medido 2026-09-16). La 2.5 edita y
  // extiende con `task`; la 2.0 sólo usa el video como guía. Los topes y el mínimo de 4 s vienen del OpenAPI;
  // antes el registro decía 1 s y no declaraba topes, y el CLI dejaba pasar pedidos que fal rechaza.
  it('conserva el contrato de referencias y duración medido en Seedance', () => {
    const seedance = FAL_CAPABILITIES.filter(c => c.slug.startsWith('bytedance/seedance-2'))

    expect(seedance.every(c => c.video?.duration?.min === 4)).toBe(true)

    for (const capability of seedance.filter(c => c.operation === 'reference-to-video')) {
      const is25 = capability.id === 'seedance25-r2v'

      expect(capability.video?.requiresVisualReference).toBe(true)
      expect(capability.video?.references).toEqual({
        images: { field: 'image_urls', max: is25 ? 30 : 9 },
        videos: { field: 'video_urls', max: is25 ? 10 : 3 },
        audios: { field: 'audio_urls', max: is25 ? 10 : 3 }
      })
    }
  })

  // Aislado con corridas reales 2026-09-16: extender un video SIN pista de audio falla en fal con un 422
  // genérico después de encolar, sin importar la duración. El CLI lo detecta antes gracias a este flag.
  it('marca que extender Flux 3 exige pista de audio en el origen', () => {
    const extend = FAL_CAPABILITIES.filter(c => c.operation === 'video-extend')

    expect(extend.map(c => c.id).sort()).toEqual(['flux3-extend', 'flux3-extend-draft'])
    expect(extend.every(c => c.video?.requiresSourceAudio === true)).toBe(true)
  })

  // Wan 3.0 (medido contra el OpenAPI 2026-09-16): `auto` viaja como null ("smart duration"), el audio por `audio`,
  // la expansión de prompt es booleana y sólo referencias a video se basa en una web o un documento.
  it('conserva el contrato propio de Wan 3.0 y Wan 3.0 Prime', () => {
    const wan = FAL_CAPABILITIES.filter(c => c.slug.startsWith('alibaba/wan-3.0'))

    expect(wan.map(c => c.id).sort()).toEqual([
      'wan3-i2v',
      'wan3-r2v',
      'wan3-t2v',
      'wan3prime-i2v',
      'wan3prime-r2v',
      'wan3prime-t2v'
    ])

    for (const capability of wan) {
      const contract = capability.video!

      expect(contract.duration).toEqual({ encoding: 'integer', min: 2, max: 30, acceptsAuto: true, autoValue: null })
      expect(contract.audioField).toBe('audio')
      expect(contract.promptExpansionToggle).toBe(true)
      expect(contract.thinking?.groundingSources).toBe(capability.operation === 'reference-to-video')
    }

    expect(findFalCapability('wan3-i2v')?.inputMediaField).toBe('start_image_url')
    expect(findFalCapability('wan3-r2v')?.video?.references).toEqual({
      images: { field: 'reference_image_urls', max: 10 },
      videos: { field: 'reference_video_urls', max: 5 },
      audios: { field: 'reference_audio_urls', max: 5 }
    })
  })

  it('declara el director de H3 como no operable por cola, sin verificar', () => {
    const director = findFalCapability('h3max-director')

    expect(director?.unsupportedReason).toBeTruthy()
    expect(director?.verifiedAt).toBeNull()
    expect(FAL_CAPABILITIES.filter(c => c.unsupportedReason).every(c => c.verifiedAt === null)).toBe(true)
  })

  it('los entrenadores de LoRA declaran dataset y rangos, y entregan la LoRA', () => {
    const trainers = FAL_CAPABILITIES.filter(c => c.kind === 'training')

    expect(trainers.map(c => c.id).sort()).toEqual(['h3-train-flf2v', 'h3-train-i2v', 'h3-train-ref2va', 'h3-train-t2v'])

    for (const trainer of trainers) {
      expect(trainer.outputKey).toBe('lora_file')
      expect(trainer.training?.dataField).toBe('training_data_url')
      expect(trainer.training?.steps).toEqual({ min: 1, max: 15_000, defaultValue: 2000 })
      expect(trainer.video).toBeUndefined()
    }
  })

  it('no quedan capacidades de Gemini Omni: ese carril va directo por Google, no por fal', () => {
    expect(FAL_CAPABILITIES.some(c => c.slug.includes('gemini-omni'))).toBe(false)
  })

  it('resuelve por id y devuelve undefined ante uno inexistente', () => {
    expect(findFalCapability('seedream5-pro-layerize')?.outputKey).toBe('layers')
    expect(findFalCapability('no-existe')).toBeUndefined()
  })
})
