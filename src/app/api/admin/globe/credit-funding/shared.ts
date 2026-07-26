import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
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
  globe_unavailable: 'globe_unavailable'
} as const satisfies Record<GlobeCreditFundingBrokerError['code'], string>

export const brokerErrorResponse = (error: GlobeCreditFundingBrokerError) =>
  canonicalErrorResponse(BROKER_ERROR_CODES[error.code])

/** La idempotencia es obligatoria: un command que mueve dinero no puede depender de que el caller
 *  se acuerde de mandarla. */
export const requireIdempotencyKey = (request: Request): string | undefined => {
  const value = request.headers.get('x-idempotency-key')?.trim()

  return value && value.length >= 8 ? value : undefined
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
