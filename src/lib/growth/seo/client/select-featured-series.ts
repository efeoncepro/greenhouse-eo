import type { RankEvolutionSeries } from '@/lib/growth/seo/contracts'

/**
 * Chooses a legible subset for the visual chart while keeping the complete series
 * available to the tabular fallback. A premium chart should explain a pattern first,
 * not make the user decode every tracked keyword at once.
 */
export const selectFeaturedRankSeries = (series: RankEvolutionSeries[], limit = 5): RankEvolutionSeries[] => {
  if (limit <= 0) return []

  return [...series]
    .map(serie => ({
      serie,
      latestPosition: [...serie.points].reverse().find(point => point.position !== null)?.position ?? Number.POSITIVE_INFINITY
    }))
    .sort((left, right) => left.latestPosition - right.latestPosition || left.serie.keyword.localeCompare(right.serie.keyword))
    .slice(0, limit)
    .map(entry => entry.serie)
}

