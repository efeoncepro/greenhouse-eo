import 'server-only'

import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { hasRoleCode, isClientTenant, requireTenantContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export class AiToolingValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'AiToolingValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const toAiToolingErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AiToolingValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

export const TOOL_CATEGORIES = [
  'gen_visual',
  'gen_video',
  'gen_text',
  'gen_audio',
  'ai_suite',
  'creative_production',
  'collaboration',
  'analytics',
  'crm',
  'infrastructure'
] as const

export const COST_MODELS = ['subscription', 'per_credit', 'hybrid', 'free_tier', 'included'] as const
export const LICENSE_STATUSES = ['active', 'pending', 'suspended', 'expired', 'revoked'] as const
export const ACCESS_LEVELS = ['full', 'limited', 'trial', 'viewer'] as const
export const WALLET_SCOPES = ['client', 'pool'] as const
export const WALLET_STATUSES = ['active', 'depleted', 'expired', 'suspended'] as const
export const LEDGER_ENTRY_TYPES = ['debit', 'credit', 'reserve', 'release', 'adjustment'] as const
export const RELOAD_REASONS = [
  'initial_allocation',
  'monthly_renewal',
  'purchase',
  'bonus',
  'rollover',
  'manual_adjustment'
] as const

export const getAiToolingProjectId = () => getBigQueryProjectId()

export const runAiToolingQuery = async <T>(query: string, params: Record<string, unknown> = {}) => {
  const [rows] = await getBigQueryClient().query({
    query,
    params
  })

  return rows as T[]
}

export const normalizeString = (value: unknown) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

export const normalizeNullableString = (value: unknown) => {
  const normalized = normalizeString(value)

  return normalized ? normalized : null
}

export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

export const toNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

export const toInt = (value: unknown) => Math.round(toNumber(value))

export const toDateString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return typeof value.value === 'string' ? value.value.slice(0, 10) : null
}

export const toTimestampString = (value: { value?: string } | string | null) => {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  return typeof value.value === 'string' ? value.value : null
}

export const assertEnum = <T extends readonly string[]>(value: unknown, allowed: T, label: string): T[number] => {
  const normalized = normalizeString(value)

  if (!normalized || !allowed.includes(normalized)) {
    throw new AiToolingValidationError(`${label} is invalid.`)
  }

  return normalized as T[number]
}

export const assertDateString = (value: unknown, label: string) => {
  const normalized = normalizeString(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new AiToolingValidationError(`${label} must use YYYY-MM-DD format.`)
  }

  return normalized
}

export const assertPositiveInteger = (value: unknown, label: string, { min = 1 }: { min?: number } = {}) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < min) {
    throw new AiToolingValidationError(`${label} must be an integer greater than or equal to ${min}.`)
  }

  return parsed
}

export const assertNonNegativeNumber = (value: unknown, label: string) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AiToolingValidationError(`${label} must be a non-negative number.`)
  }

  return parsed
}

export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

export const getCurrentDateString = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago'
  }).format(new Date())

export const getCurrentMonthDateRange = () => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 0))

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  }
}

export const getPeriodDateRange = (period: string) => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  if (period === 'last_month') {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 0))

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    }
  }

  if (period === 'last_3_months') {
    const start = new Date(Date.UTC(year, month - 2, 1))
    const end = new Date(Date.UTC(year, month + 1, 0))

    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10)
    }
  }

  if (period === 'ytd') {
    return {
      startDate: `${year}-01-01`,
      endDate: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
    }
  }

  return getCurrentMonthDateRange()
}

export const getViewerKind = (tenant: TenantContext) => {
  if (hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
    return 'admin' as const
  }

  if (hasRoleCode(tenant, ROLE_CODES.EFEONCE_OPERATIONS)) {
    return 'operator' as const
  }

  if (isClientTenant(tenant)) {
    return 'client' as const
  }

  throw new AiToolingValidationError('Forbidden', 403)
}

export const requireAiCreditsReadTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  try {
    getViewerKind(tenant)

    return {
      tenant,
      errorResponse: null
    }
  } catch {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
}

export const requireAiOperatorTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!hasRoleCode(tenant, ROLE_CODES.EFEONCE_OPERATIONS) && !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
    return {
      tenant: null,
      errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return {
    tenant,
    errorResponse: null
  }
}
