import 'server-only'

import { redactErrorForResponse } from '@/lib/observability/redact'

import type {
  KortexAdoptionKpisSummary,
  KortexDeploymentSummary,
  KortexGreenhouseContextSummary,
  KortexLatestAuditSummary,
  KortexOpenApiSummary,
  KortexPortalRuntimeSummary,
  KortexRuntimeSnapshot,
  KortexSourceHealth
} from './types'

const DEFAULT_KORTEX_CONTROL_PLANE_BASE_URL = 'https://kortex-control-plane-758246035804.us-central1.run.app'
const KORTEX_FETCH_TIMEOUT_MS = 10_000

const ALLOWED_GET_PATH_PATTERNS = [
  /^\/openapi\.json$/,
  /^\/healthz$/,
  /^\/api\/v1\/greenhouse\/context$/,
  /^\/portal-runtime\/overview$/,
  /^\/api\/v1\/audits\/latest$/,
  /^\/api\/v1\/portals\/[^/]+\/onboarding$/,
  /^\/api\/v1\/portals\/[^/]+\/deployment-summary$/,
  /^\/api\/v1\/portals\/[^/]+\/adoption-kpis$/
]

const nowIso = () => new Date().toISOString()

const elapsedMs = (startedAt: number) => Math.max(0, Math.round(performance.now() - startedAt))

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const pickRecord = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }

  return {}
}

const pickString = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }

  return null
}

const pickNumber = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }

  return null
}

const pickBoolean = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]

    if (typeof value === 'boolean') return value
  }

  return null
}

const sourceHealth = ({
  source,
  status,
  startedAt,
  error,
  note
}: {
  source: KortexSourceHealth['source']
  status: KortexSourceHealth['status']
  startedAt: number
  error?: unknown
  note?: string
}): KortexSourceHealth => ({
  source,
  status,
  checkedAt: nowIso(),
  latencyMs: elapsedMs(startedAt),
  ...(error ? { error: redactErrorForResponse(error) } : {}),
  ...(note ? { note } : {})
})

export const isAllowedKortexControlPlaneGetPath = (path: string): boolean =>
  ALLOWED_GET_PATH_PATTERNS.some(pattern => pattern.test(path))

export const resolveKortexControlPlaneBaseUrl = () =>
  (process.env.KORTEX_CONTROL_PLANE_BASE_URL || process.env.KORTEX_RUNTIME_BASE_URL || DEFAULT_KORTEX_CONTROL_PLANE_BASE_URL).replace(/\/+$/, '')

