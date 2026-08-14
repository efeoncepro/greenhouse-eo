/**
 * ISSUE-153 — Resolución canónica de target SEO por organización, con el mercado como
 * dimensión EXPLÍCITA.
 *
 * Antes de esto, cuatro callsites (lane ecosystem, performance, sidebar del cockpit, página
 * de keywords) copiaban el mismo `ORDER BY created_at DESC LIMIT 1`: con dos mercados activos
 * cada superficie servía el target creado más recientemente y descartaba el resto — sin
 * error, sin señal, y sin declarar qué país estaba mostrando. La suposición "una org = un
 * mercado" vivía en un LIMIT 1 sin comentario.
 *
 * El oficio SEO no la sostiene: un "mercado" es `(país, idioma)` y es una dimensión del
 * análisis, jamás un promedio — la posición #3 en México y la #12 en Chile son experimentos
 * distintos (skill `seo-aeo` §06; es-CL ≠ es-MX hasta en el vocabulario). Efeonce misma opera
 * en CL/MX/CO/PE. El schema ya lo modelaba bien (`UNIQUE (org, domain, location, language)`);
 * este helper hace que el read path lo diga en voz alta:
 *
 *   - 1 target activo               → `resolved` (y la respuesta DECLARA el mercado servido)
 *   - N activos + selector          → `resolved` con el mercado pedido
 *   - N activos sin selector        → `multiple_markets` con la lista — NUNCA elegir callado
 *   - selector que no matchea       → `market_not_found` con la lista
 *   - 0 activos                     → `none`
 *
 * 🔴 NUNCA volver a resolver un target por org con SQL inline en un consumer: este helper es
 * el único dueño de esa decisión.
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface SeoMarketTarget {
  seoTargetId: string
  rootDomain: string
  locationCode: string
  languageCode: string
  /** Etiqueta ISO-2 declarada al configurar el target (`'MX'`, `'CL'`); puede ser null. */
  market: string | null
}

export type SeoTargetResolution =
  | { status: 'resolved'; target: SeoMarketTarget; activeMarkets: SeoMarketTarget[] }
  | { status: 'multiple_markets'; markets: SeoMarketTarget[] }
  | { status: 'market_not_found'; requestedMarket: string; markets: SeoMarketTarget[] }
  | { status: 'none' }

/**
 * Resuelve el target de una organización, opcionalmente fijando el mercado.
 *
 * `market` acepta la etiqueta ISO-2 (`'MX'`, case-insensitive) o el `location_code` del
 * proveedor (`'2484'`). Sin selector y con un solo activo, resuelve ese; con varios, se niega
 * a elegir.
 */
export const resolveSeoTargetForMarket = async (
  organizationId: string,
  options: { market?: string | null } = {}
): Promise<SeoTargetResolution> => {
  const rows = await runGreenhousePostgresQuery<{
    seo_target_id: string
    root_domain: string
    location_code: string
    language_code: string
    market: string | null
  }>(
    // Orden estable por antigüedad: la LISTA es determinista, pero el orden jamás decide
    // qué mercado se sirve — eso lo hace el selector o la unicidad.
    `SELECT seo_target_id, root_domain, location_code, language_code, market
       FROM greenhouse_growth.seo_targets
      WHERE organization_id = $1
        AND status = 'active'
      ORDER BY created_at ASC`,
    [organizationId]
  )

  const targets: SeoMarketTarget[] = rows.map(row => ({
    seoTargetId: row.seo_target_id,
    rootDomain: row.root_domain,
    locationCode: row.location_code,
    languageCode: row.language_code,
    market: row.market
  }))

  if (targets.length === 0) return { status: 'none' }

  const requested = options.market?.trim() || null

  if (requested) {
    const needle = requested.toLowerCase()

    const match = targets.find(
      target => target.market?.toLowerCase() === needle || target.locationCode === requested
    )

    if (!match) {
      return { status: 'market_not_found', requestedMarket: requested, markets: targets }
    }

    return { status: 'resolved', target: match, activeMarkets: targets }
  }

  if (targets.length > 1) {
    return { status: 'multiple_markets', markets: targets }
  }

  return { status: 'resolved', target: targets[0], activeMarkets: targets }
}

/**
 * Variante para superficies que todavía NO tienen selector de mercado (sidebar del cockpit,
 * página de keywords): resuelve sólo cuando es INEQUÍVOCO y devuelve `null` en cualquier otro
 * caso, dejando el conflicto visible en el resultado para que el caller lo observe — la
 * alternativa era servir un país al azar, que es exactamente el bug que este módulo elimina.
 */
export const resolveUnambiguousSeoTarget = async (
  organizationId: string
): Promise<{ target: SeoMarketTarget | null; conflict: SeoMarketTarget[] | null }> => {
  const resolution = await resolveSeoTargetForMarket(organizationId)

  if (resolution.status === 'resolved') return { target: resolution.target, conflict: null }
  if (resolution.status === 'multiple_markets') return { target: null, conflict: resolution.markets }

  return { target: null, conflict: null }
}
