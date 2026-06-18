import 'server-only'

import {
  PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
} from './types'
import { readPublicSiteGithubControlPlaneSnapshot } from './reader'

import type {
  PublicSiteGithubControlPlaneConfidence,
  PublicSiteGithubControlPlanePacket,
  PublicSiteGithubControlPlaneSnapshot,
  PublicSiteGithubReaderResult
} from './types'

export interface ComposePublicSiteGithubControlPlanePacketDeps {
  now?: () => Date
  readSnapshot?: () => Promise<PublicSiteGithubReaderResult<PublicSiteGithubControlPlaneSnapshot>>
}

const deriveConfidence = (
  result: PublicSiteGithubReaderResult<PublicSiteGithubControlPlaneSnapshot>
): PublicSiteGithubControlPlaneConfidence => {
  if (result.status === 'unavailable') return 'none'

  const okSources = result.sources.filter(source => source.status === 'ok').length

  const requiredSourcesOk =
    result.sources.some(source => source.source === 'github_repository' && source.status === 'ok') &&
    result.sources.some(source => source.source === 'github_runs' && source.status === 'ok') &&
    result.sources.some(source => source.source === 'github_workflows' && source.status === 'ok')

  if (requiredSourcesOk && result.data.commitCorrelation.status !== 'unknown') return 'high'
  if (requiredSourcesOk || okSources >= 4) return 'medium'

  return 'low'
}

export const composePublicSiteGithubControlPlanePacket = async (
  deps: ComposePublicSiteGithubControlPlanePacketDeps = {}
): Promise<PublicSiteGithubControlPlanePacket> => {
  const now = deps.now ?? (() => new Date())
  const readSnapshot = deps.readSnapshot ?? (() => readPublicSiteGithubControlPlaneSnapshot({ now }))
  const result = await readSnapshot()

  return {
    contractVersion: PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION,
    generatedAt: now().toISOString(),
    confidence: deriveConfidence(result),
    ...result.data
  }
}
