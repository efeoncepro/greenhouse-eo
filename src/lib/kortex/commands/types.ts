import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export const KORTEX_COMMAND_CONTRACT_VERSION = 'greenhouse-kortex-command-adapter.v1'

export type KortexCommandName =
  | 'kortex.audit.run'
  | 'kortex.strategy.compile'
  | 'kortex.strategy.release_candidate.dry_run'
  | 'kortex.strategy.release_candidate.execute'

export type KortexCommandStatus = 'accepted' | 'completed' | 'failed' | 'replayed' | 'blocked'

export type KortexCommandSourceHealth = {
  source: 'greenhouse_preflight' | 'kortex_command_api'
  status: 'ok' | 'blocked' | 'degraded'
  checkedAt: string
  latencyMs?: number
  note?: string
}

export type KortexCommandRequest = {
  commandName: KortexCommandName
  portalId?: string | null
  hubspotPortalId?: string | number | null
  bindingId?: string | null
  reason: string
  payload?: Record<string, unknown> | null
  confirmation?: {
    confirmed?: boolean
    phrase?: string | null
    previewCommandExecutionId?: string | null
  } | null
}

export type KortexCommandScope = {
  requestedPortalId: string | null
  requestedHubspotPortalId: string | null
  resolvedPortalId: string | null
  resolvedHubspotPortalId: string | null
  bindingId: string | null
  bindingPublicId: string | null
  greenhouseScopeType: string | null
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
}

export type KortexCommandSummary = {
  commandName: KortexCommandName
  operationId: string | null
  operationKind: string
  portalId: string | null
  hubspotPortalId: string | null
  workspaceId: string | null
  releaseCandidateId: string | null
  deploymentMode: 'dry_run' | 'execute' | null
  status: string | null
  observedKeys: string[]
}

export type KortexCommandResponse = {
  contractVersion: typeof KORTEX_COMMAND_CONTRACT_VERSION
  commandExecutionId: string
  commandName: KortexCommandName
  status: KortexCommandStatus
  kortexOperationId: string | null
  scope: KortexCommandScope
  summary: KortexCommandSummary
  warnings: string[]
  sources: KortexCommandSourceHealth[]
  redacted: true
}

export type KortexCommandExecutionInput = {
  request: Request
  body: KortexCommandRequest
  tenant: Pick<TenantContext, 'userId' | 'organizationId' | 'clientId' | 'spaceId' | 'tenantType'>
}

export type KortexUpstreamCommand = {
  path: string
  body: Record<string, unknown>
  operationKind: KortexCommandSummary['operationKind']
  deploymentMode: KortexCommandSummary['deploymentMode']
  workspaceId: string | null
  releaseCandidateId: string | null
}
