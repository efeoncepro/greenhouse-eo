import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { GreenhouseGlobeConfigurationError } from '@/lib/globe/client'
import type { GlobeCreditFundingBrokerError } from '@/lib/globe/credit-administration-broker'

/**
 * Piezas compartidas por las rutas del carril de fondeo (TASK-1566 Slice 5).
 *
 * Viven acá para que `propose` y `confirm` traduzcan los mismos errores a los mismos códigos: dos
 * traducciones separadas derivan, y el síntoma sería que la misma condición se lee distinta según la
 * ruta que la produjo.
 */

/** Cada código del broker tiene su canónico. Un `default` silencioso volvería opaco justo lo que
 *  este carril existe para hacer legible, así que el mapa es exhaustivo por construcción. */
const BROKER_ERROR_CODES = {
  proposal_not_found: 'globe_funding_proposal_not_found',
  confirmer_is_proposer: 'globe_funding_confirmer_is_proposer',
  already_recorded: 'globe_funding_already_recorded',
  fingerprint_mismatch: 'globe_funding_invalid_request',
  actor_auth_mode_not_allowed: 'forbidden',
  agent_confirmation_forbidden: 'globe_funding_agent_confirmation_forbidden',
  agent_funding_limit_exceeded: 'globe_funding_agent_limit_exceeded',
  globe_unavailable: 'globe_unavailable',
  rejected_by_globe: 'globe_funding_rejected'
} as const satisfies Record<GlobeCreditFundingBrokerError['code'], string>

export const brokerErrorResponse = (error: GlobeCreditFundingBrokerError) =>
  canonicalErrorResponse(BROKER_ERROR_CODES[error.code])

/**
 * El enlace con Globe no está configurado en este runtime (falta `GLOBE_API_BASE_URL` o el par WIF).
 *
 * Va aparte del broker a propósito: es un fallo **estructural de rollout**, y hasta acá caía en el
 * `catch` genérico como `internal_error` con `actionable: true` — o sea, "reintenta en unos minutos"
 * para algo que ningún reintento resuelve. Medido en staging el 2026-07-26: las rutas devolvían 500
 * opaco mientras `/api/internal/globe/health` ya decía `globe_not_configured` con `retryable: false`.
 * Dos lecturas distintas de la MISMA condición es justamente lo que este carril existe para eliminar.
 *
 * La línea de servidor va acá y no queda a criterio del caller (ISSUE-127): sin ella, el operador ve
 * un código honesto pero nadie puede decir QUÉ variable falta.
 */
export const globeConfigurationErrorResponse = (error: GreenhouseGlobeConfigurationError, operation: string) => {
  // `error.code` es un enum cerrado de configuración: no lleva secreto, host ni payload.
  console.error(
    JSON.stringify({
      event: 'greenhouse.globe_credit_funding.not_configured',
      operation,
      configurationCode: error.code
    })
  )

  return canonicalErrorResponse('globe_not_configured')
}

/** La idempotencia es obligatoria: un command que mueve dinero no puede depender de que el caller
 *  se acuerde de mandarla. */
export const requireIdempotencyKey = (request: Request): string | undefined => {
  const value = request.headers.get('x-idempotency-key')?.trim()

  return value && value.length >= 8 ? value : undefined
}

export const resolveFundingActorAuthMode = ({
  provider,
  authMode
}: {
  provider?: string | null
  authMode?: string | null
}) => {
  const normalizedProvider = provider?.trim().toLowerCase() || ''
  const normalizedAuthMode = authMode?.trim().toLowerCase() || ''

  return normalizedProvider === 'agent' || normalizedAuthMode === 'agent' ? 'agent' : normalizedAuthMode || 'unknown'
}

export type ParsedFundingBody = Readonly<{
  globeWorkspaceId: string
  poolId: string
  grantCredits: number
  monthlyCap?: number
  periodStart: string
  periodEnd: string
}>

export const parseFundingBody = (raw: unknown): ParsedFundingBody | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const value = raw as Record<string, unknown>
  const globeWorkspaceId = text(value.globeWorkspaceId)
  const poolId = text(value.poolId)
  const periodStart = text(value.periodStart)
  const periodEnd = text(value.periodEnd)
  const grantCredits = value.grantCredits

  if (!globeWorkspaceId || !poolId || !periodStart || !periodEnd) return undefined
  if (!Number.isSafeInteger(grantCredits) || (grantCredits as number) <= 0) return undefined
  if (Date.parse(periodStart) >= Date.parse(periodEnd)) return undefined

  const monthlyCap = value.monthlyCap

  if (monthlyCap !== undefined && (!Number.isSafeInteger(monthlyCap) || (monthlyCap as number) <= 0)) {
    return undefined
  }

  return {
    globeWorkspaceId,
    poolId,
    grantCredits: grantCredits as number,
    ...(monthlyCap === undefined ? {} : { monthlyCap: monthlyCap as number }),
    periodStart,
    periodEnd
  }
}

export type ParsedConfirmBody = Readonly<{
  globeWorkspaceId: string
  proposalId: string
  fingerprint: string
}>

export const parseConfirmBody = (raw: unknown): ParsedConfirmBody | undefined => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined

  const value = raw as Record<string, unknown>
  const globeWorkspaceId = text(value.globeWorkspaceId)
  const proposalId = text(value.proposalId)
  const fingerprint = text(value.fingerprint)

  if (!globeWorkspaceId || !proposalId || !fingerprint) return undefined

  return { globeWorkspaceId, proposalId, fingerprint }
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
