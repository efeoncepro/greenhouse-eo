import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { resolveSecret } from '@/lib/secrets/secret-manager'
import {
  PUBLIC_SITE_ASTRO_ROUTE_OWNERSHIP,
  PUBLIC_SITE_ASTRO_STATIC_BINDING
} from '@/config/public-site-astro-binding'
import { withSourceTimeout, type SourceResult } from '@/lib/platform-health/with-source-timeout'
import {
  githubFetchJson,
  resolveGithubToken
} from '@/lib/release/github-helpers'
import { fetchVercelDeployments } from '@/lib/release/preflight/checks/vercel-readiness'

import {
  PUBLIC_SITE_ASTRO_BINDING_CONTRACT_VERSION,
  type PublicSiteAstroBindingConfidence,
  type PublicSiteAstroBindingDegradedSource,
  type PublicSiteAstroBindingPacket,
  type PublicSiteAstroBindingSourceName,
  type PublicSiteAstroBindingStatus,
  type PublicSiteAstroDeploymentSnapshot,
  type PublicSiteAstroDeployEnvironment,
  type PublicSiteAstroGithubCommitSnapshot,
  type PublicSiteAstroGithubState,
  type PublicSiteAstroVercelState
} from './binding-types'

const SOURCE_TIMEOUT_MS = 6_000
const CACHE_TTL_MS = 30_000
const REPOSITORY = 'efeoncepro/efeonce-web'

interface GithubCommitResponse {
  sha?: string
  html_url?: string | null
  commit?: {
    message?: string | null
    committer?: {
      date?: string | null
    } | null
  } | null
}

interface ReaderCache {
  fetchedAt: number
  packet: PublicSiteAstroBindingPacket
}

export interface ReadPublicSiteAstroBindingOptions {
  bypassCache?: boolean
  now?: () => Date
}

export interface PublicSiteAstroBindingReaderDeps {
  resolveGithubToken?: () => Promise<string | null>
  fetchGithubJson?: <T>(endpoint: string, token: string, options?: { timeoutMs?: number }) => Promise<T>
  resolveVercelToken?: () => Promise<string | null>
  fetchVercelDeployments?: typeof fetchVercelDeployments
}

let cache: ReaderCache | null = null

const shortSha = (sha: string | null | undefined): string | null => sha ? sha.slice(0, 7) : null

const hoursSince = (createdAtMs: number, now: Date): number =>
  Math.round(((now.getTime() - createdAtMs) / 3_600_000) * 10) / 10

const normalizeGithubCommit = (
  branch: PublicSiteAstroGithubCommitSnapshot['branch'],
  commit: GithubCommitResponse
): PublicSiteAstroGithubCommitSnapshot => ({
  branch,
  sha: commit.sha ?? null,
  shortSha: shortSha(commit.sha),
  message: commit.commit?.message?.split('\n')[0] ?? null,
  committedAt: commit.commit?.committer?.date ?? null,
  htmlUrl: commit.html_url ?? null
})

const resolveVercelToken = async (): Promise<string | null> => {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim()

  try {
    const secret = await resolveSecret({ envVarName: 'GREENHOUSE_VERCEL_API_TOKEN' })

    return secret.value?.trim() || null
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'public_site_binding', stage: 'resolve_vercel_token' }
    })

    return null
  }
}

const readGithubState = async (
  deps: Required<Pick<PublicSiteAstroBindingReaderDeps, 'resolveGithubToken' | 'fetchGithubJson'>>
): Promise<PublicSiteAstroGithubState | null> => {
  const token = await deps.resolveGithubToken()

  if (!token) return null

  const commits = await Promise.all(
    PUBLIC_SITE_ASTRO_STATIC_BINDING.repository.trackedBranches.map(async branch => {
      const commit = await deps.fetchGithubJson<GithubCommitResponse>(
        `/repos/${REPOSITORY}/commits/${branch}`,
        token,
        { timeoutMs: SOURCE_TIMEOUT_MS }
      )

      return normalizeGithubCommit(branch, commit)
    })
  )

  return {
    repository: REPOSITORY,
    commits
  }
}

const latestDeployment = (
  deployments: Awaited<ReturnType<typeof fetchVercelDeployments>>,
  environment: PublicSiteAstroDeployEnvironment,
  now: Date
): PublicSiteAstroDeploymentSnapshot => {
  const latest = deployments[0] ?? null

  if (!latest) {
    return {
      environment,
      status: 'EMPTY',
      uid: null,
      url: null,
      commitSha: null,
      shortCommitSha: null,
      createdAt: null,
      ageHours: null
    }
  }

  const commitSha = latest.meta?.githubCommitSha ?? null

  return {
    environment,
    status: latest.state,
    uid: latest.uid,
    url: latest.url ? `https://${latest.url}` : null,
    commitSha,
    shortCommitSha: shortSha(commitSha),
    createdAt: new Date(latest.createdAt).toISOString(),
    ageHours: hoursSince(latest.createdAt, now)
  }
}

