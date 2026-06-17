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

export const isKortexGithubCommandsEnabled = (): boolean =>
  envFlag('KORTEX_GITHUB_COMMANDS_ENABLED', false)

export const isKortexGithubWorkflowDispatchEnabled = (): boolean =>
  envFlag('KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED', false)

export const getKortexGithubAllowedWorkflows = (): string[] =>
  csv('KORTEX_GITHUB_ALLOWED_WORKFLOWS', ['CI'])

export const getKortexGithubAllowedRefs = (): string[] =>
  csv('KORTEX_GITHUB_ALLOWED_REFS', ['main', 'develop'])

export const isKortexGithubWorkflowAllowed = (workflow: string | number): boolean => {
  const normalized = String(workflow).trim().toLowerCase()

  return getKortexGithubAllowedWorkflows().some(item => item.trim().toLowerCase() === normalized)
}

export const isKortexGithubRefAllowed = (ref: string): boolean => {
  const normalized = ref.trim()

  return getKortexGithubAllowedRefs().includes(normalized)
}
