import type { ProbeKind, ProbeResult } from '../probes/contracts'
import type { PublicGraderReport, PublicReportRecommendation } from '../report/contracts'

export const FIX_IT_ARTIFACT_VERSION = 'ai_visibility_fix_it_v1' as const

export const FIX_IT_ARTIFACT_KINDS = [
  'json_ld_starter',
  'llms_txt_starter',
  'content_brief_aeo',
  'entity_action_brief'
] as const

export type FixItArtifactKind = (typeof FIX_IT_ARTIFACT_KINDS)[number]

export interface FixItProfileInput {
  brandName: string
  websiteUrl: string | null
  market: string
  locale: string
  category: string | null
  competitorsDeclared: string[]
}

export interface FixItArtifactSource {
  artifactVersion: typeof FIX_IT_ARTIFACT_VERSION
  reportVersion: string
  recommendationPackVersion: string
  scoreVersion: string
  probeLayerVersions: string[]
}

export interface FixItArtifact {
  kind: FixItArtifactKind
  filename: string
  mimeType: 'application/ld+json' | 'text/markdown' | 'text/plain'
  title: string
  description: string
  content: string
  publicSafe: true
  source: FixItArtifactSource
  derivedFrom: {
    recommendationGapKeys: string[]
    probeKinds: ProbeKind[]
  }
  pendingFields: string[]
}

export interface GenerateFixItArtifactsInput {
  runId: string
  profile: FixItProfileInput
  publicReport: PublicGraderReport
  probeResults: ProbeResult[]
}

export interface GenerateFixItArtifactsResult {
  runId: string
  artifacts: FixItArtifact[]
}

export const isMeasuredGap = (probe: ProbeResult): boolean =>
  probe.status === 'succeeded' && typeof probe.score === 'number' && probe.score < 70

export const recommendationKeys = (recommendations: PublicReportRecommendation[]): string[] =>
  [...new Set(recommendations.map(recommendation => recommendation.gapKey))]