const buildKortexHeaders = () => {
  const token = process.env.KORTEX_CONTROL_PLANE_READ_TOKEN || process.env.KORTEX_CONTROL_PLANE_TOKEN

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'greenhouse-kortex-control-plane-reader'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export const fetchKortexControlPlaneJson = async <T>({
  path,
  searchParams,
  timeoutMs = KORTEX_FETCH_TIMEOUT_MS
}: {
  path: string
  searchParams?: Record<string, string | null | undefined>
  timeoutMs?: number
}): Promise<T> => {
  if (!isAllowedKortexControlPlaneGetPath(path)) {
    throw new Error(`Kortex control-plane path is not allowlisted for read-only access: ${path}`)
  }

  const url = new URL(`${resolveKortexControlPlaneBaseUrl()}${path}`)

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, value)
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: buildKortexHeaders(),
      signal: controller.signal,
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Kortex control-plane ${path} returned ${response.status} ${response.statusText}`)
    }

    return await response.json() as T
  } finally {
    clearTimeout(timeout)
  }
}

export const summarizeOpenApi = (payload: unknown): KortexOpenApiSummary => {
  const root = asRecord(payload)
  const info = pickRecord(root, 'info')
  const paths = asRecord(root.paths)
  const pathEntries = Object.values(paths).map(asRecord)
  const readPathCount = pathEntries.filter(pathItem => pathItem.get).length

  const mutativePathCount = pathEntries.filter(pathItem => (
    pathItem.post || pathItem.put || pathItem.patch || pathItem.delete
  )).length

  const components = pickRecord(root, 'components')
  const securitySchemes = asRecord(components.securitySchemes)
  const securitySchemeKeys = Object.keys(securitySchemes).sort()

  return {
    available: true,
    title: pickString(info, 'title'),
    version: pickString(info, 'version'),
    openapi: pickString(root, 'openapi'),
    pathCount: Object.keys(paths).length,
    readPathCount,
    mutativePathCount,
    securityDeclared: securitySchemeKeys.length > 0 || asArray(root.security).length > 0,
    securitySchemeKeys
  }
}

export const summarizeGreenhouseContext = (payload: unknown): KortexGreenhouseContextSummary => {
  const root = asRecord(payload)
  const portal = pickRecord(root, 'portal')
  const contextSource = Object.keys(portal).length > 0 ? portal : root
  const client = pickRecord(contextSource, 'client')
  const bridge = pickRecord(root, 'bridge')
  const binding = pickRecord(root, 'greenhouse_binding', 'binding')
  const bridgeBinding = pickRecord(bridge, 'binding')
  const bindingSource = Object.keys(binding).length > 0 ? binding : bridgeBinding

  return {
    portalId: pickString(contextSource, 'portal_id', 'portalId'),
    hubspotPortalId: pickString(contextSource, 'hubspot_portal_id', 'hubspotPortalId'),
    portalStatus: pickString(contextSource, 'portal_status', 'portalStatus'),
    clientId: pickString(client, 'client_id', 'clientId'),
    clientName: pickString(client, 'client_name', 'clientName', 'display_name', 'displayName'),
    binding: Object.keys(bindingSource).length > 0
      ? {
          publicId: pickString(bindingSource, 'publicId', 'public_id'),
          bindingId: pickString(bindingSource, 'bindingId', 'binding_id'),
          externalScopeId: pickString(bindingSource, 'externalScopeId', 'external_scope_id'),
          bindingStatus: pickString(bindingSource, 'bindingStatus', 'binding_status'),
          greenhouseScopeType: pickString(bindingSource, 'greenhouseScopeType', 'greenhouse_scope_type')
        }
      : null
  }
}

export const summarizePortalRuntime = (payload: unknown): KortexPortalRuntimeSummary => {
  const root = asRecord(payload)
  const selectedPortal = pickRecord(root, 'selected_portal', 'portal')
  const installation = pickRecord(selectedPortal, 'hubspot_installation', 'installation')
  const latestDeployment = pickRecord(selectedPortal, 'latest_deployment', 'deployment')
  const latestAudit = pickRecord(selectedPortal, 'latest_audit', 'audit')
  const liveSchema = pickRecord(selectedPortal, 'live_schema', 'schema')
  const fallbackInstallation = Object.keys(installation).length > 0 ? installation : pickRecord(root, 'hubspot_installation', 'installation')
  const fallbackDeployment = Object.keys(latestDeployment).length > 0 ? latestDeployment : pickRecord(root, 'latest_deployment', 'deployment')
  const fallbackAudit = Object.keys(latestAudit).length > 0 ? latestAudit : pickRecord(root, 'latest_audit', 'audit')
  const fallbackLiveSchema = Object.keys(liveSchema).length > 0 ? liveSchema : pickRecord(root, 'live_schema', 'schema')

  return {
    environment: pickString(root, 'environment'),
    portalId: pickString(selectedPortal, 'portal_id', 'portalId', 'id'),
    hubspotPortalId: pickString(selectedPortal, 'hubspot_portal_id', 'hubspotPortalId'),
    portalStatus: pickString(selectedPortal, 'portal_status', 'status'),
    portalName: pickString(selectedPortal, 'portal_name', 'name'),
    installationStatus: pickString(fallbackInstallation, 'install_status', 'status'),
    grantedScopeCount: pickNumber(fallbackInstallation, 'granted_scope_count', 'scope_count'),
    latestDeployment: Object.keys(fallbackDeployment).length > 0
      ? {
          deploymentId: pickString(fallbackDeployment, 'deployment_id', 'deploymentId', 'deployment_run_id', 'deploymentRunId', 'id'),
          status: pickString(fallbackDeployment, 'status'),
          scope: pickString(fallbackDeployment, 'scope', 'deployment_scope', 'deploymentScope'),
          createdAt: pickString(fallbackDeployment, 'created_at', 'createdAt'),
          completedAt: pickString(fallbackDeployment, 'completed_at', 'completedAt', 'finished_at', 'finishedAt')
        }
      : null,
    latestAudit: Object.keys(fallbackAudit).length > 0
      ? {
          auditRunId: pickString(fallbackAudit, 'audit_run_id', 'auditRunId', 'id'),
          status: pickString(fallbackAudit, 'status'),
          completedAt: pickString(fallbackAudit, 'completed_at', 'completedAt', 'created_at', 'createdAt')
        }
      : null,
    liveSchemaAvailable: pickBoolean(fallbackLiveSchema, 'available')
  }
}

export const summarizeLatestAudit = (payload: unknown): KortexLatestAuditSummary => {
  const root = asRecord(payload)
  const auditRun = pickRecord(root, 'audit_run', 'auditRun', 'latest_audit')
  const scorecard = pickRecord(root, 'scorecard')
  const severityCountsRaw = asRecord(scorecard.severity_counts ?? scorecard.severityCounts ?? root.severity_counts)

  const severityCounts = Object.fromEntries(
    Object.entries(severityCountsRaw)
      .map(([key, value]) => [key, typeof value === 'number' ? value : Number(value)])
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1]))
  )

  const findings = asArray(root.findings)

  return {
    auditRunId: pickString(auditRun, 'audit_run_id', 'auditRunId', 'id') || pickString(root, 'audit_run_id', 'auditRunId'),
    status: pickString(auditRun, 'status') || pickString(root, 'status'),
    findingCount: pickNumber(root, 'finding_count', 'findingCount') ?? (findings.length > 0 ? findings.length : null),
    severityCounts,
    overallScore: pickNumber(scorecard, 'overall_score', 'overallScore'),
    overallStatus: pickString(scorecard, 'overall_status', 'overallStatus'),
    completedAt: pickString(auditRun, 'completed_at', 'completedAt') || pickString(root, 'completed_at', 'completedAt')
  }
}

export const summarizeDeploymentSummary = (payload: unknown): KortexDeploymentSummary => {
  const root = asRecord(payload)
  const deployment = pickRecord(root, 'latest_deployment', 'deployment')
  const source = Object.keys(deployment).length > 0 ? deployment : root

  return {
    status: pickString(source, 'status'),
    deploymentId: pickString(source, 'deployment_id', 'deploymentId', 'id'),
    scope: pickString(source, 'scope'),
    createdAt: pickString(source, 'created_at', 'createdAt'),
    completedAt: pickString(source, 'completed_at', 'completedAt')
  }
}

export const summarizeAdoptionKpis = (payload: unknown): KortexAdoptionKpisSummary => {
  const root = asRecord(payload)
  const kpis = root.kpis ?? root.metrics ?? root.items
  const observedKeys = Object.keys(root).sort().slice(0, 20)

  return {
    status: pickString(root, 'status'),
    kpiCount: Array.isArray(kpis) ? kpis.length : (kpis && typeof kpis === 'object' ? Object.keys(kpis).length : null),
    observedKeys
  }
}

const readRuntimeSource = async <T>({
  source,
  path,
  searchParams,
  summarize
}: {
  source: KortexSourceHealth['source']
  path: string
  searchParams?: Record<string, string | null | undefined>
  summarize: (payload: unknown) => T
}): Promise<{ data: T | null; health: KortexSourceHealth }> => {
  const startedAt = performance.now()

  try {
    const payload = await fetchKortexControlPlaneJson<unknown>({ path, searchParams })

    return {
      data: summarize(payload),
      health: sourceHealth({ source, status: 'ok', startedAt })
    }
  } catch (error) {
    return {
      data: null,
      health: sourceHealth({ source, status: 'unavailable', startedAt, error })
    }
  }
}

export const readKortexRuntimeSnapshot = async ({
  portalId,
  hubspotPortalId
}: {
  portalId?: string | null
  hubspotPortalId?: string | null
} = {}): Promise<KortexRuntimeSnapshot> => {
  const sources: KortexSourceHealth[] = []

  const openApi = await readRuntimeSource({
    source: 'kortex_openapi',
    path: '/openapi.json',
    summarize: summarizeOpenApi
  })

  sources.push(openApi.health)

  const greenhouseContext = hubspotPortalId
    ? await readRuntimeSource({
        source: 'kortex_greenhouse_context',
        path: '/api/v1/greenhouse/context',
        searchParams: { hubspot_portal_id: hubspotPortalId },
        summarize: summarizeGreenhouseContext
      })
    : {
        data: null,
        health: {
          source: 'kortex_greenhouse_context',
          status: 'skipped',
          checkedAt: nowIso(),
          note: 'hubspotPortalId not provided'
        } satisfies KortexSourceHealth
      }

  sources.push(greenhouseContext.health)

  const runtimeSearch = hubspotPortalId
    ? { hubspot_portal_id: hubspotPortalId }
    : portalId
      ? { portal_id: portalId }
      : null

  const portalRuntime = runtimeSearch
    ? await readRuntimeSource({
        source: 'kortex_portal_runtime',
        path: '/portal-runtime/overview',
        searchParams: runtimeSearch,
        summarize: summarizePortalRuntime
      })
    : {
        data: null,
        health: {
          source: 'kortex_portal_runtime',
          status: 'skipped',
          checkedAt: nowIso(),
          note: 'portalId or hubspotPortalId not provided'
        } satisfies KortexSourceHealth
      }

  sources.push(portalRuntime.health)

  const latestAudit = runtimeSearch
    ? await readRuntimeSource({
        source: 'kortex_latest_audit',
        path: '/api/v1/audits/latest',
        searchParams: runtimeSearch,
        summarize: summarizeLatestAudit
      })
    : {
        data: null,
        health: {
          source: 'kortex_latest_audit',
          status: 'skipped',
          checkedAt: nowIso(),
          note: 'portalId or hubspotPortalId not provided'
        } satisfies KortexSourceHealth
      }

  sources.push(latestAudit.health)

  const deploymentSummary = hubspotPortalId
    ? await readRuntimeSource({
        source: 'kortex_deployment_summary',
        path: `/api/v1/portals/${encodeURIComponent(hubspotPortalId)}/deployment-summary`,
        summarize: summarizeDeploymentSummary
      })
    : {
        data: null,
        health: {
          source: 'kortex_deployment_summary',
          status: 'skipped',
          checkedAt: nowIso(),
          note: 'hubspotPortalId not provided'
        } satisfies KortexSourceHealth
      }

  sources.push(deploymentSummary.health)

  const adoptionKpis = hubspotPortalId
    ? await readRuntimeSource({
        source: 'kortex_adoption_kpis',
        path: `/api/v1/portals/${encodeURIComponent(hubspotPortalId)}/adoption-kpis`,
        summarize: summarizeAdoptionKpis
      })
    : {
        data: null,
        health: {
          source: 'kortex_adoption_kpis',
          status: 'skipped',
          checkedAt: nowIso(),
          note: 'hubspotPortalId not provided'
        } satisfies KortexSourceHealth
      }

  sources.push(adoptionKpis.health)

  return {
    baseUrl: resolveKortexControlPlaneBaseUrl(),
    openApi: openApi.data,
    greenhouseContext: greenhouseContext.data,
    portalRuntime: portalRuntime.data,
    latestAudit: latestAudit.data,
    deploymentSummary: deploymentSummary.data,
    adoptionKpis: adoptionKpis.data,
    sources
  }
}
