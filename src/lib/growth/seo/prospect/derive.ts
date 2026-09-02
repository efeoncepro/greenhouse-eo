/**
 * TASK-1709 Slice 3 — Derivación: evidencia cruda del proveedor → hechos con lente.
 *
 * Módulo PURO (sin base de datos, sin red): recibe los items crudos del colector y
 * emite `ProspectFact[]`. Cada hecho lleva `lens: 'estimated'`, `capturedAt` y su
 * fuente. CERO score, CERO veredicto de salud, CERO cifra de mercado, CERO lift —
 * el contrato de salida no tiene campo para nada de eso, a propósito.
 *
 * Regla de degradación honesta: una fuente que falló no emite hechos (la procedencia
 * la omite); `magnitude: null` significa "preguntamos y no hay dato", JAMÁS `0`.
 */

import type { ProspectFact } from './contracts'
import { AI_OVERVIEW_ETV_ATTRIBUTION } from '../etv-methodology/contracts'
import { PROSPECT_RANKED_KEYWORDS_LIMIT } from './contracts'
import type { ProspectMarketEvidence } from './collect'

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null

const SAMPLE_LIMIT = 15

interface RankedItem {
  type: string | null
  rankGroup: number | null
  keyword: string | null
  etv: number | null
}

const parseRankedItem = (raw: unknown): RankedItem => {
  const item = asRecord(raw)
  const serpElement = asRecord(item?.ranked_serp_element)
  const serpItem = asRecord(serpElement?.serp_item)
  const keywordData = asRecord(item?.keyword_data)

  return {
    type: typeof serpItem?.type === 'string' ? serpItem.type : null,
    rankGroup: typeof serpItem?.rank_group === 'number' ? serpItem.rank_group : null,
    keyword: typeof keywordData?.keyword === 'string' ? keywordData.keyword : null,
    etv: typeof serpItem?.etv === 'number' ? serpItem.etv : null
  }
}

const factAt = (capturedAt: string) => (partial: Omit<ProspectFact, 'lens' | 'capturedAt'>): ProspectFact => ({
  ...partial,
  lens: 'estimated',
  capturedAt
})

/**
 * Deriva los hechos de mercado. `capturedAt` es el instante de la corrida (el as-of
 * que toda cifra de este carril debe declarar).
 */
export const deriveProspectMarketFacts = (
  evidence: ProspectMarketEvidence,
  capturedAt: string = new Date().toISOString()
): ProspectFact[] => {
  const make = factAt(capturedAt)
  const facts: ProspectFact[] = []

  if (evidence.rankedKeywords.ok) {
    const items = evidence.rankedKeywords.items.map(parseRankedItem)
    const organic = items.filter(item => item.type === 'organic')
    const top10 = organic.filter(item => item.rankGroup !== null && item.rankGroup <= 10)

    const strikingDistance = organic.filter(
      item => item.rankGroup !== null && item.rankGroup >= 11 && item.rankGroup <= 20
    )

    const aiOverviewCitations = items.filter(item => item.type === 'ai_overview_reference')

    const etvValues = organic.map(item => item.etv).filter((value): value is number => value !== null)
    const totalEtv = etvValues.length > 0 ? Math.round(etvValues.reduce((sum, value) => sum + value, 0)) : null

    facts.push(
      make({
        kind: 'ranked_keywords_total',
        magnitude: organic.length,
        source: 'labs_ranked_keywords',
        // El limit del colector es una COTA de costo: si la respuesta llegó llena, el
        // conteo es un PISO de la superficie real, y el detalle lo declara (honestidad
        // verificada en la corrida real de SKY: 1000/1000 items → sampleCapped).
        detail: { sampleCapped: evidence.rankedKeywords.items.length >= PROSPECT_RANKED_KEYWORDS_LIMIT }
      }),
      make({
        kind: 'ranked_keywords_top10',
        magnitude: top10.length,
        source: 'labs_ranked_keywords',
        detail: { sample: top10.slice(0, SAMPLE_LIMIT).map(item => item.keyword).filter(Boolean) }
      }),
      make({
        kind: 'striking_distance_keywords',
        magnitude: strikingDistance.length,
        source: 'labs_ranked_keywords',
        detail: { sample: strikingDistance.slice(0, SAMPLE_LIMIT).map(item => item.keyword).filter(Boolean) }
      }),
      make({
        kind: 'ai_overview_citations',
        magnitude: aiOverviewCitations.length,
        source: 'labs_ranked_keywords',
        detail: {
          sample: aiOverviewCitations.slice(0, SAMPLE_LIMIT).map(item => item.keyword).filter(Boolean),
          // TASK-1805 — el ETV de una cita AIO es reparto MODELADO entre dominios citados, nunca
          // clics observados por cita: se cuenta la cita, no se suma su ETV al tráfico.
          etvAttribution: AI_OVERVIEW_ETV_ATTRIBUTION,
          etvSummed: false
        }
      }),
      make({
        kind: 'estimated_monthly_traffic',
        // null = el proveedor no trajo ETV, que NO es "tráfico cero".
        magnitude: totalEtv,
        source: 'labs_ranked_keywords',
        detail: {
          basis: 'etv_sum_organic',
          // TASK-1805 — el hecho declara su fórmula y la cobertura de la muestra que sumó: el
          // limit del colector es una COTA; si la respuesta llegó llena, la suma es un PISO.
          etvMethodologyVersion: evidence.etvMethodology.version,
          sampleRows: organic.length,
          rowsWithEtv: etvValues.length,
          rowLimit: PROSPECT_RANKED_KEYWORDS_LIMIT,
          truncated: evidence.rankedKeywords.items.length >= PROSPECT_RANKED_KEYWORDS_LIMIT
        }
      })
    )
  }

  if (evidence.competitorsDomain.ok) {
    const competitors = evidence.competitorsDomain.items
      .map(raw => {
        const item = asRecord(raw)

        return {
          domain: typeof item?.domain === 'string' ? item.domain : null,
          avgPosition: typeof item?.avg_position === 'number' ? item.avg_position : null,
          intersections: typeof item?.intersections === 'number' ? item.intersections : null
        }
      })
      .filter(entry => entry.domain !== null)

    facts.push(
      make({
        kind: 'competitors_identified',
        magnitude: competitors.length,
        source: 'labs_competitors_domain',
        detail: { competitors: competitors.slice(0, SAMPLE_LIMIT) }
      })
    )
  }

  if (evidence.domainIntersection.ok) {
    const referringDomains = evidence.domainIntersection.items
      .map(raw => {
        const item = asRecord(raw)
        const candidate = item?.referring_domain ?? item?.domain ?? item?.target

        return typeof candidate === 'string' ? candidate : null
      })
      .filter((domain): domain is string => domain !== null)

    facts.push(
      make({
        kind: 'link_gap_referring_domains',
        magnitude: evidence.domainIntersection.items.length,
        source: 'backlinks_domain_intersection',
        detail: { sample: referringDomains.slice(0, SAMPLE_LIMIT) }
      })
    )
  }

  return facts
}
