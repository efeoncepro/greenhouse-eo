import 'server-only'

import {
  buildGithubAuthHeaders,
  fetchGithubWithTimeout,
  githubFetchJson,
  resolveGithubToken
} from '@/lib/release/github-helpers'
import { readPublicSiteAstroBinding } from '@/lib/public-site/astro/binding-reader'
import { PUBLIC_SITE_ASTRO_STATIC_BINDING } from '@/config/public-site-astro-binding'

import type { PublicSiteAstroBindingPacket } from '@/lib/public-site/astro/binding-types'
import type {
  PublicSiteGithubBranchSnapshot,
  PublicSiteGithubCommitCorrelation,
  PublicSiteGithubControlPlaneSnapshot,
  PublicSiteGithubControlPlaneSourceHealth,
  PublicSiteGithubIssueSummary,
  PublicSiteGithubReaderResult,
  PublicSiteGithubReleaseSummary,
  PublicSiteGithubRepositoryIdentity,
  PublicSiteGithubRunSnapshot,
  PublicSiteGithubWorkflowSnapshot
} from './types'

const PUBLIC_SITE_OWNER = PUBLIC_SITE_ASTRO_STATIC_BINDING.repository.owner
const PUBLIC_SITE_REPO = PUBLIC_SITE_ASTRO_STATIC_BINDING.repository.name
const PUBLIC_SITE_NAME_WITH_OWNER = `${PUBLIC_SITE_OWNER}/${PUBLIC_SITE_REPO}` as const
const PUBLIC_SITE_DEFAULT_BRANCH = PUBLIC_SITE_ASTRO_STATIC_BINDING.repository.defaultBranch
const PUBLIC_SITE_BRANCHES_TO_TRACK = PUBLIC_SITE_ASTRO_STATIC_BINDING.repository.trackedBranches
const PUBLIC_SITE_CI_WORKFLOW_NAME = 'CI'

interface GithubRepositoryResponse {
  html_url: string
  default_branch: string | null
  private: boolean | null
  pushed_at: string | null
  updated_at: string | null
}

interface GithubBranchResponse {
  name: string
  protected: boolean
  commit?: {
    sha?: string
    url?: string
  }
}

interface GithubWorkflowResponse {
  id: number
  name: string
  path: string
  state: string
  url: string
  html_url?: string | null
}

interface GithubWorkflowListResponse {
  workflows?: GithubWorkflowResponse[]
}

interface GithubRunResponse {
  id: number
  name?: string | null
  workflow_id?: number | null
  display_title?: string | null
  status?: string | null
  conclusion?: string | null
  event?: string | null
  head_branch?: string | null
  head_sha?: string | null
  html_url?: string | null
  created_at?: string | null
  updated_at?: string | null
  run_started_at?: string | null
}

interface GithubRunListResponse {
  workflow_runs?: GithubRunResponse[]
}

interface GithubIssueSearchResponse {
  total_count?: number
}

interface GithubReleaseResponse {
  tag_name?: string | null
  name?: string | null
  published_at?: string | null
  html_url?: string | null
}

export interface ReadPublicSiteGithubControlPlaneOptions {
  now?: () => Date
}

export interface PublicSiteGithubReaderDeps {
  resolveToken?: () => Promise<string | null>
  fetchJson?: <T>(endpoint: string, token: string) => Promise<T>
  fetchResponse?: (endpoint: string, token: string) => Promise<Response>
  readBinding?: () => Promise<PublicSiteAstroBindingPacket>
}

const source = (
  name: PublicSiteGithubControlPlaneSourceHealth['source'],
  status: PublicSiteGithubControlPlaneSourceHealth['status'],
  checkedAt: string,
  detail?: string
): PublicSiteGithubControlPlaneSourceHealth => ({
  source: name,
  status,
  checkedAt,
  ...(detail ? { detail } : {})
})

const shortSha = (sha: string | null | undefined): string | null =>
  sha ? sha.slice(0, 7) : null

