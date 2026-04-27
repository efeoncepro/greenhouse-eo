import 'server-only'

import { FinanceValidationError } from '@/lib/finance/shared'

/**
 * PostgreSQL error → FinanceValidationError translator.
 * =====================================================
 *
 * Catches PG integrity errors at the API boundary and maps them to the
 * already-handled `FinanceValidationError` envelope so callers respond with
 * structured 4xx instead of leaking 500s.
 *
 * Every recognized code resolves to:
 *   - statusCode (4xx) → the route returns it via the same JSON shape used
 *     for application-level validation errors
 *   - code → stable machine-readable token clients can branch on
 *   - details → minimal structured context (constraint, column) to aid the UI
 *
 * Anything not recognized returns null. The caller is expected to capture the
 * raw error via `captureWithDomain` and fall back to a generic 500 — never
 * leak the underlying message to the user.
 */

interface PgErrorLike {
  code: string
  detail?: string | null
  constraint?: string | null
  table?: string | null
  column?: string | null
  schema?: string | null
  message?: string
}

/** Friendly per-constraint overrides. Add when a default message isn't actionable. */
const PG_CONSTRAINT_FRIENDLY_MESSAGES: Record<string, string> = {
  accounts_provider_slug_fk:
    'El proveedor seleccionado no está registrado en el catálogo canónico de proveedores. Aplica la última migración del catálogo o selecciona otro proveedor.',
  payment_provider_catalog_type_known:
    'El tipo de proveedor enviado no es uno de los valores soportados.',
  bank_statement_rows_match_status_check:
    'El estado de conciliación enviado no es válido.'
}

export const isPostgresError = (err: unknown): err is PgErrorLike => {
  if (typeof err !== 'object' || err === null) return false

  const candidate = err as { code?: unknown }

  return typeof candidate.code === 'string' && /^[0-9A-Z]{5}$/.test(candidate.code as string)
}

const constraintMessage = (constraint: string | null | undefined, fallback: string): string => {
  if (constraint && PG_CONSTRAINT_FRIENDLY_MESSAGES[constraint]) {
    return PG_CONSTRAINT_FRIENDLY_MESSAGES[constraint]
  }

  return fallback
}

export const translatePostgresError = (err: unknown): FinanceValidationError | null => {
  if (!isPostgresError(err)) return null

  const constraint = err.constraint || null
  const column = err.column || null
  const table = err.table || null

  switch (err.code) {
    case '23503': // foreign_key_violation
      return new FinanceValidationError(
        constraintMessage(
          constraint,
          `Referencia inválida: la fila referenciada no existe (constraint: ${constraint || 'desconocida'}).`
        ),
        422,
        { constraint, table, column },
        'foreign_key_violation'
      )

    case '23505': // unique_violation
      return new FinanceValidationError(
        constraintMessage(
          constraint,
          `Conflicto de unicidad: ya existe un registro con esos valores (constraint: ${constraint || 'desconocida'}).`
        ),
        409,
        { constraint, table, column },
        'unique_violation'
      )

    case '23502': // not_null_violation
      return new FinanceValidationError(
        `Falta el valor requerido para "${column ?? 'campo desconocido'}".`,
        422,
        { constraint, table, column },
        'not_null_violation'
      )

    case '23514': // check_violation
      return new FinanceValidationError(
        constraintMessage(
          constraint,
          `El valor enviado no cumple la restricción "${constraint || 'check'}".`
        ),
        422,
        { constraint, table, column },
        'check_violation'
      )

    default:
      return null
  }
}

/**
 * Convenience: extract a stable subset of fields for telemetry. Never include
 * the raw message — it can echo user input.
 */
export const extractPostgresErrorTags = (err: unknown): Record<string, string> => {
  if (!isPostgresError(err)) return {}

  return {
    pg_code: err.code,
    ...(err.constraint ? { pg_constraint: err.constraint } : {}),
    ...(err.table ? { pg_table: err.table } : {}),
    ...(err.column ? { pg_column: err.column } : {})
  }
}
