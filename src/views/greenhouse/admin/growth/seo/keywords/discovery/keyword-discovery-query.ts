/**
 * TASK-1665 — Estado de la lente `Descubrir` que vive en la URL.
 *
 * Allowlist explícita, no un passthrough: la URL es compartible y el server la revalida, así
 * que cualquier clave que no esté acá simplemente no existe para esta lente. El input de seeds
 * NUNCA entra a la URL — es texto libre del operador y terminaría en logs de acceso.
 *
 * ⚠️ `maxDifficulty` NO está en el contrato, y su ausencia es deliberada (ISSUE-152): la
 * pantalla muestra **Barrera de enlaces** en niveles, derivada del perfil de enlaces real del
 * top-10, y el reader sólo sabe filtrar por la `keyword_difficulty` cruda del proveedor —que
 * colapsa a 0 en SERPs es-LATAM y ya no se enseña—. Un filtro sobre una cifra que la tabla no
 * muestra le pediría al operador decidir a ciegas.
 */

import type { SeoDiscoveryMethod, SeoDiscoveryRunStatus } from '@/lib/growth/seo/keyword-discovery/contracts'
import { SEO_DISCOVERY_METHODS, SEO_DISCOVERY_RUN_STATUSES } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoSearchIntent } from '@/lib/growth/seo/keyword-market-data'

/** Estado del candidato que la lente puede filtrar HOY, limitado a lo que el reader sostiene. */
export type KeywordDiscoveryStateFilter = 'all' | 'untracked'

export interface KeywordDiscoveryQuery {
  /** Corrida en foco. Sin ella el reader sólo devuelve el historial de corridas. */
  discoveryRun: string | null
  /** Búsqueda por texto dentro de los candidatos de la corrida. */
  q: string
  /** Procedencia (endpoint que produjo el candidato). */
  source: SeoDiscoveryMethod | 'all'
  intent: SeoSearchIntent | 'all'
  state: KeywordDiscoveryStateFilter
  status: SeoDiscoveryRunStatus | 'all'
  minVolume: number | null
}

const MAX_QUERY_CHARS = 120

const INTENTS: readonly SeoSearchIntent[] = ['informational', 'navigational', 'commercial', 'transactional']

const readParam = (params: URLSearchParams | Record<string, string | string[] | undefined>, key: string) => {
  if (params instanceof URLSearchParams) return params.get(key) ?? ''

  const raw = params[key]

  return typeof raw === 'string' ? raw : ''
}

/**
 * Parsea el estado desde `searchParams`. Un valor inválido **cae al default**, nunca rompe la
 * página: una URL compartida por chat puede llegar recortada, y un 500 por un query param es
 * una falla que el operador no puede arreglar.
 */
export const parseKeywordDiscoveryQuery = (
  params: URLSearchParams | Record<string, string | string[] | undefined>
): KeywordDiscoveryQuery => {
  const rawSource = readParam(params, 'source')
  const rawIntent = readParam(params, 'intent')
  const rawState = readParam(params, 'state')
  const rawStatus = readParam(params, 'status')
  const rawMinVolume = Number.parseInt(readParam(params, 'minVolume'), 10)

  return {
    discoveryRun: readParam(params, 'discoveryRun').trim() || null,
    q: readParam(params, 'q').trim().slice(0, MAX_QUERY_CHARS),
    source: (SEO_DISCOVERY_METHODS as readonly string[]).includes(rawSource)
      ? (rawSource as SeoDiscoveryMethod)
      : 'all',
    intent: (INTENTS as readonly string[]).includes(rawIntent) ? (rawIntent as SeoSearchIntent) : 'all',
    state: rawState === 'untracked' ? 'untracked' : 'all',
    status: (SEO_DISCOVERY_RUN_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as SeoDiscoveryRunStatus)
      : 'all',
    // Un volumen negativo o NaN no es "cero": es que no se pidió filtro.
    minVolume: Number.isFinite(rawMinVolume) && rawMinVolume > 0 ? rawMinVolume : null
  }
}

/**
 * Serializa de vuelta a query string, omitiendo defaults.
 *
 * Omitir los defaults mantiene la URL legible y hace que "sin filtros" tenga UNA sola
 * representación — si el default viajara explícito, dos URLs equivalentes se verían distintas
 * y el operador no sabría si comparte lo mismo.
 */
export const serializeKeywordDiscoveryQuery = (
  query: Partial<KeywordDiscoveryQuery>,
  base: { space?: string | null } = {}
): string => {
  const params = new URLSearchParams()

  if (base.space) params.set('space', base.space)

  params.set('view', 'discovery')

  if (query.discoveryRun) params.set('discoveryRun', query.discoveryRun)
  if (query.q) params.set('q', query.q)
  if (query.source && query.source !== 'all') params.set('source', query.source)
  if (query.intent && query.intent !== 'all') params.set('intent', query.intent)
  if (query.state && query.state !== 'all') params.set('state', query.state)
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.minVolume) params.set('minVolume', String(query.minVolume))

  return params.toString()
}
