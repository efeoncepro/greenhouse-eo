import { ExternalAccessError } from './errors'
import {
  EXTERNAL_ENVIRONMENT_STATUSES,
  EXTERNAL_ISSUER_CLASSES,
  EXTERNAL_SUBJECT_TYPES,
  type ExternalEnvironmentStatus,
  type ExternalIssuerClass,
  type ExternalSubjectType
} from './types'

/**
 * TASK-1631 — Validadores del dominio (sin Zod, por convención del repo). Los patrones reflejan
 * los CHECK de la migración para fallar ANTES de la transacción con un código claro.
 */

const ENVIRONMENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/
const PROVIDER_PATTERN = /^[a-z][a-z0-9_]{1,31}$/
const HTTPS_URL_PATTERN = /^https:\/\/[^\s/]+(\/[^\s]*)?$/
const CAPABILITY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const assertNonEmptyString = (value: unknown, field: string, maxLength = 512): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ExternalAccessError('invalid_request', `${field} is required`, { field })
  }

  const trimmed = value.trim()

  if (trimmed.length > maxLength) {
    throw new ExternalAccessError('invalid_request', `${field} exceeds ${maxLength} characters`, { field, maxLength })
  }

  return trimmed
}

export const optionalString = (value: unknown, field: string, maxLength = 2000): string | null => {
  if (value === undefined || value === null || value === '') return null

  return assertNonEmptyString(value, field, maxLength)
}

export const assertEnvironmentId = (value: unknown): string => {
  const environmentId = assertNonEmptyString(value, 'environmentId', 64)

  if (!ENVIRONMENT_ID_PATTERN.test(environmentId)) {
    throw new ExternalAccessError('invalid_request', 'environmentId must match ^[a-z0-9][a-z0-9_-]{2,63}$', {
      field: 'environmentId'
    })
  }

  return environmentId
}

export const assertProvider = (value: unknown): string => {
  const provider = assertNonEmptyString(value, 'provider', 32)

  if (!PROVIDER_PATTERN.test(provider)) {
    throw new ExternalAccessError('invalid_request', 'provider must match ^[a-z][a-z0-9_]{1,31}$', {
      field: 'provider'
    })
  }

  return provider
}

export const assertHttpsUrl = (value: unknown, field: string): string => {
  const url = assertNonEmptyString(value, field, 2048)

  if (!HTTPS_URL_PATTERN.test(url)) {
    throw new ExternalAccessError('invalid_request', `${field} must be an https URL`, { field })
  }

  return url
}

export const assertCapability = (value: unknown): string => {
  const capability = assertNonEmptyString(value, 'capability', 200)

  if (!CAPABILITY_PATTERN.test(capability)) {
    throw new ExternalAccessError('invalid_request', 'capability must be a namespaced dotted key', {
      field: 'capability'
    })
  }

  return capability
}

export const normalizeEmail = (value: unknown): string => {
  const email = assertNonEmptyString(value, 'email', 320).toLowerCase()

  if (!EMAIL_PATTERN.test(email)) {
    throw new ExternalAccessError('invalid_request', 'email is not valid', { field: 'email' })
  }

  return email
}

export const assertIssuerClass = (value: unknown): ExternalIssuerClass => {
  if (typeof value === 'string' && (EXTERNAL_ISSUER_CLASSES as readonly string[]).includes(value)) {
    return value as ExternalIssuerClass
  }

  throw new ExternalAccessError('invalid_request', 'issuerClass must be internal or external', {
    field: 'issuerClass'
  })
}

export const assertSubjectType = (value: unknown): ExternalSubjectType => {
  if (value === undefined || value === null) return 'public'

  if (typeof value === 'string' && (EXTERNAL_SUBJECT_TYPES as readonly string[]).includes(value)) {
    return value as ExternalSubjectType
  }

  throw new ExternalAccessError('invalid_request', 'subjectType must be public or pairwise', {
    field: 'subjectType'
  })
}

export const assertEnvironmentStatus = (value: unknown): ExternalEnvironmentStatus => {
  if (value === undefined || value === null) return 'draft'

  if (typeof value === 'string' && (EXTERNAL_ENVIRONMENT_STATUSES as readonly string[]).includes(value)) {
    return value as ExternalEnvironmentStatus
  }

  throw new ExternalAccessError('invalid_request', 'status must be draft, active, suspended or retired', {
    field: 'status'
  })
}

export const assertPositiveInteger = (value: unknown, field: string, fallback: number, max: number): number => {
  if (value === undefined || value === null) return fallback

  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > max) {
    throw new ExternalAccessError('invalid_request', `${field} must be an integer between 1 and ${max}`, {
      field,
      max
    })
  }

  return parsed
}