const redactReaderError = (error: unknown): string => {
  if (error instanceof Error) return error.message.slice(0, 180)

  return 'unknown GitHub reader error'
}

const normalizeRepository = (
  repository: GithubRepositoryResponse
): PublicSiteGithubRepositoryIdentity => ({
  owner: PUBLIC_SITE_OWNER,
  repo: PUBLIC_SITE_REPO,
  nameWithOwner: PUBLIC_SITE_NAME_WITH_OWNER,
  url: repository.html_url,
  defaultBranch: repository.default_branch,
  isPrivate: repository.private,
  pushedAt: repository.pushed_at,
  updatedAt: repository.updated_at
})

const normalizeBranch = (branch: GithubBranchResponse): PublicSiteGithubBranchSnapshot => ({
  name: branch.name,
  protected: Boolean(branch.protected),
  sha: branch.commit?.sha ?? null,
  shortSha: shortSha(branch.commit?.sha),
  url: branch.commit?.url ?? null
})

const normalizeWorkflow = (workflow: GithubWorkflowResponse): PublicSiteGithubWorkflowSnapshot => ({
  id: workflow.id,
  name: workflow.name,
  path: workflow.path,
  state: workflow.state,
  url: workflow.url,
  htmlUrl: workflow.html_url ?? null
})

const normalizeRun = (
  run: GithubRunResponse,
  workflows: PublicSiteGithubWorkflowSnapshot[]
): PublicSiteGithubRunSnapshot => ({
  id: run.id,
  name: run.name ?? run.display_title ?? null,
  workflowId: run.workflow_id ?? null,
  workflowName: workflows.find(workflow => workflow.id === run.workflow_id)?.name ?? null,
  status: run.status ?? null,
  conclusion: run.conclusion ?? null,
  event: run.event ?? null,
  branch: run.head_branch ?? null,
  headSha: run.head_sha ?? null,
  shortHeadSha: shortSha(run.head_sha),
  htmlUrl: run.html_url ?? null,
  createdAt: run.created_at ?? null,
  updatedAt: run.updated_at ?? null,
  runStartedAt: run.run_started_at ?? null
})

const issueSummary = (count: number | null, searchQuery: string): PublicSiteGithubIssueSummary => ({
  openCount: count,
  searchUrl: `https://github.com/${PUBLIC_SITE_NAME_WITH_OWNER}/issues?q=${encodeURIComponent(searchQuery)}`
})

const emptyReleaseSummary = (
  status: PublicSiteGithubReleaseSummary['status']
): PublicSiteGithubReleaseSummary => ({
  latestTag: null,
  latestName: null,
  publishedAt: null,
  htmlUrl: null,
  status
})

const productionDeployShaFromBinding = (binding: PublicSiteAstroBindingPacket | null): string | null =>
  binding?.vercel?.deployments.find(deployment => deployment.environment === 'production')?.commitSha ?? null

const mainHeadShaFromBinding = (binding: PublicSiteAstroBindingPacket | null): string | null =>
  binding?.github?.commits.find(commit => commit.branch === PUBLIC_SITE_DEFAULT_BRANCH)?.sha ?? null

