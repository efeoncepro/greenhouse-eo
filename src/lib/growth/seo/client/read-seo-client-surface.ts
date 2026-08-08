import 'server-only'

import type { SeoAeoGapResult, RankEvolutionResult } from '../contracts'
import { readSeoAeoGap } from '../gap/read-seo-aeo-gap'
import { readRankEvolution } from '../rank-evolution-reader'
import { readSeoOverviewConnection, type SeoOverviewConnection } from '../overview/read-overview-connection'
import { resolveActiveSeoTargetId } from '../overview/read-overview-sidebar'

/**
 * TASK-1310 — read orchestration for the client SEO surfaces.
 *
 * This is a consumer adapter, not a new source of truth: it resolves the active target and
 * composes the existing readers independently. A failure in the rank series must not erase the
 * quadrant (or the other way around), so each result remains explicit and `null` means that the
 * reader was not requested because the connection/target was not ready.
 */
export interface SeoClientSurfaceRead {
  organizationId: string
  seoTargetId: string | null
  connection: SeoOverviewConnection
  rankEvolution: RankEvolutionResult | null
  gap: SeoAeoGapResult | null
  rankReaderFailed: boolean
  gapReaderFailed: boolean
}

export const readSeoClientSurface = async (organizationId: string): Promise<SeoClientSurfaceRead> => {
  const connection = await readSeoOverviewConnection(organizationId)
  const seoTargetId = await resolveActiveSeoTargetId(organizationId)

  if (connection.state !== 'connected' || !seoTargetId) {
    return {
      organizationId,
      seoTargetId,
      connection,
      rankEvolution: null,
      gap: null,
      rankReaderFailed: false,
      gapReaderFailed: false
    }
  }

  const [rankResult, gapResult] = await Promise.allSettled([
    readRankEvolution(seoTargetId, { rangeDays: 90, device: 'desktop' }),
    readSeoAeoGap(seoTargetId, { windowDays: 28 })
  ])

  return {
    organizationId,
    seoTargetId,
    connection,
    rankEvolution: rankResult.status === 'fulfilled' ? rankResult.value : null,
    gap: gapResult.status === 'fulfilled' ? gapResult.value : null,
    rankReaderFailed: rankResult.status === 'rejected',
    gapReaderFailed: gapResult.status === 'rejected'
  }
}
