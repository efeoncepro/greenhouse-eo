const truthy = new Set(['1', 'true', 'yes', 'on'])

const envFlag = (name: string, defaultValue = false): boolean => {
  const value = process.env[name]

  if (!value) return defaultValue

  return truthy.has(value.trim().toLowerCase())
}

const csv = (name: string, fallback: string[]): string[] => {
  const value = process.env[name]

  if (!value) return fallback

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export const isPublicSiteGithubCommandsEnabled = (): boolean =>
  envFlag('PUBLIC_SITE_GITHUB_COMMANDS_ENABLED', false)

export const isPublicSiteGithubWorkflowDispatchEnabled = (): boolean =>
  envFlag('PUBLIC_SITE_GITHUB_WORKFLOW_DISPATCH_ENABLED', false)

export const getPublicSiteGithubAllowedWorkflows = (): string[] =>
  csv('PUBLIC_SITE_GITHUB_ALLOWED_WORKFLOWS', ['CI'])

export const getPublicSiteGithubAllowedRefs = (): string[] =>
  csv('PUBLIC_SITE_GITHUB_ALLOWED_REFS', ['main', 'develop'])

export const isPublicSiteGithubWorkflowAllowed = (workflow: string | number): boolean => {
  const normalized = String(workflow).trim().toLowerCase()

  return getPublicSiteGithubAllowedWorkflows().some(item => item.trim().toLowerCase() === normalized)
}

export const isPublicSiteGithubRefAllowed = (ref: string): boolean => {
  const normalized = ref.trim()

  return getPublicSiteGithubAllowedRefs().includes(normalized)
}