const buildCommitCorrelation = ({
  branches,
  runs,
  binding
}: {
  branches: PublicSiteGithubBranchSnapshot[]
  runs: PublicSiteGithubRunSnapshot[]
  binding: PublicSiteAstroBindingPacket | null
}): PublicSiteGithubCommitCorrelation => {
  const mainHeadSha =
    branches.find(branch => branch.name === PUBLIC_SITE_DEFAULT_BRANCH)?.sha ??
    mainHeadShaFromBinding(binding)

  const latestCiRun =
    runs.find(run => run.workflowName === PUBLIC_SITE_CI_WORKFLOW_NAME && run.branch === PUBLIC_SITE_DEFAULT_BRANCH) ??
    runs.find(run => run.branch === PUBLIC_SITE_DEFAULT_BRANCH) ??
    null

  const latestCiHeadSha = latestCiRun?.headSha ?? null
  const productionDeploySha = productionDeployShaFromBinding(binding)

  if (!mainHeadSha || !productionDeploySha) {
    return {
      status: 'unknown',
      mainHeadSha,
      latestCiHeadSha,
      productionDeploySha,
      detail: 'GitHub main HEAD or Vercel production deploy SHA is unavailable; deploy correlation is partial.'
    }
  }

  if (mainHeadSha === productionDeploySha) {
    return {
      status: latestCiHeadSha && latestCiHeadSha !== mainHeadSha ? 'deploy_sha_mismatch' : 'matched',
      mainHeadSha,
      latestCiHeadSha,
      productionDeploySha,
      detail:
        latestCiHeadSha && latestCiHeadSha !== mainHeadSha
          ? 'Vercel production matches main HEAD, but latest tracked CI run head SHA differs.'
          : 'Vercel production deployment commit matches GitHub main HEAD.'
    }
  }

  return {
    status: 'deploy_behind_main',
    mainHeadSha,
    latestCiHeadSha,
    productionDeploySha,
    detail: 'Vercel production deployment commit differs from GitHub main HEAD; deploy commands are out of scope.'
  }
}

const defaultFetchResponse = async (endpoint: string, token: string): Promise<Response> => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.github.com${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  return fetchGithubWithTimeout(url, {
    headers: buildGithubAuthHeaders(token)
  })
}

