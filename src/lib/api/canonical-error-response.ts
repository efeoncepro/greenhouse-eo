import 'server-only'

import { NextResponse } from 'next/server'

/**
 * Canonical API error response contract (Greenhouse, 2026-05-14).
 *
 * **Por qué existe**: pre-2026-05-14 los helpers de tenant y los endpoints de
 * `/api/my/*` retornaban `{ error: 'Member identity not linked' }` con prose
 * en inglés directo al UI consumer. Los consumers (MyPaymentProfileView, etc.)
 * implementaron el anti-patrón `throw new Error(payload?.error || 'fallback es-CL')`
 * confiando el `error` crudo del API sobre el fallback local — causando que
 * un string inglés aterrizara en una UI cuyo contrato microcopy es es-CL
 * (TASK-265 + greenhouse-ux-writing skill).
 *
 * **Shape canónico**:
 *
 * ```json
 * {
 *   "error": "Tu identidad de colaborador aún no está enlazada. Pídele a People Ops que active tu acceso.",
 *   "code": "member_identity_not_linked",
 *   "actionable": false
 * }
 * ```
 *
 * - `error`: prose es-CL canónico. Backward compat con consumers legacy que
 *   leen `payload.error` directo — ahora ven texto humano correcto.
 * - `code`: stable machine identifier (snake_case). Consumers nuevos usan
 *   `code` para decidir CTAs específicos (e.g. "Contactar HR" vs "Reintentar").
 * - `actionable`: hint binario. `true` cuando reintentar puede resolver
 *   (timeout, network blip); `false` cuando la causa es estructural (identity
 *   no enlazada, permiso revocado, configuración faltante). El UI usa este
 *   flag para hide / show del botón "Reintentar".
 *
 * **Reglas duras**:
 * - NUNCA retornar prose inglesa en `error`. Toda string en `error` debe ser
 *   es-CL canónico, idealmente extraído de `src/lib/copy/*` (TASK-265).
 * - NUNCA poner detalle técnico (stack trace, SQL error, internal IDs) en
 *   `error`. Eso va a `captureWithDomain` en Sentry, NO al cliente.
 * - SIEMPRE proveer `code` stable cuando emerge un nuevo error path —
 *   permite a consumers mapear a UX específica sin string matching.
 * - SIEMPRE setear `actionable: false` cuando el error requiere acción humana
 *   externa (HR, admin, soporte). Ocultar "Reintentar" es UX honesta.
 */

export type CanonicalErrorCode =
  // Tenant / auth (Identity UX hardening 2026-05-14)
  | 'unauthorized'
  | 'forbidden'
  | 'member_identity_not_linked'
  | 'client_tenant_required'
  // Reserved for future canonical codes — extender aquí cuando emerjan
  // nuevos error paths estructurales. NUNCA usar strings ad-hoc.

export interface CanonicalErrorBody {
  /** es-CL canónico, safe para mostrar al usuario directo. */
  error: string
  /** Stable machine identifier para UI mapping. */
  code: CanonicalErrorCode
  /** Hint: si reintentar puede resolver, true. Estructural humana → false. */
  actionable: boolean
}

interface CanonicalErrorDefinition {
  status: number
  message: string
  actionable: boolean
}

const CANONICAL_ERRORS: Record<CanonicalErrorCode, CanonicalErrorDefinition> = {
  unauthorized: {
    status: 401,
    message: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
    actionable: true
  },
  forbidden: {
    status: 403,
    message: 'No tienes permisos para acceder a este recurso.',
    actionable: false
  },
  member_identity_not_linked: {
    status: 422,
    // Mensaje accionable explicando QUÉ falta y QUÉ hacer.
    // Reintentar no resuelve — el operador debe gestionar con HR.
    message: 'Tu cuenta aún no está enlazada a un colaborador. Pídele a People Ops que active tu identidad para acceder a las vistas personales.',
    actionable: false
  },
  client_tenant_required: {
    status: 403,
    message: 'Este recurso solo está disponible para usuarios de cliente.',
    actionable: false
  }
}

/**
 * Build canonical error NextResponse. Single source of truth para todos los
 * errores API que cruzan al cliente. Replaces ad-hoc
 * `NextResponse.json({ error: 'English prose' }, { status: 422 })`.
 *
 * @param code stable canonical error code
 * @param overrides opcional: extiende `extra` con metadata adicional safe
 *   para el cliente (e.g. requiredCapability, link a runbook). NUNCA pasar
 *   info sensitive (PII, internal IDs, stack traces) — esos van a Sentry.
 */
export const canonicalErrorResponse = (
  code: CanonicalErrorCode,
  overrides?: { extra?: Record<string, unknown>; statusOverride?: number }
): NextResponse<CanonicalErrorBody & Record<string, unknown>> => {
  const definition = CANONICAL_ERRORS[code]
  const status = overrides?.statusOverride ?? definition.status

  const body: CanonicalErrorBody & Record<string, unknown> = {
    error: definition.message,
    code,
    actionable: definition.actionable,
    ...(overrides?.extra ?? {})
  }

  return NextResponse.json(body, { status })
}

/**
 * Type guard para parsear canonical error responses desde el cliente.
 * Consumers nuevos lo usan para decidir UI flow basado en `code`.
 */
export const isCanonicalErrorBody = (value: unknown): value is CanonicalErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CanonicalErrorBody).error === 'string' &&
  typeof (value as CanonicalErrorBody).code === 'string' &&
  typeof (value as CanonicalErrorBody).actionable === 'boolean'
