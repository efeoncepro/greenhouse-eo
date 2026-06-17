import 'server-only'

import {
  buildGithubAuthHeaders,
  fetchGithubWithTimeout,
  githubFetchJson,
  resolveGithubToken
} from '@/lib/release/github-helpers'

import type {
  KortexGithubBranchSnapshot,
  KortexGithubControlPlaneSnapshot,
  KortexGithubControlPlaneSourceHealth,
  KortexGithubIssueSummary,
  KortexGithubReaderResult,
  KortexGithubReleaseSummary,
  KortexGithubRepositoryIdentity,
  KortexGithubRunSnapshot,
  KortexGithubRuntimeCorrelation,
  KortexGithubWorkflowSnapshot
} from './types'

const KORTEX_OWNER = 'efeoncepro'
const KORTEX_REPO = 'kortex'
const KORTEX_NAME_WITH_OWNER = `${KORTEX_OWNER}/${KORTEX_REPO}` as const
const KORTEX_DEFAULT_BRANCH = 'main'
const KORTEX_BRANCHES_TO_TRACK = ['main', 'develop'] as const
const KORTEX_CI_WORKFLOW_NAME = 'CI'

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

export interface ReadKortexGithubControlPlaneOptions {
  now?: () => Date
}

export interface KortexGithubReaderDeps {
  resolveToken?: () => Promise<string | null>
  fetchJson?: <T>(endpoint: string, token: string) => Promise<T>
  fetchResponse?: (endpoint: string, token: string) => Promise<Response>
}

const source = (
  name: KortexGithubControlPlaneSourceHealth['source'],
  status: KortexGithubControlPlaneSourceHealth['status'],
  checkedAt: string,
  detail?: string
): KortexGithubControlPlaneSourceHealth => ({
  source: name,
  status,
  checkedAt,
  ...(detail ? { detail } : {})
})

const shortSha = (sha: string | null | undefined): string | null => {
  return sha ? sha.slice(0, 7) : null
}

const redactReaderError = (error: unknown): string => {
  if (error instanceof Error) return error.message.slice(0, 180)

  return 'unknown GitHub reader error'
}

const normalizeRepository = (
  repository: GithubRepositoryResponse
): KortexGithubRepositoryIdentity => ({
  owner: KORTEX_OWNER,
  repo: KORTEX_REPO,
  nameWithOwner: KORTEX_NAME_WITH_OWNER,
  url: repository.html_url,
  defaultBranch: repository.default_branch,
  isPrivate: repository.private,
  pushedAt: repository.pushed_at,
  updatedAt: repository.updated_at
})

const normalizeBranch = (branch: GithubBranchResponse): KortexGithubBranchSnapshot => ({
  name: branch.name,
  protected: Boolean(branch.protected),
  sha: branch.commit?.sha ?? null,
  shortSha: shortSha(branch.commit?.sha),
  url: branch.commit?.url ?? null
})

const normalizeWorkflow = (workflow: GithubWorkflowResponse): KortexGithubWorkflowSnapshot => ({
  id: workflow.id,
  name: workflow.name,
  path: workflow.path,
  state: workflow.state,
  url: workflow.url,
  htmlUrl: workflow.html_url ?? null
})

