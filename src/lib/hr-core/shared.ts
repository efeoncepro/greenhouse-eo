import 'server-only'

import { NextResponse } from 'next/server'

import type { Query } from '@google-cloud/bigquery'

import type { ContractType } from '@/types/hr-contracts'

import { ROLE_CODES } from '@/config/role-codes'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { hasRoleCode, requireTenantContext } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export class HrCoreValidationError extends Error {
  statusCode: number
  details?: unknown
  code?: string

  constructor(message: string, statusCode = 400, details?: unknown, code?: string) {
    super(message)
    this.name = 'HrCoreValidationError'
    this.statusCode = statusCode
    this.details = details
    this.code = code
  }
}

export const toHrCoreErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof HrCoreValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code ?? null,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

export const HR_JOB_LEVELS = ['junior', 'semi_senior', 'senior', 'lead', 'manager', 'director'] as const
export const HR_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor'] as const
export const HR_HEALTH_SYSTEMS = ['fonasa', 'isapre', 'none'] as const
export const HR_BANK_ACCOUNT_TYPES = ['corriente', 'vista', 'ahorro', 'rut'] as const
export const HR_LEAVE_REQUEST_STATUSES = ['pending_supervisor', 'pending_hr', 'approved', 'rejected', 'cancelled'] as const
export const HR_APPROVAL_ACTIONS = ['approve', 'reject', 'cancel'] as const
export const HR_ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'excused', 'holiday'] as const
export const HR_CONTRACT_TYPES: readonly ContractType[] = ['indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor']

export const getHrCoreProjectId = () => getBigQueryProjectId()

export const runHrCoreQuery = async <T>(
  query: string,
  params: Record<string, unknown> = {},
  types?: Query['types']
) => {
  const queryOptions: Query = {
    query,
    params,
    ...(types ? { types } : {})
  }

  const [rows] = await getBigQueryClient().query(queryOptions)

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

export const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map(item => normalizeString(item))
        .filter(Boolean)
    : []

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
    throw new HrCoreValidationError(`${label} is invalid.`)
  }

  return normalized as T[number]
}

export const assertDateString = (value: unknown, label: string) => {
  const normalized = normalizeString(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new HrCoreValidationError(`${label} must use YYYY-MM-DD format.`)
  }

  return normalized
}

export const assertPositiveInteger = (value: unknown, label: string, { min = 1 }: { min?: number } = {}) => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < min) {
    throw new HrCoreValidationError(`${label} must be an integer greater than or equal to ${min}.`)
  }

  return parsed
}

export const assertNonNegativeNumber = (value: unknown, label: string) => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new HrCoreValidationError(`${label} must be a non-negative number.`)
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

export const maskSensitiveValue = (value: string | null, visibleDigits = 4) => {
  if (!value) {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.length <= visibleDigits) {
    return '*'.repeat(trimmed.length)
  }

  return `${'*'.repeat(Math.max(4, trimmed.length - visibleDigits))}${trimmed.slice(-visibleDigits)}`
}

export const isHrAdminTenant = (tenant: TenantContext) => tenant.routeGroups.includes('hr') || hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)

export const requireHrCoreReadTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!tenant.routeGroups.includes('employee') && !tenant.routeGroups.includes('hr') && !hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
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

export const requireHrCoreManageTenantContext = async () => {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return {
      tenant: null,
      errorResponse: unauthorizedResponse
    }
  }

  if (!isHrAdminTenant(tenant)) {
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

export const assertWebhookSecret = (request: Request) => {
  const expectedSecret = normalizeString(process.env.HR_CORE_TEAMS_WEBHOOK_SECRET)

  if (!expectedSecret) {
    throw new HrCoreValidationError('HR Core webhook secret is not configured.', 503)
  }

  const headerValue = request.headers.get('authorization') || request.headers.get('x-hr-core-webhook-secret') || ''
  const bearerToken = headerValue.startsWith('Bearer ') ? headerValue.slice('Bearer '.length).trim() : headerValue.trim()

  if (!bearerToken || bearerToken !== expectedSecret) {
    throw new HrCoreValidationError('Forbidden', 403)
  }
}
