import 'server-only'

import type {
  CloudObservabilityPosture,
  CloudSentryIncident,
  CloudSentryIncidentLevel,
  CloudSentryIncidentsSnapshot
} from '@/lib/cloud/contracts'
import { getSecretSource, resolveSecret } from '@/lib/secrets/secret-manager'

const hasValue = (value: string | undefined) => Boolean(value?.trim())

type ObservabilityEnv = Partial<NodeJS.ProcessEnv>

type SentryIssueTag = {
  key?: string
  value?: string
}

type SentryIssueRelease = {
  version?: string
  shortVersion?: string
}

type SentryIssueMetadata = {
  title?: string
  type?: string
  value?: string
  filename?: string
  function?: string
}

type SentryIssueResponse = {
  id?: string | number
  shortId?: string
  title?: string
  culprit?: string
  level?: string
  priority?: string
  status?: string
  count?: string | number
  userCount?: string | number
  firstSeen?: string
  lastSeen?: string
  permalink?: string
  metadata?: SentryIssueMetadata
  tags?: SentryIssueTag[]
  latestRelease?: SentryIssueRelease | string
}

const parseIssueCount = (value: string | number | undefined) => {
  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const getSentryRuntimeEnvironment = (env: ObservabilityEnv) =>
  env.VERCEL_TARGET_ENV?.trim() || env.VERCEL_ENV?.trim() || env.NODE_ENV?.trim() || null

const getIssueTag = (tags: SentryIssueTag[] | undefined, key: string) =>
  tags?.find(tag => tag.key === key)?.value?.trim() || null

const normalizeIssueLevel = (level: string | undefined): CloudSentryIncidentLevel => {
  if (level === 'error' || level === 'warning' || level === 'info' || level === 'fatal') {
    return level
  }

  return 'unknown'
}

const getIssueLocation = (issue: SentryIssueResponse) =>
  issue.metadata?.value?.trim() ||
  issue.metadata?.title?.trim() ||
  issue.metadata?.filename?.trim() ||
  issue.metadata?.function?.trim() ||
  issue.culprit?.trim() ||
  issue.title?.trim() ||
  'Incidente sin ubicación'

const getIssueRelease = (issue: SentryIssueResponse) => {
  if (typeof issue.latestRelease === 'string') {
    return issue.latestRelease.trim() || null
  }

  return issue.latestRelease?.shortVersion?.trim() || issue.latestRelease?.version?.trim() || getIssueTag(issue.tags, 'release')
}

const normalizeIssue = (issue: SentryIssueResponse): CloudSentryIncident => ({
  id: String(issue.id ?? 'unknown'),
  shortId: issue.shortId?.trim() || null,
  title: issue.title?.trim() || 'Incidente sin título',
  location: getIssueLocation(issue),
  level: normalizeIssueLevel(issue.level),
  priority: issue.priority?.trim() || null,
  status: issue.status?.trim() || 'unresolved',
  count: parseIssueCount(issue.count),
  userCount: parseIssueCount(issue.userCount),
  firstSeen: issue.firstSeen?.trim() || null,
  lastSeen: issue.lastSeen?.trim() || null,
  release: getIssueRelease(issue),
  environment: getIssueTag(issue.tags, 'environment'),
  permalink: issue.permalink?.trim() || null
})

const buildIncidentsSnapshot = ({
  status,
  enabled,
  available,
  summary,
  incidents = [],
  error = null
}: {
  status: CloudSentryIncidentsSnapshot['status']
  enabled: boolean
  available: boolean
  summary: string
  incidents?: CloudSentryIncident[]
  error?: string | null
}): CloudSentryIncidentsSnapshot => ({
  status,
  enabled,
  available,
  summary,
  incidents,
  fetchedAt: new Date().toISOString(),
  error
})

const fetchWithTimeout = async (input: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController()

  const timer = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}

export const getCloudObservabilityPosture = async (env: ObservabilityEnv = process.env): Promise<CloudObservabilityPosture> => {
  const [sentryDsnSource, slackWebhookSource, sentryIncidentsAuthTokenSource] = await Promise.all([
    getSecretSource({
      envVarName: 'SENTRY_DSN',
      env: env as NodeJS.ProcessEnv
    }),
    getSecretSource({
      envVarName: 'SLACK_ALERTS_WEBHOOK_URL',
      env: env as NodeJS.ProcessEnv
    }),
    getSecretSource({
      envVarName: 'SENTRY_INCIDENTS_AUTH_TOKEN',
      env: env as NodeJS.ProcessEnv
    })
  ])

  const sentryDsnConfigured = sentryDsnSource.source !== 'unconfigured' || hasValue(env.NEXT_PUBLIC_SENTRY_DSN)
  const sentryClientDsnConfigured = hasValue(env.NEXT_PUBLIC_SENTRY_DSN)
  const sentryAuthTokenConfigured = hasValue(env.SENTRY_AUTH_TOKEN)

  const sentryIncidentsReaderConfigured =
    sentryIncidentsAuthTokenSource.source !== 'unconfigured' || sentryAuthTokenConfigured

  const sentryOrgConfigured = hasValue(env.SENTRY_ORG)
  const sentryProjectConfigured = hasValue(env.SENTRY_PROJECT)
  const sentrySourceMapsReady = sentryAuthTokenConfigured && sentryOrgConfigured && sentryProjectConfigured
  const slackAlertsWebhookConfigured = slackWebhookSource.source !== 'unconfigured'

  const summaryParts = [
    sentryDsnConfigured
      ? sentrySourceMapsReady
        ? 'Sentry runtime + source maps listos'
        : sentryClientDsnConfigured
          ? 'Sentry runtime configurado con source maps pendientes'
          : 'Sentry server configurado; falta DSN público o source maps'
      : null,
    sentryIncidentsReaderConfigured && sentryOrgConfigured && sentryProjectConfigured
      ? 'reader de incidentes Sentry configurado'
      : null,
    slackAlertsWebhookConfigured ? 'Slack alerts configuradas' : null
  ].filter(Boolean)

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(' · ') : 'Observabilidad externa no configurada',
    sentry: {
      dsnConfigured: sentryDsnConfigured,
      clientDsnConfigured: sentryClientDsnConfigured,
      authTokenConfigured: sentryAuthTokenConfigured,
      orgConfigured: sentryOrgConfigured,
      projectConfigured: sentryProjectConfigured,
      enabled: sentryDsnConfigured,
      sourceMapsReady: sentrySourceMapsReady
    },
    slack: {
      alertsWebhookConfigured: slackAlertsWebhookConfigured,
      enabled: slackAlertsWebhookConfigured
    }
  }
}