const readVercelState = async (
  now: Date,
  deps: Required<Pick<PublicSiteAstroBindingReaderDeps, 'resolveVercelToken' | 'fetchVercelDeployments'>>
): Promise<PublicSiteAstroVercelState | null> => {
  const token = await deps.resolveVercelToken()

  if (!token) return null

  const { teamId, projectId, projectName } = PUBLIC_SITE_ASTRO_STATIC_BINDING.vercel

  const [productionDeployments, stagingDeployments] = await Promise.all([
    deps.fetchVercelDeployments(token, teamId, projectId, 'production'),
    deps.fetchVercelDeployments(token, teamId, projectId, 'staging').catch(() => [])
  ])

  return {
    projectId,
    projectName,
    deployments: [
      latestDeployment(productionDeployments, 'production', now),
      latestDeployment(stagingDeployments, 'staging', now)
    ]
  }
}

const toDegradedSource = <T>(
  result: SourceResult<T>,
  source: PublicSiteAstroBindingSourceName
): PublicSiteAstroBindingDegradedSource | null => {
  if (result.status === 'ok') return null

  return {
    source,
    status: result.status,
    observedAt: result.observedAt,
    summary:
      result.error ??
      (result.status === 'not_configured'
        ? `source '${source}' is not configured`
        : `source '${source}' returned ${result.status}`)
  }
}

const deriveStatus = (
  degradedSources: PublicSiteAstroBindingDegradedSource[],
  vercel: PublicSiteAstroVercelState | null
): PublicSiteAstroBindingStatus => {
  if (degradedSources.length > 0) return 'degraded'

  const production = vercel?.deployments.find(deploy => deploy.environment === 'production')

  if (production?.status === 'EMPTY') return 'empty'

  return 'ok'
}

const deriveConfidence = (
  degradedSources: PublicSiteAstroBindingDegradedSource[],
  github: PublicSiteAstroGithubState | null,
  vercel: PublicSiteAstroVercelState | null
): PublicSiteAstroBindingConfidence => {
  if (!github && !vercel) return 'none'
  if (degradedSources.length >= 2) return 'low'
  if (degradedSources.length === 1) return 'medium'

  return 'high'
}

const buildNotes = (
  github: PublicSiteAstroGithubState | null,
  vercel: PublicSiteAstroVercelState | null,
  degradedSources: PublicSiteAstroBindingDegradedSource[]
): string[] => {
  const notes = [
    'Astro/Vercel is the target frontend rail; WordPress/Kinsta remains the current production runtime until cutover approval.',
    'This reader is read-only and never deploys, rolls back, edits assets or changes DNS.'
  ]

  const mainSha = github?.commits.find(commit => commit.branch === 'main')?.sha ?? null

  const prodSha =
    vercel?.deployments.find(deploy => deploy.environment === 'production')?.commitSha ?? null

  if (mainSha && prodSha && mainSha !== prodSha) {
    notes.push('Latest Vercel production deployment commit differs from GitHub main HEAD; deploy commands are out of scope for this reader.')
  }

  if (degradedSources.length > 0) {
    notes.push('One or more live sources degraded; consumers must treat live state as partial.')
  }

  return notes
}

export const readPublicSiteAstroBinding = async (
  options: ReadPublicSiteAstroBindingOptions = {},
  deps: PublicSiteAstroBindingReaderDeps = {}
): Promise<PublicSiteAstroBindingPacket> => {
  const now = options.now ?? (() => new Date())
  const nowDate = now()
  const cached = cache

  if (!options.bypassCache && cached && nowDate.getTime() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.packet
  }

  const [githubResult, vercelResult] = await Promise.all([
    withSourceTimeout(
      () => readGithubState({
        resolveGithubToken: deps.resolveGithubToken ?? resolveGithubToken,
        fetchGithubJson: deps.fetchGithubJson ?? githubFetchJson
      }),
      {
        source: 'github_repo_state',
        timeoutMs: SOURCE_TIMEOUT_MS,
        isUnavailable: value => value === null
      }
    ),
    withSourceTimeout(
      () => readVercelState(nowDate, {
        resolveVercelToken: deps.resolveVercelToken ?? resolveVercelToken,
        fetchVercelDeployments: deps.fetchVercelDeployments ?? fetchVercelDeployments
      }),
      {
        source: 'vercel_deployments',
        timeoutMs: SOURCE_TIMEOUT_MS,
        isUnavailable: value => value === null
      }
    )
  ])

  const github = githubResult.value
  const vercel = vercelResult.value

  const degradedSources = [
    toDegradedSource(githubResult, 'github_repo_state'),
    toDegradedSource(vercelResult, 'vercel_deployments')
  ].filter((source): source is PublicSiteAstroBindingDegradedSource => source !== null)

  const packet: PublicSiteAstroBindingPacket = {
    contractVersion: PUBLIC_SITE_ASTRO_BINDING_CONTRACT_VERSION,
    generatedAt: nowDate.toISOString(),
    status: deriveStatus(degradedSources, vercel),
    confidence: deriveConfidence(degradedSources, github, vercel),
    binding: PUBLIC_SITE_ASTRO_STATIC_BINDING,
    routeOwnership: PUBLIC_SITE_ASTRO_ROUTE_OWNERSHIP,
    github,
    vercel,
    degradedSources,
    notes: buildNotes(github, vercel, degradedSources)
  }

  cache = {
    fetchedAt: nowDate.getTime(),
    packet
  }

  return packet
}

export const getPublicSiteAstroProductionDeploymentStatus = (
  packet: PublicSiteAstroBindingPacket
) => packet.vercel?.deployments.find(deploy => deploy.environment === 'production') ?? null

export const redactPublicSiteAstroBindingError = (error: unknown): string =>
  redactErrorForResponse(error)
