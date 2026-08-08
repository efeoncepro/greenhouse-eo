import type { RankEvolutionResult, SeoAeoGapResult, RankEvolutionSeries } from '@/lib/growth/seo/contracts'

export type SeoRankEvolutionReady = Extract<RankEvolutionResult, { ok: true }>
export type SeoAeoGapReady = Extract<SeoAeoGapResult, { ok: true }>

/**
 * Client-safe input for the SEO report adapter. The adapter accepts only already-resolved DTOs:
 * it never receives a database client, raw provider response or tenant selector.
 */
export interface SeoReportArtifactInput {
  organizationName: string
  seoTargetId: string
  asOfDate: string | null
  rankEvolution: SeoRankEvolutionReady | null
  gap: SeoAeoGapReady | null
}

export interface SeoReportArtifactPayload {
  organizationName: string
  seoTargetId: string
  asOfDate: string | null
  rankEvolution: {
    range: SeoRankEvolutionReady['range']
    series: RankEvolutionSeries[]
  } | null
  gap: SeoAeoGapReady | null
  summary: {
    positionAverage: number | null
    keywordCount: number
    pageOneCount: number
    opportunityCount: number | null
  }
  status: 'ready' | 'partial' | 'insufficient_data'
}
