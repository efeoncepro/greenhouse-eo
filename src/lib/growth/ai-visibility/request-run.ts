import 'server-only'

/** TASK-1863. Existing tenant-resolved single-run doors delegate to atomic batches of one. */
import type { AeoTier } from './entitlement'
import { GraderMarketConfigError } from './markets/contracts'
import { requestRunBatchInternal } from './markets/run-batch'

export type RequestRunBlockedReason =
  | 'disabled'
  | 'not_entitled'
  | 'profile_required'
  | 'category_unresolved'
  | 'business_model_unconfirmed'
  | 'quota_exhausted'
  | 'cost_blocked'
  /**
   * TASK-1696 — Presupuesto en DÓLARES de la organización agotado. Distinto de `cost_blocked`,
   * que es el backstop GLOBAL del tier trial: éste es per-org y no se alcanza hasta que el flag
   * de enforce esté prendido (el gate nace en shadow).
   */
  | 'budget_exhausted'

export type RequestRunResult =
  | {
      status: 'accepted'
      runId: string
      runPublicId: string
      pollToken: string
      idempotentHit: boolean
      tier: AeoTier | 'operator'
      allowanceRemaining: number | null
    }
  | { status: 'blocked'; reason: RequestRunBlockedReason }

const blockedReasons: RequestRunBlockedReason[] = [
  'disabled',
  'not_entitled',
  'profile_required',
  'category_unresolved',
  'business_model_unconfirmed',
  'quota_exhausted',
  'cost_blocked',
  'budget_exhausted'
]

const requestSingle = async (input: {
  organizationId: string
  requestedBy: string
  marketId?: string
  idempotencyKey?: string | null
  env?: NodeJS.ProcessEnv
  channel: 'operator' | 'portal'
}): Promise<RequestRunResult> => {
  try {
    const batch = await requestRunBatchInternal({
      organizationId: input.organizationId,
      actor: input.requestedBy,
      markets: input.marketId ? [input.marketId] : 'primary',
      mode: 'light',
      channel: input.channel,
      idempotencyKey: input.idempotencyKey ?? `single:${crypto.randomUUID()}`,
      env: input.env
    })

    const run = batch.runs[0]

    return {
      status: 'accepted',
      runId: run.runId,
      runPublicId: run.publicId,
      pollToken: run.pollToken,
      idempotentHit: batch.idempotentHit,
      tier: batch.tier,
      allowanceRemaining: batch.allowanceRemaining
    }
  } catch (error) {
    if (error instanceof GraderMarketConfigError && blockedReasons.includes(error.code as RequestRunBlockedReason)) {
      return { status: 'blocked', reason: error.code as RequestRunBlockedReason }
    }

    throw error
  }
}

/** organizationId is resolved by the authenticated portal route, never copied from request JSON. */
export const requestGraderRunForOrganization = (input: {
  organizationId: string
  requestedBy: string
  marketId?: string
  idempotencyKey?: string | null
  env?: NodeJS.ProcessEnv
}): Promise<RequestRunResult> => requestSingle({ ...input, channel: 'portal' })

/** Operator capability is required by the existing route; arbitrary subject organizations are supported. */
export const requestGraderRunAsOperator = (input: {
  subjectOrganizationId: string
  requestedBy: string
  marketId?: string
  idempotencyKey?: string | null
  env?: NodeJS.ProcessEnv
}): Promise<RequestRunResult> =>
  requestSingle({ ...input, organizationId: input.subjectOrganizationId, channel: 'operator' })
