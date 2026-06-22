export const PUBLIC_SITE_GITHUB_COMMAND_CONTRACT_VERSION =
  'public-site-github-command-adapter.v1'

export type PublicSiteGithubCommandName =
  | 'public_site.github.workflow.rerun_failed'
  | 'public_site.github.workflow.dispatch'

export type PublicSiteGithubCommandTier = 'workflow_rerun' | 'workflow_dispatch'

export interface PublicSiteGithubCommandRequest {
  commandName: PublicSiteGithubCommandName
  reason: string
  payload: Record<string, unknown>
  confirmation: {
    confirmed: boolean
    phrase: string | null
  } | null
}

export interface PublicSiteGithubCommandRegistryEntry {
  operationKind: string
  tier: PublicSiteGithubCommandTier
  summary: string
  confirmationPhrase?: string
}

export interface PublicSiteGithubCommandExecutionInput {
  request: Request
  tenant: {
    userId: string
    organizationId?: string | null
    clientId?: string | null
    spaceId?: string | null
  }
  body: PublicSiteGithubCommandRequest
}

export interface PublicSiteGithubCommandSummary {
  commandName: PublicSiteGithubCommandName
  operationKind: string
  tier: PublicSiteGithubCommandTier
  workflowId: string | number | null
  workflowName: string | null
  ref: string | null
  runId: number | null
  statusCode: number
  observedKeys: string[]
}

export interface PublicSiteGithubCommandResponse {
  contractVersion: typeof PUBLIC_SITE_GITHUB_COMMAND_CONTRACT_VERSION
  commandExecutionId: string
  commandName: PublicSiteGithubCommandName
  status: 'accepted' | 'completed' | 'replayed'
  githubOperationId: string | null
  summary: PublicSiteGithubCommandSummary
  redacted: true
  warnings: string[]
  sources: Array<{
    source: 'github_actions_api'
    status: 'ok'
    checkedAt: string
    note: string
  }>
}
