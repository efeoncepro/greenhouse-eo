import 'server-only'

import {
  KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
} from './types'
import { readKortexGithubControlPlaneSnapshot } from './reader'

import type {
  KortexGithubControlPlaneConfidence,
  KortexGithubControlPlanePacket,
  KortexGithubReaderResult,
  KortexGithubControlPlaneSnapshot
} from './types'

export interface ComposeKortexGithubControlPlanePacketDeps {
  now?: () => Date
  readSnapshot?: () => Promise<KortexGithubReaderResult<KortexGithubControlPlaneSnapshot>>
}

const deriveConfidence = (
  result: KortexGithubReaderResult<KortexGithubControlPlaneSnapshot>
): KortexGithubControlPlaneConfidence => {
  if (result.status === 'unavailable') return 'none'

  const okSources = result.sources.filter(source => source.status === 'ok').length

  const requiredSourcesOk = result.sources.some(source => source.source === 'github_repository' && source.status === 'ok') &&
    result.sources.some(source => source.source === 'github_runs' && source.status === 'ok') &&
    result.sources.some(source => source.source === 'github_workflows' && source.status === 'ok')

  if (requiredSourcesOk && result.data.runtimeCorrelation.status !== 'unknown') return 'high'

  if (requiredSourcesOk || okSources >= 4) return 'medium'

  return 'low'
}

export const composeKortexGithubControlPlanePacket = async (
  deps: ComposeKortexGithubControlPlanePacketDeps = {}
): Promise<KortexGithubControlPlanePacket> => {
  const now = deps.now ?? (() => new Date())
  const readSnapshot = deps.readSnapshot ?? (() => readKortexGithubControlPlaneSnapshot({ now }))
  const result = await readSnapshot()

  return {
    contractVersion: KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION,
    generatedAt: now().toISOString(),
    confidence: deriveConfidence(result),
    ...result.data
  }
}
