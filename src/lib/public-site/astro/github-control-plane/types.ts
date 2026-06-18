export const PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION =
  'public-site-github-control-plane.v1'

export type PublicSiteGithubControlPlaneConfidence = 'high' | 'medium' | 'low' | 'none'

export type PublicSiteGithubControlPlaneSourceName =
  | 'github_repository'
  | 'github_branches'
  | 'github_workflows'
  | 'github_runs'
  | 'github_issues'
  | 'github_pull_requests'
  | 'github_releases'
  | 'binding_correlation'

export type PublicSiteGithubControlPlaneSourceStatus =
  | 'ok'
  | 'degraded'
  | 'unavailable'
  | 'not_found'
  | 'skipped'

export interface PublicSiteGithubControlPlaneSourceHealth {
  source: PublicSiteGithubControlPlaneSourceName
  status: PublicSiteGithubControlPlaneSourceStatus
  checkedAt: string
  detail?: string
}

export interface PublicSiteGithubRepositoryIdentity {
  owner: 'efeoncepro'
  repo: 'efeonce-web'
  nameWithOwner: 'efeoncepro/efeonce-web'
  url: string
  defaultBranch: string | null
  isPrivate: boolean | null
  pushedAt: string | null
  updatedAt: string | null
}

export interface PublicSiteGithubBranchSnapshot {
  name: string
  protected: boolean
  sha: string | null
  shortSha: string | null
  url: string | null
}

export interface PublicSiteGithubWorkflowSnapshot {
  id: number
  name: string
  path: string
  state: string
  url: string
  htmlUrl: string | null
}

export interface PublicSiteGithubRunSnapshot {
  id: number
  name: string | null
  workflowId: number | null
  workflowName: string | null
  status: string | null
  conclusion: string | null
  event: string | null
  branch: string | null
  headSha: string | null
  shortHeadSha: string | null
  htmlUrl: string | null
  createdAt: string | null
  updatedAt: string | null
  runStartedAt: string | null
}

export interface PublicSiteGithubIssueSummary {
  openCount: number | null
  searchUrl: string
}

export interface PublicSiteGithubReleaseSummary {
  latestTag: string | null
  latestName: string | null
  publishedAt: string | null
  htmlUrl: string | null
  status: 'ok' | 'no_release' | 'unknown'
}

export interface PublicSiteGithubCommitCorrelation {
  status: 'matched' | 'deploy_behind_main' | 'deploy_sha_mismatch' | 'unknown'
  mainHeadSha: string | null
  latestCiHeadSha: string | null
  productionDeploySha: string | null
  detail: string
}

export interface PublicSiteGithubControlPlaneSnapshot {
  repository: PublicSiteGithubRepositoryIdentity | null
  branches: PublicSiteGithubBranchSnapshot[]
  workflows: PublicSiteGithubWorkflowSnapshot[]
  runs: PublicSiteGithubRunSnapshot[]
  pullRequests: PublicSiteGithubIssueSummary
  issues: PublicSiteGithubIssueSummary
  releases: PublicSiteGithubReleaseSummary
  commitCorrelation: PublicSiteGithubCommitCorrelation
  sources: PublicSiteGithubControlPlaneSourceHealth[]
  warnings: string[]
}

export interface PublicSiteGithubControlPlanePacket extends PublicSiteGithubControlPlaneSnapshot {
  contractVersion: typeof PUBLIC_SITE_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
  generatedAt: string
  confidence: PublicSiteGithubControlPlaneConfidence
}

export interface PublicSiteGithubReaderResult<T> {
  status: 'ok' | 'degraded' | 'unavailable'
  data: T
  sources: PublicSiteGithubControlPlaneSourceHealth[]
  warnings: string[]
}
