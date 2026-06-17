import 'server-only'

import {
  buildGithubAuthHeaders,
  fetchGithubWithTimeout,
  githubFetchJson,
  resolveGithubToken
} from '@/lib/release/github-helpers'

const KORTEX_REPOSITORY = 'efeoncepro/kortex'

export interface KortexGithubWorkflowRun {
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

export interface KortexGithubWorkflow {
  id: number
  name: string
  path: string
  state: string
}

export interface KortexGithubActionResponse {
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

export const fetchKortexGithubWorkflowRun = async (
  runId: number
): Promise<KortexGithubWorkflowRun> => {
  const token = await resolveGithubToken()

  if (!token) {
    throw new Error('GitHub token unavailable for Kortex workflow run preflight.')
  }

  return githubFetchJson<KortexGithubWorkflowRun>(
    `/repos/${KORTEX_REPOSITORY}/actions/runs/${runId}`,
    token
  )
}

export const fetchKortexGithubWorkflow = async (
  workflowId: string | number
): Promise<KortexGithubWorkflow> => {
  const token = await resolveGithubToken()

  if (!token) {
    throw new Error('GitHub token unavailable for Kortex workflow preflight.')
  }

  return githubFetchJson<KortexGithubWorkflow>(
    `/repos/${KORTEX_REPOSITORY}/actions/workflows/${encodeURIComponent(String(workflowId))}`,
    token
  )
}

export const postKortexGithubAction = async ({
  endpoint,
  body
}: {
  endpoint: string
  body?: Record<string, unknown>
}): Promise<KortexGithubActionResponse> => {
  const token = await resolveGithubToken()

  if (!token) {
    throw new Error('GitHub token unavailable for Kortex GitHub command.')
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