/**
 * Read open Sentry issues, optionally filtered by a domain tag.
 *
 * The `domain` parameter maps to a Sentry custom tag (`tags[domain]`) that
 * we attach to every `Sentry.captureException()` call via the canonical
 * `captureWithDomain()` wrapper in `src/lib/observability/capture.ts`.
 * Filtering by domain lets the reliability registry surface a per-module
 * `incident` signal (`finance`, `delivery`, `cloud`, etc.) without having
 * to maintain per-domain Sentry projects — one project, many tags.
 *
 * When `domain` is not provided, returns ALL open issues (legacy behavior).
 */
export interface GetSentryIncidentsOptions {
  domain?: string | null
}

export const getCloudSentryIncidents = async (
  env: ObservabilityEnv = process.env,
  options: GetSentryIncidentsOptions = {}
): Promise<CloudSentryIncidentsSnapshot> => {
  const incidentsTokenResolution = await resolveSecret({
    envVarName: 'SENTRY_INCIDENTS_AUTH_TOKEN',
    env: env as NodeJS.ProcessEnv
  })

  const sentryAuthToken = incidentsTokenResolution.value?.trim() || env.SENTRY_AUTH_TOKEN?.trim()
  const sentryOrg = env.SENTRY_ORG?.trim()
  const sentryProject = env.SENTRY_PROJECT?.trim()

  if (!sentryAuthToken || !sentryOrg || !sentryProject) {
    return buildIncidentsSnapshot({
      status: 'unconfigured',
      enabled: false,
      available: false,
      summary: 'Sentry incident reader no configurado',
      error: null
    })
  }

  const sentryEnvironment = getSentryRuntimeEnvironment(env)
  const domainFilter = options.domain?.trim() || null

  const query = [
    'is:unresolved',
    sentryEnvironment ? `environment:${sentryEnvironment}` : null,
    domainFilter ? `domain:${domainFilter}` : null
  ].filter(Boolean).join(' ')

  const endpoint = new URL(`https://sentry.io/api/0/projects/${encodeURIComponent(sentryOrg)}/${encodeURIComponent(sentryProject)}/issues/`)

  endpoint.searchParams.set('limit', '6')
  endpoint.searchParams.set('query', query)
  endpoint.searchParams.set('sort', 'date')

  try {
    const response = await fetchWithTimeout(
      endpoint.toString(),
      {
        headers: {
          Authorization: `Bearer ${sentryAuthToken}`,
          Accept: 'application/json'
        },
        cache: 'no-store'
      },
      4000
    )

    if (!response.ok) {
      const errorBody = await response.text()

      const permissionError = response.status === 401 || response.status === 403

      return buildIncidentsSnapshot({
        status: 'warning',
        enabled: true,
        available: false,
        summary: permissionError
          ? 'El token Sentry no tiene permisos para leer incidentes'
          : 'No fue posible consultar incidentes Sentry',
        error: permissionError
          ? `HTTP ${response.status} · el reader necesita un token con scope event:read para ${sentryOrg}/${sentryProject}${errorBody ? ` · ${errorBody.slice(0, 200)}` : ''}`
          : `HTTP ${response.status}${errorBody ? ` · ${errorBody.slice(0, 200)}` : ''}`
      })
    }

    const payload = (await response.json()) as SentryIssueResponse[]
    const incidents = Array.isArray(payload) ? payload.map(normalizeIssue) : []

    if (incidents.length === 0) {
      return buildIncidentsSnapshot({
        status: 'ok',
        enabled: true,
        available: true,
        summary: sentryEnvironment
          ? `Sin incidentes Sentry abiertos en ${sentryEnvironment}`
          : 'Sin incidentes Sentry abiertos',
        incidents
      })
    }

    return buildIncidentsSnapshot({
      status: 'warning',
      enabled: true,
      available: true,
      summary: sentryEnvironment
        ? `${incidents.length} incidente(s) Sentry abiertos en ${sentryEnvironment}`
        : `${incidents.length} incidente(s) Sentry abiertos`,
      incidents
    })
  } catch (error) {
    const errorSummary = error instanceof Error ? error.message : String(error)

    return buildIncidentsSnapshot({
      status: 'warning',
      enabled: true,
      available: false,
      summary: 'Sentry no respondió; se mantiene fallback operativo',
      error: errorSummary
    })
  }
}
