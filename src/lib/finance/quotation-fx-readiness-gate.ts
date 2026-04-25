import type { FxReadiness } from './currency-domain'
import { CLIENT_FACING_STALENESS_THRESHOLD_DAYS } from './currency-domain'

// Note: This module is intentionally pure (no DB/network access) so it can be
// imported from both server code (command handlers, API routes) and client
// components (QuoteSendDialog readiness preview).

// ────────────────────────────────────────────────────────────────────────────
// TASK-466 — Policy gate for client-facing FX readiness.
//
// The FX readiness resolver classifies a pair against the domain threshold
// (pricing_output default = 7d). For client-facing artifacts (quote PDF,
// email, issue/send dialog) we apply a stricter threshold
// (`CLIENT_FACING_STALENESS_THRESHOLD_DAYS` = 3d). This module centralizes
// that policy so command handlers (`requestQuotationIssue`), route handlers
// (issue/send) and the send dialog all agree on when to block vs warn.
//
// Semantics:
//   - `allowed: false` → the caller MUST refuse the action (HTTP 422 at
//     the API boundary).
//   - `allowed: true` + `severity: 'warning' | 'info'` → the caller can
//     proceed but should surface the message to the user.
// ────────────────────────────────────────────────────────────────────────────

export type FxReadinessGateSeverity = 'info' | 'warning' | 'critical'

export type FxReadinessGateReasonCode =
  | 'unsupported_pair'
  | 'no_rate_available'
  | 'rate_exceeds_client_facing_threshold'
  | 'rate_is_stale_for_domain'
  | 'rate_composed_via_usd'
  | 'rate_fresh'

export interface FxReadinessGateDecision {
  allowed: boolean
  severity: FxReadinessGateSeverity
  code: FxReadinessGateReasonCode
  message: string
  blocking: boolean
}

export interface EvaluateQuotationFxReadinessGateInput {
  readiness: FxReadiness

  /**
   * When true (the default), `rate_exceeds_client_facing_threshold` blocks.
   * Callers that only want to show the warning (e.g. the quote builder
   * preview) can pass `false` — the dialog and the command handler both keep
   * the default strict behavior so the user decision is surfaced before the
   * write.
   */
  blockOnClientFacingStale?: boolean
}

const formatAge = (ageDays: number | null): string => {
  if (ageDays === null) return 'sin fecha'
  if (ageDays === 0) return 'hoy'
  if (ageDays === 1) return 'hace 1 día'
  
return `hace ${ageDays} días`
}

/**
 * Evaluates a resolved readiness under the client-facing policy. Same-currency
 * pairs (readiness.rate = 1) always pass with severity='info'.
 */
export const evaluateQuotationFxReadinessGate = ({
  readiness,
  blockOnClientFacingStale = true
}: EvaluateQuotationFxReadinessGateInput): FxReadinessGateDecision => {
  const clientFacingThreshold = CLIENT_FACING_STALENESS_THRESHOLD_DAYS
  const sameCurrency = readiness.fromCurrency.toUpperCase() === readiness.toCurrency.toUpperCase()

  if (sameCurrency) {
    return {
      allowed: true,
      severity: 'info',
      code: 'rate_fresh',
      blocking: false,
      message: `Cotización en ${readiness.toCurrency.toUpperCase()}. No requiere conversión.`
    }
  }

  if (readiness.state === 'unsupported') {
    return {
      allowed: false,
      severity: 'critical',
      code: 'unsupported_pair',
      blocking: true,
      message:
        readiness.message ||
        `El par ${readiness.fromCurrency}→${readiness.toCurrency} no está habilitado para cotizaciones.`
    }
  }

  if (readiness.state === 'temporarily_unavailable') {
    return {
      allowed: false,
      severity: 'critical',
      code: 'no_rate_available',
      blocking: true,
      message:
        readiness.message ||
        `No hay tasa disponible para ${readiness.fromCurrency}→${readiness.toCurrency}. Sube una tasa manual antes de emitir.`
    }
  }

  // readiness.state === 'supported' | 'supported_but_stale'
  const age = readiness.ageDays

  if (readiness.state === 'supported_but_stale') {
    return {
      allowed: !blockOnClientFacingStale,
      severity: 'critical',
      code: 'rate_is_stale_for_domain',
      blocking: blockOnClientFacingStale,
      message: `La tasa ${readiness.fromCurrency}→${readiness.toCurrency} es de ${formatAge(age)} (umbral dominio ${readiness.stalenessThresholdDays} días). Actualízala antes de enviar al cliente.`
    }
  }

  if (age !== null && age > clientFacingThreshold) {
    return {
      allowed: !blockOnClientFacingStale,
      severity: 'warning',
      code: 'rate_exceeds_client_facing_threshold',
      blocking: blockOnClientFacingStale,
      message: `La tasa ${readiness.fromCurrency}→${readiness.toCurrency} es de ${formatAge(age)}. Para cotizaciones client-facing recomendamos tasas de menos de ${clientFacingThreshold} días.`
    }
  }

  if (readiness.composedViaUsd) {
    return {
      allowed: true,
      severity: 'info',
      code: 'rate_composed_via_usd',
      blocking: false,
      message: `Tasa derivada por composición vía USD (${formatAge(age)}).`
    }
  }

  return {
    allowed: true,
    severity: 'info',
    code: 'rate_fresh',
    blocking: false,
    message: `Tasa ${readiness.fromCurrency}→${readiness.toCurrency} fresca (${formatAge(age)}).`
  }
}

export class QuotationFxReadinessError extends Error {
  statusCode: number
  code: FxReadinessGateReasonCode
  severity: FxReadinessGateSeverity
  readiness: FxReadiness
  decision: FxReadinessGateDecision

  constructor(
    readiness: FxReadiness,
    decision: FxReadinessGateDecision,
    statusCode = 422
  ) {
    super(decision.message)
    this.name = 'QuotationFxReadinessError'
    this.statusCode = statusCode
    this.code = decision.code
    this.severity = decision.severity
    this.readiness = readiness
    this.decision = decision
  }
}
