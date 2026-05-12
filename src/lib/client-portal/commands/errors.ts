/**
 * TASK-826 Slice 1 — Client Portal commands errors + assertion functions.
 *
 * Pattern source: `src/lib/finance/shared.ts:47-181` (FinanceValidationError).
 *
 * **NO Zod** (CLAUDE.md / greenhouse-backend skill canónico: "Never use Zod —
 * use custom assertion functions"). Cada error declara su statusCode para
 * que el endpoint handler lo devuelva directo en `NextResponse.json({...}, {status})`.
 *
 * Spec V1.4 §7 documenta los inputs canónicos; estos asserts validan el shape
 * antes de la tx PG.
 */

import type { AssignmentSource, ResolvedAssignmentStatus } from '../dto/module'

const VALID_ASSIGNMENT_STATUSES: ReadonlyArray<ResolvedAssignmentStatus> = ['active', 'pilot', 'pending']

const VALID_ASSIGNMENT_SOURCES: ReadonlyArray<AssignmentSource> = [
  'lifecycle_case_provision',
  'commercial_terms_cascade',
  'manual_admin',
  'self_service_request',
  'migration_backfill',
  'default_business_line'
]

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

// ─────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────

export class ClientPortalValidationError extends Error {
  readonly statusCode: number
  readonly details?: Record<string, unknown>

  constructor(message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ClientPortalValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Raised when a module's `applicability_scope` does NOT match any of the
 * organization's canonical business_lines (resolved via
 * `service_modules.module_code WHERE module_kind='business_line'`).
 *
 * Override path:
 *   - `overrideBusinessLineMismatch=true`
 *   - `overrideReason.length >= 20`
 *   - capability `client_portal.module.override_business_line_default` (EFEONCE_ADMIN only)
 *
 * If the org has NO business_lines resolved (empty array — common in runtime
 * today per Discovery 2026-05-12: 0 orgs have BL via canonical bridge), the
 * check is **skipped** (data quality issue surface, not a runtime blocker).
 */
export class BusinessLineMismatchError extends ClientPortalValidationError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 403, details)
    this.name = 'BusinessLineMismatchError'
  }
}

// ─────────────────────────────────────────────────────────────
// Assertion functions (custom — NO Zod)
// ─────────────────────────────────────────────────────────────

export const assertNonEmptyString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw new ClientPortalValidationError(`${fieldName} must be a string`, 400, { field: fieldName })
  }

  const trimmed = value.trim()

  if (trimmed.length === 0) {
    throw new ClientPortalValidationError(`${fieldName} is required`, 400, { field: fieldName })
  }

  return trimmed
}

export const assertReason20Plus = (value: unknown, fieldName: string): string => {
  const str = assertNonEmptyString(value, fieldName)

  if (str.length < 20) {
    throw new ClientPortalValidationError(
      `${fieldName} must be at least 20 characters (was ${str.length})`,
      400,
      { field: fieldName, actualLength: str.length, minLength: 20 }
    )
  }

  return str
}

export const assertValidAssignmentStatus = (value: unknown): ResolvedAssignmentStatus => {
  if (typeof value !== 'string' || !VALID_ASSIGNMENT_STATUSES.includes(value as ResolvedAssignmentStatus)) {
    throw new ClientPortalValidationError(
      `status must be one of ${VALID_ASSIGNMENT_STATUSES.join(', ')}`,
      400,
      { field: 'status', allowedValues: [...VALID_ASSIGNMENT_STATUSES] }
    )
  }

  return value as ResolvedAssignmentStatus
}

export const assertValidAssignmentSource = (value: unknown): AssignmentSource => {
  if (typeof value !== 'string' || !VALID_ASSIGNMENT_SOURCES.includes(value as AssignmentSource)) {
    throw new ClientPortalValidationError(
      `source must be one of ${VALID_ASSIGNMENT_SOURCES.join(', ')}`,
      400,
      { field: 'source', allowedValues: [...VALID_ASSIGNMENT_SOURCES] }
    )
  }

  return value as AssignmentSource
}

export const assertIsoDate = (value: unknown, fieldName: string): string => {
  const str = assertNonEmptyString(value, fieldName)

  if (!ISO_DATE_RE.test(str)) {
    throw new ClientPortalValidationError(
      `${fieldName} must be ISO date format YYYY-MM-DD`,
      400,
      { field: fieldName }
    )
  }

  return str
}

export const assertIsoTimestamp = (value: unknown, fieldName: string): string => {
  const str = assertNonEmptyString(value, fieldName)

  if (!ISO_DATETIME_RE.test(str)) {
    throw new ClientPortalValidationError(
      `${fieldName} must be ISO timestamp (RFC 3339)`,
      400,
      { field: fieldName }
    )
  }

  return str
}
