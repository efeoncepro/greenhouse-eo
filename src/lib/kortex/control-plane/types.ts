import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export const KORTEX_CONTROL_PLANE_CONTRACT_VERSION = 'greenhouse-kortex-control-plane-reader.v1'

export type KortexControlPlaneConfidence = 'high' | 'medium' | 'low' | 'none'

export type KortexReaderStatus = 'ok' | 'degraded' | 'unavailable' | 'skipped'

export type KortexControlPlaneSource =
  | 'github'
  | 'kortex_openapi'
  | 'kortex_greenhouse_context'
  | 'kortex_portal_runtime'
  | 'kortex_latest_audit'
  | 'kortex_deployment_summary'
  | 'kortex_adoption_kpis'
  | 'greenhouse_binding'

export type KortexSourceHealth = {
  source: KortexControlPlaneSource
  status: KortexReaderStatus
  checkedAt: string
  latencyMs?: number
  error?: string
  note?: string
}

export type KortexReaderResult<T> = {
  status: KortexReaderStatus
  data: T | null
  health: KortexSourceHealth
}

export type KortexRepositorySnapshot = {
  owner: string
  repo: string
  nameWithOwner: string
  url: string
  defaultBranch: string | null
  isPrivate: boolean | null
  pushedAt: string | null
  updatedAt: string | null
  latestCommit: {
    sha: string
    shortSha: string
    url: string | null
    message: string | null
    authoredAt: string | null
  } | null
  openIssueCount: number | null
  openPullRequestCount: number | null
}

export type KortexOpenApiSummary = {
  available: boolean
  title: string | null
  version: string | null
  openapi: string | null
  pathCount: number
  readPathCount: number
  mutativePathCount: number
  securityDeclared: boolean
  securitySchemeKeys: string[]
}

export type KortexGreenhouseContextSummary = {
  portalId: string | null
  hubspotPortalId: string | null
  portalStatus: string | null
  clientId: string | null
  clientName: string | null
  binding: {
    publicId: string | null
    bindingId: string | null
    externalScopeId: string | null
    bindingStatus: string | null
    greenhouseScopeType: string | null
  } | null
}

export type KortexPortalRuntimeSummary = {
  environment: string | null
  portalId: string | null
  hubspotPortalId: string | null
  portalStatus: string | null
  portalName: string | null
  installationStatus: string | null
  grantedScopeCount: number | null
  latestDeployment: {
    deploymentId: string | null
    status: string | null
    scope: string | null
    createdAt: string | null
    completedAt: string | null
  } | null
  latestAudit: {
    auditRunId: string | null
    status: string | null
    completedAt: string | null
  } | null
  liveSchemaAvailable: boolean | null
}

export type KortexLatestAuditSummary = {
  auditRunId: string | null
  status: string | null
  findingCount: number | null
  severityCounts: Record<string, number>
  overallScore: number | null
  overallStatus: string | null
  completedAt: string | null
}

export type KortexDeploymentSummary = {
  status: string | null
  deploymentId: string | null
  scope: string | null
  createdAt: string | null
  completedAt: string | null
}

export type KortexAdoptionKpisSummary = {
  status: string | null
  kpiCount: number | null
  observedKeys: string[]
}

export type KortexRuntimeSnapshot = {
  baseUrl: string
  openApi: KortexOpenApiSummary | null
  greenhouseContext: KortexGreenhouseContextSummary | null
  portalRuntime: KortexPortalRuntimeSummary | null
  latestAudit: KortexLatestAuditSummary | null
  deploymentSummary: KortexDeploymentSummary | null
  adoptionKpis: KortexAdoptionKpisSummary | null
  sources: KortexSourceHealth[]
}

export type KortexBindingSnapshot = {
  bindingFound: boolean
  sisterPlatformKey: 'kortex'
  externalScopeType: 'portal'
  externalScopeId: string
  bindingStatus: string | null
  greenhouseScopeType: string | null
  organizationId: string | null
  organizationName: string | null
  clientId: string | null
  clientName: string | null
  spaceId: string | null
  spaceName: string | null
  bindingId: string | null
  publicId: string | null
}

export type ComposeKortexControlPlaneInput = {
  portalId?: string | null
  hubspotPortalId?: string | null
  tenant?: Pick<TenantContext, 'organizationId' | 'clientId' | 'spaceId' | 'userId'> | null
}

export type KortexControlPlanePacket = {
  contractVersion: typeof KORTEX_CONTROL_PLANE_CONTRACT_VERSION
  generatedAt: string
  confidence: KortexControlPlaneConfidence
  scope: {
    requestedPortalId: string | null
    requestedHubspotPortalId: string | null
    resolvedPortalId: string | null
    resolvedHubspotPortalId: string | null
  }
  repository: KortexRepositorySnapshot | null
  runtime: KortexRuntimeSnapshot | null
  binding: KortexBindingSnapshot | null
  observedCapabilities: string[]
  sources: KortexSourceHealth[]
  warnings: string[]
}