const normalizeRun = (
  run: GithubRunResponse,
  workflows: KortexGithubWorkflowSnapshot[]
): KortexGithubRunSnapshot => ({
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

const issueSummary = (count: number | null, searchQuery: string): KortexGithubIssueSummary => ({
  openCount: count,
  searchUrl: `https://github.com/${KORTEX_NAME_WITH_OWNER}/issues?q=${encodeURIComponent(searchQuery)}`
})

const buildRuntimeCorrelation = (
  branches: KortexGithubBranchSnapshot[],
  runs: KortexGithubRunSnapshot[]
): KortexGithubRuntimeCorrelation => {
  const mainHeadSha =
    branches.find(branch => branch.name === KORTEX_DEFAULT_BRANCH)?.sha ?? null

  const latestCiRun =
    runs.find(run => run.workflowName === KORTEX_CI_WORKFLOW_NAME && run.branch === KORTEX_DEFAULT_BRANCH) ??
    runs.find(run => run.branch === KORTEX_DEFAULT_BRANCH) ??
    null

  const latestCiHeadSha = latestCiRun?.headSha ?? null

  if (!mainHeadSha || !latestCiHeadSha) {
    return {
      status: 'unknown',
      mainHeadSha,
      latestCiHeadSha,
      runtimeReportedSha: null,
      detail: 'GitHub branch or CI run data is incomplete; runtime SHA is not exposed by Kortex V1.'
    }
  }

  if (mainHeadSha !== latestCiHeadSha) {
    return {
      status: 'mismatch',
      mainHeadSha,
      latestCiHeadSha,
      runtimeReportedSha: null,
      detail: 'Latest tracked CI run head SHA does not match main HEAD.'
    }
  }

  return {
    status: 'matched',
    mainHeadSha,
    latestCiHeadSha,
    runtimeReportedSha: null,
    detail: 'Latest tracked CI run matches main HEAD; Kortex runtime SHA is not exposed by V1.'
  }
}

const emptyReleaseSummary = (status: KortexGithubReleaseSummary['status']): KortexGithubReleaseSummary => ({
  latestTag: null,
  latestName: null,
  publishedAt: null,
  htmlUrl: null,
  status
})

const defaultFetchResponse = async (endpoint: string, token: string): Promise<Response> => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.github.com${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  return fetchGithubWithTimeout(url, {
    headers: buildGithubAuthHeaders(token)
  })
}

export const readKortexGithubControlPlaneSnapshot = async (
  options: ReadKortexGithubControlPlaneOptions = {},
  deps: KortexGithubReaderDeps = {}
): Promise<KortexGithubReaderResult<KortexGithubControlPlaneSnapshot>> => {
  const checkedAt = (options.now ?? (() => new Date()))().toISOString()
  const resolveToken = deps.resolveToken ?? resolveGithubToken
  const fetchJson = deps.fetchJson ?? githubFetchJson
  const fetchResponse = deps.fetchResponse ?? defaultFetchResponse
  const token = await resolveToken()

  if (!token) {
    const unavailableSources: KortexGithubControlPlaneSourceHealth[] = [
      source('github_repository', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_branches', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_workflows', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_runs', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_issues', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_pull_requests', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('github_releases', 'unavailable', checkedAt, 'GitHub token unavailable'),
      source('runtime_correlation', 'skipped', checkedAt, 'GitHub data unavailable')
    ]

    return {
      status: 'unavailable',
      data: {
        repository: null,
        branches: [],
        workflows: [],
        runs: [],
        pullRequests: issueSummary(null, `repo:${KORTEX_NAME_WITH_OWNER} is:pr is:open`),
        issues: issueSummary(null, `repo:${KORTEX_NAME_WITH_OWNER} is:issue is:open`),
        releases: emptyReleaseSummary('unknown'),
        runtimeCorrelation: {
          status: 'unknown',
          mainHeadSha: null,
          latestCiHeadSha: null,
          runtimeReportedSha: null,
          detail: 'GitHub token unavailable; cannot correlate Kortex repository state.'
        },
        sources: unavailableSources,
        warnings: ['GitHub token unavailable for Kortex repository reader.']
      },
      sources: unavailableSources,
      warnings: ['GitHub token unavailable for Kortex repository reader.']
    }
  }

  const sources: KortexGithubControlPlaneSourceHealth[] = []
  const warnings: string[] = []

  const safeRead = async <T>(
    sourceName: KortexGithubControlPlaneSourceHealth['source'],
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
    () => fetchJson<GithubRepositoryResponse>(`/repos/${KORTEX_NAME_WITH_OWNER}`, token),
    null
  )

  const branchResults = await safeRead<GithubBranchResponse[]>(
    'github_branches',
    async () => {
      const branches = await Promise.all(
        KORTEX_BRANCHES_TO_TRACK.map(branch =>
          fetchJson<GithubBranchResponse>(`/repos/${KORTEX_NAME_WITH_OWNER}/branches/${branch}`, token)
        )
      )

      return branches
    },
    []
  )

  const workflowResponse = await safeRead<GithubWorkflowListResponse>(
    'github_workflows',
    () => fetchJson<GithubWorkflowListResponse>(`/repos/${KORTEX_NAME_WITH_OWNER}/actions/workflows?per_page=100`, token),
    {}
  )

  const workflows = (workflowResponse.workflows ?? []).map(normalizeWorkflow)

  const runResponse = await safeRead<GithubRunListResponse>(
    'github_runs',
    () => fetchJson<GithubRunListResponse>(`/repos/${KORTEX_NAME_WITH_OWNER}/actions/runs?per_page=20&exclude_pull_requests=true`, token),
    {}
  )

  const runs = (runResponse.workflow_runs ?? []).map(run => normalizeRun(run, workflows))

  const issueQuery = `repo:${KORTEX_NAME_WITH_OWNER} is:issue is:open`
  const pullRequestQuery = `repo:${KORTEX_NAME_WITH_OWNER} is:pr is:open`

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

  const releaseSummary = await safeRead<KortexGithubReleaseSummary>(
    'github_releases',
    async () => {
      const response = await fetchResponse(`/repos/${KORTEX_NAME_WITH_OWNER}/releases/latest`, token)

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
  const runtimeCorrelation = buildRuntimeCorrelation(branches, runs)

  sources.push(source(
    'runtime_correlation',
    runtimeCorrelation.status === 'unknown' ? 'degraded' : 'ok',
    checkedAt,
    runtimeCorrelation.detail
  ))

  const data: KortexGithubControlPlaneSnapshot = {
    repository: repository ? normalizeRepository(repository) : null,
    branches,
    workflows,
    runs,
    pullRequests: issueSummary(pullRequestResponse.total_count ?? null, pullRequestQuery),
    issues: issueSummary(issueResponse.total_count ?? null, issueQuery),
    releases: releaseSummary,
    runtimeCorrelation,
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
