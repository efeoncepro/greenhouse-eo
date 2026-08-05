import { describe, expect, it } from 'vitest'

/**
 * TASK-1300 Slice 1 — registry de familias + `normalizeEndpoint` table-driven.
 *
 * El invariante que estos tests protegen es el candado: el caller declara una FAMILIA
 * nombrada, nunca un prefijo. Si alguien vuelve a abrir el cliente a un string arbitrario,
 * acá se rompe.
 */

import {
  DATAFORSEO_FAMILIES,
  DATAFORSEO_FAMILY_NAMES,
  isDataForSeoFamily,
  normalizeEndpoint,
  type DataForSeoFamily
} from '../dataforseo-families'

describe('DATAFORSEO_FAMILIES — allowlist cerrado', () => {
  it('declara exactamente las 5 familias del contrato', () => {
    expect(DATAFORSEO_FAMILY_NAMES.sort()).toEqual(['backlinks', 'domain', 'labs', 'onpage', 'serp'])
  })

  it('sólo `serp` puede correr sin organización', () => {
    // NO porque el AEO sea sólo para prospectos —un perfil del grader puede estar ligado a
    // una organización cliente (TASK-1243)—, sino porque el contexto del adapter AEO todavía
    // no transporta la organización. Ver la nota en `dataforseo-families.ts`.
    expect(DATAFORSEO_FAMILIES.serp.requiresOrganization).toBe(false)

    // Las 4 familias SEO son trabajo per-cliente: su gasto SIEMPRE se atribuye.
    for (const family of DATAFORSEO_FAMILY_NAMES.filter(name => name !== 'serp')) {
      expect(DATAFORSEO_FAMILIES[family].requiresOrganization).toBe(true)
    }
  })

  it('cada prefijo es una ruta /v3/ cerrada con barra', () => {
    // La barra final importa: sin ella, `/v3/serp` dejaría pasar `/v3/serpents/...`.
    for (const family of DATAFORSEO_FAMILY_NAMES) {
      expect(DATAFORSEO_FAMILIES[family].prefix).toMatch(/^\/v3\/[a-z_]+\/$/)
    }
  })

  it('reconoce familias válidas y rechaza cualquier otra cosa', () => {
    expect(isDataForSeoFamily('labs')).toBe(true)
    expect(isDataForSeoFamily('keywords_data')).toBe(false)
    expect(isDataForSeoFamily('__proto__')).toBe(false)
  })
})

describe('normalizeEndpoint — el candado por familia', () => {
  it('acepta el endpoint que corresponde a su familia', () => {
    expect(normalizeEndpoint('/v3/dataforseo_labs/google/keyword_ideas/live', 'labs')).toBe(
      '/v3/dataforseo_labs/google/keyword_ideas/live'
    )
    expect(normalizeEndpoint('/v3/serp/google/ai_mode/live/advanced', 'serp')).toBe(
      '/v3/serp/google/ai_mode/live/advanced'
    )
  })

  it('RECHAZA el endpoint de otra familia — este es el invariante de seguridad', () => {
    // Declarar `labs` y colar una ruta de `serp` es exactamente el bug que el candado ataja.
    expect(() => normalizeEndpoint('/v3/serp/google/organic/live/advanced', 'labs')).toThrow(
      /familia "labs"/
    )
    expect(() => normalizeEndpoint('/v3/dataforseo_labs/x', 'serp')).toThrow(/familia "serp"/)
  })

  it('rechaza rutas fuera del allowlist aunque sean de DataForSEO', () => {
    // `keywords_data` existe en el proveedor pero NO está en nuestro allowlist.
    expect(() => normalizeEndpoint('/v3/keywords_data/google_ads/search_volume/live', 'labs')).toThrow()
    expect(() => normalizeEndpoint('/v3/appendix/user_data', 'serp')).toThrow()
  })

  it('rechaza un prefijo que sólo parece de la familia', () => {
    expect(() => normalizeEndpoint('/v3/serpapi/algo', 'serp')).toThrow()
  })

  it('rechaza una familia desconocida en vez de dejar pasar la llamada', () => {
    expect(() => normalizeEndpoint('/v3/serp/x', 'inventada' as DataForSeoFamily)).toThrow(
      /desconocida/
    )
  })

  it('normaliza espacios accidentales sin relajar la validación', () => {
    expect(normalizeEndpoint('  /v3/backlinks/summary/live  ', 'backlinks')).toBe('/v3/backlinks/summary/live')
    expect(() => normalizeEndpoint('  /v3/serp/x  ', 'backlinks')).toThrow()
  })
})
