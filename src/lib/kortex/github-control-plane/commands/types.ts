export const KORTEX_GITHUB_COMMAND_CONTRACT_VERSION =
  'greenhouse-kortex-github-command-adapter.v1'

export type KortexGithubCommandName =
  | 'kortex.github.workflow.rerun_failed'
  | 'kortex.github.workflow.dispatch'

export type KortexGithubCommandTier = 'workflow_rerun' | 'workflow_dispatch'

export interface KortexGithubCommandRequest {
  commandName: KortexGithubCommandName
  reason: string
  payload: Record<string, unknown>
  confirmation: {
    confirmed: boolean
    phrase: string | null
  } | null
}

export interface KortexGithubCommandRegistryEntry {
  operationKind: string
  tier: KortexGithubCommandTier
  summary: string
  confirmationPhrase?: string
}

export interface KortexGithubCommandExecutionInput {
  request: Request
  tenant: {
    userId: string
    organizationId?: string | null
    clientId?: string | null
    spaceId?: string | null
  }
  body: KortexGithubCommandRequest
}

export interface KortexGithubCommandSummary {
  commandName: KortexGithubCommandName
  operationKind: string
  tier: KortexGithubCommandTier
  workflowId: string | number | null
  workflowName: string | null
  ref: string | null
  runId: number | null
  statusCode: number
  observedKeys: string[]
}

export interface KortexGithubCommandResponse {
  contractVersion: typeof KORTEX_GITHUB_COMMAND_CONTRACT_VERSION
  commandExecutionId: string
  commandName: KortexGithubCommandName
  status: 'accepted' | 'completed' | 'replayed'
  githubOperationId: string | null
  summary: KortexGithubCommandSummary
  redacted: true
  warnings: string[]
  sources: Array<{
    source: 'github_actions_api'
    status: 'ok'
    checkedAt: string
    note: string
  }>
}
