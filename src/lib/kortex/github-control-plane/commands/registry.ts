import type {
  KortexGithubCommandName,
  KortexGithubCommandRegistryEntry
} from './types'

export const WORKFLOW_DISPATCH_CONFIRMATION_PHRASE = 'DISPATCH KORTEX WORKFLOW'

export const KORTEX_GITHUB_COMMAND_REGISTRY = {
  'kortex.github.workflow.rerun_failed': {
    operationKind: 'github_workflow_rerun_failed_jobs',
    tier: 'workflow_rerun',
    summary: 'Rerun failed jobs for an allowlisted Kortex GitHub Actions workflow run.'
  },
  'kortex.github.workflow.dispatch': {
    operationKind: 'github_workflow_dispatch',
    tier: 'workflow_dispatch',
    summary: 'Dispatch an allowlisted Kortex GitHub Actions workflow on an allowlisted ref.',
    confirmationPhrase: WORKFLOW_DISPATCH_CONFIRMATION_PHRASE
  }
} satisfies Record<KortexGithubCommandName, KortexGithubCommandRegistryEntry>

export const KORTEX_GITHUB_COMMAND_NAMES = Object.keys(
  KORTEX_GITHUB_COMMAND_REGISTRY
) as KortexGithubCommandName[]

export const isKortexGithubCommandName = (
  value: string
): value is KortexGithubCommandName => {
  return KORTEX_GITHUB_COMMAND_NAMES.includes(value as KortexGithubCommandName)
}

export const getKortexGithubCommandDefinition = (
  commandName: KortexGithubCommandName
): KortexGithubCommandRegistryEntry => KORTEX_GITHUB_COMMAND_REGISTRY[commandName]
