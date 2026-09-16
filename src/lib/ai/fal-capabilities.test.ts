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

  it('el video queda declarado pero sin verificar mientras no se ejercite', () => {
    const video = FAL_CAPABILITIES.filter(c => c.kind === 'video')

    expect(video.length).toBeGreaterThan(0)
    expect(video.every(c => c.outputKey === 'video')).toBe(true)
  })

  it('resuelve por id y devuelve undefined ante uno inexistente', () => {
    expect(findFalCapability('seedream5-pro-layerize')?.outputKey).toBe('layers')
    expect(findFalCapability('no-existe')).toBeUndefined()
  })
})
