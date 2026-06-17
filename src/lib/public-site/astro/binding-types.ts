import type { PlatformHealthSourceStatusKind } from '@/types/platform-health'

export const PUBLIC_SITE_ASTRO_BINDING_CONTRACT_VERSION = 'public-site-astro-binding.v1'

export type PublicSiteAstroBindingContractVersion =
  typeof PUBLIC_SITE_ASTRO_BINDING_CONTRACT_VERSION

export type PublicSiteAstroBindingStatus = 'ok' | 'degraded' | 'empty'
export type PublicSiteAstroBindingConfidence = 'high' | 'medium' | 'low' | 'none'

export type PublicSiteAstroBindingSourceName =
  | 'static_binding'
  | 'route_ownership'
  | 'github_repo_state'
  | 'vercel_deployments'

export interface PublicSiteAstroBindingDegradedSource {
  source: PublicSiteAstroBindingSourceName
  status: PlatformHealthSourceStatusKind
  observedAt: string
  summary: string
}

export interface PublicSiteAstroStaticBinding {
  canonicalUrl: string
  primarySeoSurface: string
  currentProductionRuntime: 'wordpress-kinsta'
  targetFrontendRuntime: 'astro-vercel'
  cmsOriginTarget: string
  isCurrentLiveSourceOfTruth: boolean
  isTargetFrontendRail: boolean
  repository: {
    provider: 'github'
    owner: 'efeoncepro'
    name: 'efeonce-web'
    url: string
    defaultBranch: 'main'
    trackedBranches: readonly ['main', 'develop']
  }
  vercel: {
    teamSlug: 'efeonce-7670142f'
    teamId: 'team_gmNiF4YCHmc1wqsHUTCvqjmN'
    projectName: 'efeonce-web'
    projectId: 'prj_i52CnPvaoNB0Lweqk7L7cLimv7W9'
  }
  sourceManifest: string
}

export interface PublicSiteAstroRouteOwnershipRow {
  route: string
  currentOwner: string
  targetOwner: string
  transitionPosture: string
  rule: string
}

export interface PublicSiteAstroGithubCommitSnapshot {
  branch: 'main' | 'develop'
  sha: string | null
  shortSha: string | null
  message: string | null
  committedAt: string | null
  htmlUrl: string | null
}

export interface PublicSiteAstroGithubState {
  repository: 'efeoncepro/efeonce-web'
  commits: PublicSiteAstroGithubCommitSnapshot[]
}

export type PublicSiteAstroDeployEnvironment = 'production' | 'staging'

export interface PublicSiteAstroDeploymentSnapshot {
  environment: PublicSiteAstroDeployEnvironment
  status: 'READY' | 'BUILDING' | 'ERROR' | 'CANCELED' | 'QUEUED' | 'EMPTY'
  uid: string | null
  url: string | null
  commitSha: string | null
  shortCommitSha: string | null
  createdAt: string | null
  ageHours: number | null
}

export interface PublicSiteAstroVercelState {
  projectId: string
  projectName: 'efeonce-web'
  deployments: PublicSiteAstroDeploymentSnapshot[]
}

export interface PublicSiteAstroBindingPacket {
  contractVersion: PublicSiteAstroBindingContractVersion
  generatedAt: string
  status: PublicSiteAstroBindingStatus
  confidence: PublicSiteAstroBindingConfidence
  binding: PublicSiteAstroStaticBinding
  routeOwnership: PublicSiteAstroRouteOwnershipRow[]
  github: PublicSiteAstroGithubState | null
  vercel: PublicSiteAstroVercelState | null
  degradedSources: PublicSiteAstroBindingDegradedSource[]
  notes: string[]
}