export const readPublicSiteGithubControlPlaneSnapshot = async (
  options: ReadPublicSiteGithubControlPlaneOptions = {},
  deps: PublicSiteGithubReaderDeps = {}
): Promise<PublicSiteGithubReaderResult<PublicSiteGithubControlPlaneSnapshot>> => {
  const checkedAt = (options.now ?? (() => new Date()))().toISOString()
  const resolveToken = deps.resolveToken ?? resolveGithubToken
  const fetchJson = deps.fetchJson ?? githubFetchJson
  const fetchResponse = deps.fetchResponse ?? defaultFetchResponse
  const readBinding = deps.readBinding ?? (() => readPublicSiteAstroBinding())
  const token = await resolveToken()

  const binding = await readBinding().catch(() => null)

  if (!token) {
    const unavailableSources: PublicSiteGithubControlPlaneSourceHealth[] = [
      source('github_repository', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_branches', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_workflows', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_runs', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_issues', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_pull_requests', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_releases', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('binding_correlation', binding ? 'degraded' : 'skipped', checkedAt, 'GitHub data unavailable')
    ]

    const commitCorrelation = buildCommitCorrelation({
      branches: [],
      runs: [],
      binding
    })

    return {
      status: 'unavailable',
      data: {
        repository: null,
        branches: [],
        workflows: [],
        runs: [],
        pullRequests: issueSummary(null, `repo:${PUBLIC_SITE_NAME_WITH_OWNER} is:pr is:open`),
        issues: issueSummary(null, `repo:${PUBLIC_SITE_NAME_WITH_OWNER} is:issue is:open`),
        releases: emptyReleaseSummary('unknown'),
        commitCorrelation,
        sources: unavailableSources,
        warnings: ['GitHub token unavailable for Public Site repository reader.']
      },
      sources: unavailableSources,
      warnings: ['GitHub token unavailable for Public Site repository reader.']
    }
  }

  const sources: PublicSiteGithubControlPlaneSourceHealth[] = []
  const warnings: string[] = []

  const safeRead = async <T>(
    sourceName: PublicSiteGithubControlPlaneSourceHealth['source'],
    read: () => Promise<T>,
    fallback: T,
    notFoundAsOk = false
  ): Promise<T> => {
    try {
      const data = await read()

      sources.push(source(sourceName, 'ok', checkedAt))

      return data
    } catch (error) {
      const detail = redactReaderError(error)
      const status = notFoundAsOk && detail.includes('404') ? 'not_found' : 'degraded'

      sources.push(source(sourceName, status, checkedAt, detail))
      warnings.push(`${sourceName} degraded: ${detail}`)

      return fallback
    }
  }

  const repository = await safeRead<GithubRepositoryResponse | null>(
    'github_repository',
    () => fetchJson<GithubRepositoryResponse>(`/repos/${PUBLIC_SITE_NAME_WITH_OWNER}`, token),
    null
  )

  const branchResults = await safeRead<GithubBranchResponse[]>(
    'github_branches',
    async () => Promise.all(
      PUBLIC_SITE_BRANCHES_TO_TRACK.map(branch =>
        fetchJson<GithubBranchResponse>(`/repos/${PUBLIC_SITE_NAME_WITH_OWNER}/branches/${branch}`, token)
      )
    ),
    []
  )

  const workflowResponse = await safeRead<GithubWorkflowListResponse>(
    'github_workflows',
    () => fetchJson<GithubWorkflowListResponse>(`/repos/${PUBLIC_SITE_NAME_WITH_OWNER}/actions/workflows?per_page=100`, token),
    {}
  )

  const workflows = (workflowResponse.workflows ?? []).map(normalizeWorkflow)

  const runResponse = await safeRead<GithubRunListResponse>(
    'github_runs',
    () => fetchJson<GithubRunListResponse>(`/repos/${PUBLIC_SITE_NAME_WITH_OWNER}/actions/runs?per_page=20&exclude_pull_requests=true`, token),
    {}
  )

  const runs = (runResponse.workflow_runs ?? []).map(run => normalizeRun(run, workflows))
  const issueQuery = `repo:${PUBLIC_SITE_NAME_WITH_OWNER} is:issue is:open`
  const pullRequestQuery = `repo:${PUBLIC_SITE_NAME_WITH_OWNER} is:pr is:open`

  const issueResponse = await safeRead<GithubIssueSearchResponse>(
    'github_issues',
    () => fetchJson<GithubIssueSearchResponse>(`/search/issues?q=${encodeURIComponent(issueQuery)}&per_page=1`, token),
    {}
  )

  const pullRequestResponse = await safeRead<GithubIssueSearchResponse>(
    'github_pull_requests',
    () => fetchJson<GithubIssueSearchResponse>(`/search/issues?q=${encodeURIComponent(pullRequestQuery)}&per_page=1`, token),
    {}
  )

  const releaseSummary = await safeRead<PublicSiteGithubReleaseSummary>(
    'github_releases',
    async () => {
      const response = await fetchResponse(`/repos/${PUBLIC_SITE_NAME_WITH_OWNER}/releases/latest`, token)

      if (response.status === 404) return emptyReleaseSummary('no_release')

      if (!response.ok) {
        throw new Error(`GitHub API releases/latest returned ${response.status} ${response.statusText}`)
      }

      const release = (await response.json()) as GithubReleaseResponse

      return {
        latestTag: release.tag_name ?? null,
        latestName: release.name ?? null,
        publishedAt: release.published_at ?? null,
        htmlUrl: release.html_url ?? null,
        status: 'ok'
      }
    },
    emptyReleaseSummary('unknown'),
    true
  )

  const branches = branchResults.map(normalizeBranch)
  const commitCorrelation = buildCommitCorrelation({ branches, runs, binding })

  sources.push(source(
    'binding_correlation',
    commitCorrelation.status === 'unknown' ? 'degraded' : 'ok',
    checkedAt,
    commitCorrelation.detail
  ))

  const data: PublicSiteGithubControlPlaneSnapshot = {
    repository: repository ? normalizeRepository(repository) : null,
    branches,
    workflows,
    runs,
    pullRequests: issueSummary(pullRequestResponse.total_count ?? null, pullRequestQuery),
    issues: issueSummary(issueResponse.total_count ?? null, issueQuery),
    releases: releaseSummary,
    commitCorrelation,
    sources,
    warnings
  }

  return {
    status: sources.some(item => item.status === 'degraded' || item.status === 'unavailable')
      ? 'degraded'
      : 'ok',
    data,
    sources,
    warnings
  }
}
