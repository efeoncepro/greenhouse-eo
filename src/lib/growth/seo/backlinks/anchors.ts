/**
 * TASK-1777 — Lectura de sobre-optimización de anchors (Detailed Spec §4).
 *
 * El proxy `toxic_share` del padre responde "¿de qué barrio vienen mis enlaces?" (spam score
 * promedio del perfil). Esta derivación responde OTRA pregunta: "¿parece natural cómo me
 * enlazan?" — un sitio puede tener enlaces de dominios impecables y un perfil de anchors
 * artificial (60% de los enlaces con el mismo texto exacto de dinero), que es señal clásica
 * de manipulación. Dos diagnósticos, dos remedios: uno se arregla desautorizando, el otro
 * diversificando el anchor de campañas futuras. Por eso conviven y `toxic_share` NO se toca.
 *
 * 🔴 La derivación vive ACÁ (server-side, en el primitive). Ponerla en el consumer
 * garantizaría que la UI, Nexa y el MCP calculen tres cifras distintas del mismo perfil.
 */

import 'server-only'

/** Clasificación de un anchor. Vocabulario cerrado; el reader la expone tal cual. */
export type AnchorClass = 'brand' | 'generic' | 'url' | 'other'

/** Anchors genéricos frecuentes (es + en). Señal de naturalidad, no de manipulación. */
const GENERIC_ANCHORS: ReadonlySet<string> = new Set([
  'aquí',
  'aqui',
  'click aquí',
  'click aqui',
  'haz click',
  'haz clic',
  'ver más',
  'ver mas',
  'leer más',
  'leer mas',
  'sitio web',
  'página web',
  'pagina web',
  'sitio',
  'página',
  'pagina',
  'fuente',
  'enlace',
  'link',
  'web',
  'inicio',
  'este sitio',
  'este enlace',
  'más información',
  'mas informacion',
  'click here',
  'click',
  'here',
  'website',
  'site',
  'read more',
  'more',
  'learn more',
  'source',
  'homepage',
  'home',
  'visit',
  'this site',
  'this website',
  'link here'
])

const URL_LIKE = /^(https?:\/\/|www\.)|(\.[a-z]{2,}(\/|$))/i

/**
 * Tokens de marca derivados del dominio del target: el label principal + el dominio entero.
 * `berel.com.mx` → ['berel', 'berel.com.mx']. Puro y exportado para tests.
 */
export const deriveBrandTokens = (rootDomain: string): string[] => {
  const normalized = rootDomain.trim().toLowerCase().replace(/^www\./, '')
  const label = normalized.split('.')[0] ?? ''

  return [...new Set([label, normalized].filter(token => token.length >= 3))]
}

/** Clasifica UN anchor. Pura y exportada: es la regla de producto y se prueba sin base. */
export const classifyAnchor = (anchor: string, brandTokens: readonly string[]): AnchorClass => {
  const normalized = anchor.trim().toLowerCase()

  if (!normalized) return 'generic'
  if (URL_LIKE.test(normalized)) return 'url'
  if (brandTokens.some(token => normalized.includes(token))) return 'brand'
  if (GENERIC_ANCHORS.has(normalized)) return 'generic'

  return 'other'
}

export interface AnchorProfileInput {
  anchor: string
  /** Peso: cantidad de backlinks con ese anchor. */
  backlinks: number | null
}

export interface AnchorOverOptimizationProfile {
  /** Total de backlinks ponderados en la lectura. */
  totalBacklinks: number
  distinctAnchors: number
  /** El anchor con más backlinks y su participación (0-1) — la señal de concentración. */
  dominantAnchor: string | null
  dominantShare: number | null
  /** Mezcla ponderada por backlinks. `otherShare` ≈ anchors de keyword/dinero (exact-match). */
  brandShare: number | null
  genericShare: number | null
  urlShare: number | null
  otherShare: number | null
}

/**
 * Deriva el perfil de sobre-optimización desde las filas de anchors persistidas.
 *
 * Sin veredicto automático a propósito: entrega concentración y mezcla; el juicio ("esto es
 * manipulación") es del especialista, con la task de UI heredando el contrato. Un perfil sin
 * pesos (todos los `backlinks` NULL) devuelve shares null — jamás ceros fantasma.
 */
export const deriveAnchorProfile = (
  anchors: readonly AnchorProfileInput[],
  brandTokens: readonly string[]
): AnchorOverOptimizationProfile => {
  const weighted = anchors.filter(entry => entry.backlinks !== null && entry.backlinks > 0)
  const totalBacklinks = weighted.reduce((sum, entry) => sum + (entry.backlinks ?? 0), 0)

  if (totalBacklinks === 0) {
    return {
      totalBacklinks: 0,
      distinctAnchors: anchors.length,
      dominantAnchor: null,
      dominantShare: null,
      brandShare: null,
      genericShare: null,
      urlShare: null,
      otherShare: null
    }
  }

  const byClass: Record<AnchorClass, number> = { brand: 0, generic: 0, url: 0, other: 0 }
  let dominant: AnchorProfileInput | null = null

  for (const entry of weighted) {
    byClass[classifyAnchor(entry.anchor, brandTokens)] += entry.backlinks ?? 0

    if (dominant === null || (entry.backlinks ?? 0) > (dominant.backlinks ?? 0)) {
      dominant = entry
    }
  }

  const share = (value: number): number => Number((value / totalBacklinks).toFixed(4))

  return {
    totalBacklinks,
    distinctAnchors: anchors.length,
    dominantAnchor: dominant?.anchor ?? null,
    dominantShare: dominant ? share(dominant.backlinks ?? 0) : null,
    brandShare: share(byClass.brand),
    genericShare: share(byClass.generic),
    urlShare: share(byClass.url),
    otherShare: share(byClass.other)
  }
}
