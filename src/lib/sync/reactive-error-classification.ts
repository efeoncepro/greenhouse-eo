import type { TablePrivilege } from './projection-registry'

export type ReactiveErrorCategory =
  | 'infra.db_privilege'
  | 'infra.db_missing_object'
  | 'infra.db_connectivity'
  | 'infra.credential'
  | 'application'

export type ReactiveErrorFamily = 'infrastructure' | 'application'

export interface ReactiveErrorClassification {
  category: ReactiveErrorCategory
  family: ReactiveErrorFamily
  isInfrastructure: boolean
  message: string
  formattedMessage: string
}

const CATEGORY_PREFIX_REGEX = /^\[(?<category>[a-z_.]+)\]\s*/i

const DB_PRIVILEGE_REGEX = /permission denied for (table|schema|sequence|view|relation)\b/i

const DB_MISSING_OBJECT_REGEX =
  /(relation|table|schema|sequence|view)\b.+\bdoes not exist\b|is missing|undefined_table|42p01/i

const DB_CONNECTIVITY_REGEX =
  /econnrefused|etimedout|connection refused|connect timeout|cloud sql reachable|could not connect|terminating connection/i

const CREDENTIAL_REGEX =
  /password authentication failed|no pg password found|secret.*not found|invalid token|missing credentials/i

const normalizeMessage = (error: unknown): string => {
  if (error instanceof Error && typeof error.message === 'string') return error.message
  if (typeof error === 'string') return error

  return String(error)
}

const inferCategory = (message: string, code?: string | null): ReactiveErrorCategory => {
  if (code === '42501' || DB_PRIVILEGE_REGEX.test(message)) return 'infra.db_privilege'
  if (code === '42P01' || DB_MISSING_OBJECT_REGEX.test(message)) return 'infra.db_missing_object'
  if (DB_CONNECTIVITY_REGEX.test(message)) return 'infra.db_connectivity'
  if (CREDENTIAL_REGEX.test(message)) return 'infra.credential'

  return 'application'
}

export const classifyReactiveError = (error: unknown): ReactiveErrorClassification => {
  const message = normalizeMessage(error).trim() || 'Unknown error'

  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? ((error as { code: string }).code ?? null)
      : null

  const category = inferCategory(message, code)
  const isInfrastructure = category.startsWith('infra.')
  const family: ReactiveErrorFamily = isInfrastructure ? 'infrastructure' : 'application'

  return {
    category,
    family,
    isInfrastructure,
    message,
    formattedMessage: isInfrastructure ? `[${category}] ${message}` : message
  }
}

export const extractReactiveErrorCategory = (message: string | null | undefined): ReactiveErrorCategory | null => {
  if (!message) return null

  const match = message.match(CATEGORY_PREFIX_REGEX)
  const category = match?.groups?.category

  if (!category) return null

  return category as ReactiveErrorCategory
}

export const stripReactiveErrorCategory = (message: string | null | undefined): string | null => {
  if (!message) return null

  return message.replace(CATEGORY_PREFIX_REGEX, '').trim()
}

export const formatMissingPrivileges = (privileges: TablePrivilege[]): string =>
  privileges.map(privilege => privilege.toLowerCase()).join(', ')
