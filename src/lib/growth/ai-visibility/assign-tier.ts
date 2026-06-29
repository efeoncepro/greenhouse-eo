import 'server-only'

import { enableClientPortalModule } from '@/lib/client-portal/commands/enable-module'
import { expireClientPortalModule } from '@/lib/client-portal/commands/expire-churn'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { AI_VISIBILITY_MODULE_KEY, type AeoTier } from './entitlement'
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
}

export interface AssignAeoTierResult {
  readonly organizationId: string
  readonly tier: AssignableAeoTier
  readonly assignmentId: string | null
  readonly status: ResolvedAssignmentStatus | 'expired' | 'churned' | null
  readonly idempotent: boolean
  readonly supersededAssignmentId: string | null
  readonly profile: ProvisionGraderProfileResult | null
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
  const existing = await readOpenAeoAssignment(input.organizationId)
  const existingTier = resolveAssignmentTier(existing)

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
        profile: null
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
      profile: null
    }
  }

  const profile = await provisionGraderProfileForOrganization(input.organizationId)
  const targetStatus = targetStatusForTier(tier)

  if (existing && existingTier === tier && existing.status === targetStatus) {
    return {
      organizationId: input.organizationId,
      tier,
      assignmentId: existing.assignment_id,
      status: targetStatus,
      idempotent: true,
      supersededAssignmentId: null,
      profile
    }
  }

  let supersededAssignmentId: string | null = null

  if (existing) {
    const expired = await expireClientPortalModule({
      assignmentId: existing.assignment_id,
      actorUserId: input.requestedBy,
      reason: `${reason} (supersede AEO tier ${existingTier ?? 'unknown'} -> ${tier})`,
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
      supersededAssignmentId
    },
    metadataJson: {
      aeo_tier: tier
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
    profile
  }
}
