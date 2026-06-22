import type {
  PublicSiteGithubCommandName,
  PublicSiteGithubCommandRegistryEntry
} from './types'

export const PUBLIC_SITE_WORKFLOW_DISPATCH_CONFIRMATION_PHRASE =
  'EXECUTE PUBLIC SITE GITHUB WORKFLOW'

export const PUBLIC_SITE_GITHUB_COMMAND_REGISTRY = {
  'public_site.github.workflow.rerun_failed': {
    operationKind: 'github_workflow_rerun_failed_jobs',
    tier: 'workflow_rerun',
    summary: 'Rerun failed jobs for an allowlisted Public Site GitHub Actions workflow run.'
  },
  'public_site.github.workflow.dispatch': {
    operationKind: 'github_workflow_dispatch',
    tier: 'workflow_dispatch',
    summary: 'Dispatch an allowlisted Public Site GitHub Actions workflow on an allowlisted ref.',
    confirmationPhrase: PUBLIC_SITE_WORKFLOW_DISPATCH_CONFIRMATION_PHRASE
  }
} satisfies Record<PublicSiteGithubCommandName, PublicSiteGithubCommandRegistryEntry>

export const PUBLIC_SITE_GITHUB_COMMAND_NAMES = Object.keys(
  PUBLIC_SITE_GITHUB_COMMAND_REGISTRY
) as PublicSiteGithubCommandName[]

export const isPublicSiteGithubCommandName = (
  value: string
): value is PublicSiteGithubCommandName => {
  return PUBLIC_SITE_GITHUB_COMMAND_NAMES.includes(value as PublicSiteGithubCommandName)
}

export const getPublicSiteGithubCommandDefinition = (
  commandName: PublicSiteGithubCommandName
): PublicSiteGithubCommandRegistryEntry => PUBLIC_SITE_GITHUB_COMMAND_REGISTRY[commandName]
