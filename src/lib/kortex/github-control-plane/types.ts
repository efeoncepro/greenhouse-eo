export const KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION =
  'greenhouse-kortex-github-control-plane.v1'

export type KortexGithubControlPlaneConfidence = 'high' | 'medium' | 'low' | 'none'

export type KortexGithubControlPlaneSourceName =
  | 'github_repository'
  | 'github_branches'
  | 'github_workflows'
  | 'github_runs'
  | 'github_issues'
  | 'github_pull_requests'
  | 'github_releases'
  | 'runtime_correlation'

export type KortexGithubControlPlaneSourceStatus =
  | 'ok'
  | 'degraded'
  | 'unavailable'
  | 'not_found'
  | 'skipped'

export interface KortexGithubControlPlaneSourceHealth {
  source: KortexGithubControlPlaneSourceName
  status: KortexGithubControlPlaneSourceStatus
  checkedAt: string
  detail?: string
}

export interface KortexGithubRepositoryIdentity {
  owner: 'efeoncepro'
  repo: 'kortex'
  nameWithOwner: 'efeoncepro/kortex'
  url: string
  defaultBranch: string | null
  isPrivate: boolean | null
  pushedAt: string | null
  updatedAt: string | null
}

export interface KortexGithubBranchSnapshot {
  name: string
  protected: boolean
  sha: string | null
  shortSha: string | null
  url: string | null
}

export interface KortexGithubWorkflowSnapshot {
  id: number
  name: string
  path: string
  state: string
  url: string
  htmlUrl: string | null
}

export interface KortexGithubRunSnapshot {
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

export interface KortexGithubIssueSummary {
  openCount: number | null
  searchUrl: string
}

export interface KortexGithubReleaseSummary {
  latestTag: string | null
  latestName: string | null
  publishedAt: string | null
  htmlUrl: string | null
  status: 'ok' | 'no_release' | 'unknown'
}

export interface KortexGithubRuntimeCorrelation {
  status: 'matched' | 'mismatch' | 'unknown'
  mainHeadSha: string | null
  latestCiHeadSha: string | null
  runtimeReportedSha: string | null
  detail: string
}

export interface KortexGithubControlPlaneSnapshot {
  repository: KortexGithubRepositoryIdentity | null
  branches: KortexGithubBranchSnapshot[]
  workflows: KortexGithubWorkflowSnapshot[]
  runs: KortexGithubRunSnapshot[]
  pullRequests: KortexGithubIssueSummary
  issues: KortexGithubIssueSummary
  releases: KortexGithubReleaseSummary
  runtimeCorrelation: KortexGithubRuntimeCorrelation
  sources: KortexGithubControlPlaneSourceHealth[]
  warnings: string[]
}

export interface KortexGithubControlPlanePacket extends KortexGithubControlPlaneSnapshot {
  contractVersion: typeof KORTEX_GITHUB_CONTROL_PLANE_CONTRACT_VERSION
  generatedAt: string
  confidence: KortexGithubControlPlaneConfidence
}

export interface KortexGithubReaderResult<T> {
  status: 'ok' | 'degraded' | 'unavailable'
  data: T
  sources: KortexGithubControlPlaneSourceHealth[]
  warnings: string[]
}
