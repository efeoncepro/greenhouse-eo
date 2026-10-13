import 'server-only'

import { enableClientPortalModule } from '@/lib/client-portal/commands/enable-module'
import { expireClientPortalModule } from '@/lib/client-portal/commands/expire-churn'
import { GrowthMarketError, resolveGrowthMarket } from '@/lib/growth/markets'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { AI_VISIBILITY_MODULE_KEY, type AeoTier } from './entitlement'
import { AEO_MARKETS_INCLUDED_KEY, parseIncludedMarkets } from './markets/contract-coverage'
import {
  provisionGraderProfileForOrganization,
  type ProvisionGraderProfileResult
} from './provision-profile'

import type { ResolvedAssignmentStatus } from '@/lib/client-portal/dto/module'

export type AssignableAeoTier = AeoTier | 'none'

export type AssignAeoTierErrorCode =
  | 'invalid_tier'
  | 'reason_required'
  | 'pilot_expires_at_required'
  | 'markets_require_contracted'
  | 'markets_invalid'

export class AssignAeoTierValidationError extends Error {
  readonly code: AssignAeoTierErrorCode
  readonly statusCode: number
  readonly details?: Record<string, unknown>

  constructor(
    code: AssignAeoTierErrorCode,
    message: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AssignAeoTierValidationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

interface ActiveAssignmentRow extends Record<string, unknown> {
  assignment_id: string
  status: string
  expires_at: string | Date | null
  metadata_json: Record<string, unknown> | null
}

export interface AssignAeoTierInput {
  readonly organizationId: string
  readonly tier: AssignableAeoTier
  readonly reason: string
  readonly requestedBy: string
  readonly expiresAt?: string | null
  /**
   * Países (ISO alpha-2) que el contrato incluye ADEMÁS del principal. Sólo tier `contracted`.
   * `undefined` = no se toca lo declarado (se conserva al re-asignar el mismo tier);
   * `[]` = se declara explícitamente que no hay mercados extra.
   */
  readonly marketsIncluded?: readonly string[] | null
}

export interface AssignAeoTierResult {
  readonly organizationId: string
  readonly tier: AssignableAeoTier
  readonly assignmentId: string | null
  readonly status: ResolvedAssignmentStatus | 'expired' | 'churned' | null
  readonly idempotent: boolean
  readonly supersededAssignmentId: string | null
  readonly profile: ProvisionGraderProfileResult | null
  /** Lo que quedó declarado en el assignment vigente. `null` = nunca se declaró. */
  readonly marketsIncluded: readonly string[] | null
}

const VALID_ASSIGNABLE_TIERS: ReadonlySet<string> = new Set<AssignableAeoTier>([
  'contracted',
  'trial',
  'pilot',
  'none'
])

const normalizeTier = (tier: unknown): AssignableAeoTier => {
  if (typeof tier !== 'string' || !VALID_ASSIGNABLE_TIERS.has(tier)) {
    throw new AssignAeoTierValidationError(
      'invalid_tier',
      'tier must be one of contracted, trial, pilot, none',
      400,
      { field: 'tier', allowedValues: [...VALID_ASSIGNABLE_TIERS] }
    )
  }

  return tier as AssignableAeoTier
}

const assertReason = (reason: unknown): string => {
  if (typeof reason !== 'string' || reason.trim().length < 10) {
    throw new AssignAeoTierValidationError(
      'reason_required',
      'reason must be a string with at least 10 characters',
      400,
      { field: 'reason', minLength: 10 }
    )
  }

  return reason.trim()
}

const MAX_MARKETS_INCLUDED = 23

/**
 * Normaliza contra el catálogo de mercados del producto: un país que el catálogo no conoce no
 * se guarda "por si acaso" — quedaría declarado en el contrato y sería inmedible.
 */
const normalizeMarketsIncluded = (tier: AssignableAeoTier, markets: unknown): string[] | undefined => {
  if (markets === undefined || markets === null) return undefined

  if (tier !== 'contracted') {
    throw new AssignAeoTierValidationError(
      'markets_require_contracted',
      'marketsIncluded only applies to the contracted tier',
      400,
      { field: 'marketsIncluded', tier }
    )
  }

  if (!Array.isArray(markets) || markets.length > MAX_MARKETS_INCLUDED) {
    throw new AssignAeoTierValidationError('markets_invalid', 'marketsIncluded must be an array of country codes', 400, {
      field: 'marketsIncluded',
      maxItems: MAX_MARKETS_INCLUDED
    })
  }

  const codes = new Set<string>()

  for (const value of markets) {
    try {
      if (typeof value !== 'string') throw new GrowthMarketError('aeo_market_unknown')
      codes.add(resolveGrowthMarket(value).code)
    } catch (error) {
      if (!(error instanceof GrowthMarketError)) throw error

      throw new AssignAeoTierValidationError('markets_invalid', 'marketsIncluded has a country outside the catalog', 400, {
        field: 'marketsIncluded',
        value
      })
    }
  }

  return [...codes].sort()
}

const sameMarkets = (a: readonly string[] | null, b: readonly string[] | null): boolean =>
  JSON.stringify(a ? [...a].sort() : null) === JSON.stringify(b ? [...b].sort() : null)

const readOpenAeoAssignment = async (
  organizationId: string
): Promise<ActiveAssignmentRow | null> => {
  const rows = await runGreenhousePostgresQuery<ActiveAssignmentRow>(
    `SELECT assignment_id, status, expires_at, metadata_json
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1
        AND module_key = $2
        AND effective_to IS NULL
      ORDER BY created_at DESC
      LIMIT 1`,
    [organizationId, AI_VISIBILITY_MODULE_KEY]
  )

  return rows[0] ?? null
}

const resolveAssignmentTier = (
  assignment: ActiveAssignmentRow | null
): AssignableAeoTier | null => {
  if (!assignment) {
    return null
  }

  const declared = assignment.metadata_json?.aeo_tier

  if (typeof declared === 'string' && VALID_ASSIGNABLE_TIERS.has(declared) && declared !== 'none') {
    return declared as AeoTier
  }

  return assignment.status === 'pilot' ? 'pilot' : 'trial'
}

const targetStatusForTier = (tier: AeoTier): ResolvedAssignmentStatus =>
  tier === 'pilot' ? 'pilot' : 'active'

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10)

export const assignAeoTier = async (input: AssignAeoTierInput): Promise<AssignAeoTierResult> => {
  const tier = normalizeTier(input.tier)
  const reason = assertReason(input.reason)
  const declaredMarkets = normalizeMarketsIncluded(tier, input.marketsIncluded)
  const existing = await readOpenAeoAssignment(input.organizationId)
  const existingTier = resolveAssignmentTier(existing)
  const existingMarkets = parseIncludedMarkets(existing?.metadata_json)

  // Sin declaración explícita, re-asignar el MISMO tier conserva lo que ya estaba declarado;
  // cambiar de tier parte sin mercados extra (otro contrato, otra declaración).
  const targetMarkets = declaredMarkets ?? (existingTier === tier ? existingMarkets : null)

  if (tier === 'pilot' && !input.expiresAt) {
    throw new AssignAeoTierValidationError(
      'pilot_expires_at_required',
      'expiresAt is required when tier is pilot',
      400,
      { field: 'expiresAt' }
    )
  }

  if (tier === 'none') {
    if (!existing) {
      return {
        organizationId: input.organizationId,
        tier,
        assignmentId: null,
        status: null,
        idempotent: true,
        supersededAssignmentId: null,
        profile: null,
        marketsIncluded: null
      }
    }

    const expired = await expireClientPortalModule({
      assignmentId: existing.assignment_id,
      actorUserId: input.requestedBy,
      reason,
      effectiveTo: todayIsoDate()
    })

    return {
      organizationId: input.organizationId,
      tier,
      assignmentId: existing.assignment_id,
      status: expired.toStatus,
      idempotent: expired.idempotent,
      supersededAssignmentId: existing.assignment_id,
      profile: null,
      marketsIncluded: null
    }
  }

  const profile = await provisionGraderProfileForOrganization(input.organizationId)
  const targetStatus = targetStatusForTier(tier)

  if (
    existing &&
    existingTier === tier &&
    existing.status === targetStatus &&
    sameMarkets(existingMarkets, targetMarkets)
  ) {
    return {
      organizationId: input.organizationId,
      tier,
      assignmentId: existing.assignment_id,
      status: targetStatus,
      idempotent: true,
      supersededAssignmentId: null,
      profile,
      marketsIncluded: existingMarkets
    }
  }

  let supersededAssignmentId: string | null = null

  if (existing) {
    const expired = await expireClientPortalModule({
      assignmentId: existing.assignment_id,
      actorUserId: input.requestedBy,
      reason:
        existingTier === tier
          ? `${reason} (supersede AEO ${tier}: mercados incluidos)`
          : `${reason} (supersede AEO tier ${existingTier ?? 'unknown'} -> ${tier})`,
      effectiveTo: todayIsoDate()
    })

    supersededAssignmentId = expired.assignmentId
  }

  const enabled = await enableClientPortalModule({
    organizationId: input.organizationId,
    moduleKey: AI_VISIBILITY_MODULE_KEY,
    status: targetStatus,
    source: 'manual_admin',
    sourceRefJson: {
      command: 'assignAeoTier',
      tier,
      supersededAssignmentId,
      ...(targetMarkets ? { marketsIncluded: targetMarkets } : {})
    },
    // Cambiar SÓLO los mercados no es otro contrato: el resto de la metadata del assignment que
    // se supersede viaja a la fila nueva. En un cambio de tier se parte de cero, como siempre.
    metadataJson: {
      ...(existingTier === tier ? (existing?.metadata_json ?? {}) : {}),
      aeo_tier: tier,
      ...(targetMarkets ? { [AEO_MARKETS_INCLUDED_KEY]: targetMarkets } : {})
    },
    effectiveFrom: todayIsoDate(),
    expiresAt: tier === 'pilot' ? input.expiresAt ?? undefined : undefined,
    approvedByUserId: input.requestedBy,
    reason
  })

  return {
    organizationId: input.organizationId,
    tier,
    assignmentId: enabled.assignmentId,
    status: enabled.status,
    idempotent: enabled.idempotent,
    supersededAssignmentId,
    profile,
    marketsIncluded: targetMarkets
  }
}
