import 'server-only'

import {
  buildGithubAuthHeaders,
  fetchGithubWithTimeout,
  githubFetchJson,
  resolveGithubToken
} from '@/lib/release/github-helpers'

const PUBLIC_SITE_REPOSITORY = 'efeoncepro/efeonce-web'

export interface PublicSiteGithubWorkflowRun {
  id: number
  name?: string | null
  workflow_id?: number | null
  workflow_name?: string | null
  path?: string | null
  head_branch?: string | null
  head_sha?: string | null
  status?: string | null
  conclusion?: string | null
}

export interface PublicSiteGithubWorkflow {
  id: number
  name: string
  path: string
  state: string
}

export interface PublicSiteGithubActionResponse {
  statusCode: number
  body: unknown
  observedKeys: string[]
}

const jsonOrNull = async (response: Response): Promise<unknown> => {
  const text = await response.text()

  if (!text.trim()) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return { text: text.slice(0, 200) }
  }
}

export const fetchPublicSiteGithubWorkflowRun = async (
  runId: number
): Promise<PublicSiteGithubWorkflowRun> => {
  const token = await resolveGithubToken()

  if (!token) {
    throw new Error('GitHub token unavailable for Public Site workflow run preflight.')
  }

  return githubFetchJson<PublicSiteGithubWorkflowRun>(
    `/repos/${PUBLIC_SITE_REPOSITORY}/actions/runs/${runId}`,
    token
  )
}

export const fetchPublicSiteGithubWorkflow = async (
  workflowId: string | number
): Promise<PublicSiteGithubWorkflow> => {
  const token = await resolveGithubToken()

  if (!token) {
    throw new Error('GitHub token unavailable for Public Site workflow preflight.')
  }

  return githubFetchJson<PublicSiteGithubWorkflow>(
    `/repos/${PUBLIC_SITE_REPOSITORY}/actions/workflows/${encodeURIComponent(String(workflowId))}`,
    token
  )
}

export const postPublicSiteGithubAction = async ({
  endpoint,
  body
}: {
  endpoint: string
  body?: Record<string, unknown>
}): Promise<PublicSiteGithubActionResponse> => {
  const token = await resolveGithubToken()

  if (!token) {
    throw new Error('GitHub token unavailable for Public Site GitHub command.')
  }

  const response = await fetchGithubWithTimeout(
    `https://api.github.com${endpoint}`,
    {
      method: 'POST',
      headers: {
        ...buildGithubAuthHeaders(token),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    }
  )

  const parsedBody = await jsonOrNull(response)

  if (!response.ok) {
    throw new Error(
      `GitHub Actions command returned ${response.status} ${response.statusText}`
    )
  }

  return {
    statusCode: response.status,
    body: parsedBody,
    observedKeys: parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)
      ? Object.keys(parsedBody).sort().slice(0, 20)
      : []
  }
}
