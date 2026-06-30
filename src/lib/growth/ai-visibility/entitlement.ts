import 'server-only'

/**
 * TASK-1277 Slice 2 — Resolver de entitlement/allowance AEO per-org.
 *
 * AEO es un servicio con entitlement POR ORGANIZACIÓN (módulo `ai_visibility_v1` en
 * `greenhouse_client_portal.module_assignments`), NO un viewCode role-wide. Este reader
 * resuelve, para una org, su tier (`contracted` | `trial` | `pilot`) y su allowance del
 * período (runs/mes con reset mensual), contando los runs de portal del mes contra el cap
 * del tier. Los runs SON el ledger (columnas de atribución en `grader_runs`, Slice 2);
 * no hay tabla allowance separada.
 *
 * Es PURO de flags de feature: reporta el estado data-derivado (tier + allowance + budget
 * global). La decisión de habilitar la puerta (portal run / trial) la aplica el chokepoint
 * (`requestGraderRunForOrganization`, Slice 3) con `isPortalRunEnabled`/`isTrialTierEnabled`.
 *
 * El tier vive en `module_assignments.metadata_json.aeo_tier`; el cap del pilot puede
 * sobreescribirse con `metadata_json.aeo_runs_per_month`. El tope global mensual de trials
 * (cost backstop) espeja el budget diario público de `public-intake/abuse-guard.ts`.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { resolveAeoAllowanceConfig, type AeoAllowanceConfig } from './flags'
import { resolveProviderPolicy } from './policy'

export const AI_VISIBILITY_MODULE_KEY = 'ai_visibility_v1' as const

export type AeoTier = 'contracted' | 'trial' | 'pilot'

export type AeoBlockedReason =
  | 'no_entitlement'
  | 'expired'
  | 'quota_exhausted'
  | 'trial_budget_exhausted'

export interface AeoEntitlement {
  organizationId: string
  /** ¿La org tiene el módulo AEO asignado y vigente? */
  hasModule: boolean
  tier: AeoTier | null
  assignmentId: string | null
  /** status del assignment (`active`/`pilot`). */
  status: string | null
  /** Cupo del período según el tier. */
  allowanceCap: number
  /** Runs de portal consumidos este mes por la org. */
  allowanceUsed: number
  /** Cupo restante (>= 0). */
  allowanceRemaining: number
  /** Inicio del próximo período (reset mensual), ISO. */
  periodResetAt: string
  /** Razón de bloqueo si no puede correr ahora; null = puede correr (sujeto a flags + costo). */
  blockedReason: AeoBlockedReason | null
}

const VALID_TIERS: ReadonlySet<string> = new Set<AeoTier>(['contracted', 'trial', 'pilot'])

interface AssignmentRow extends Record<string, unknown> {
  assignment_id: string
  status: string
  metadata_json: Record<string, unknown> | null
}

interface AllowanceCountsRow extends Record<string, unknown> {
  org_used: number
  global_trial_used: number
  period_reset_at: string
}

const resolveTier = (status: string, metadata: Record<string, unknown> | null): AeoTier => {
  const declared = typeof metadata?.aeo_tier === 'string' ? metadata.aeo_tier : null

  if (declared && VALID_TIERS.has(declared)) {
    return declared as AeoTier
  }

  // Fallback conservador: pilot por status; en otro caso, el tier de menor allowance (trial).
  return status === 'pilot' ? 'pilot' : 'trial'
}

const resolveCap = (
  tier: AeoTier,
  metadata: Record<string, unknown> | null,
  config: AeoAllowanceConfig
): number => {
  if (tier === 'contracted') {
    return config.contractedRunsPerMonth
  }

  if (tier === 'pilot') {
    const override = metadata?.aeo_runs_per_month

    if (typeof override === 'number' && Number.isFinite(override) && override >= 0) {
      return Math.floor(override)
    }

    return config.pilotRunsPerMonth
  }

  return config.trialRunsPerMonth
}

/**
 * Resuelve el entitlement AEO de una org. No incurre costo ni muta nada (read-only).
 * El chokepoint lo usa para gate allowance + atribución (`assignmentId`).
 */
export const resolveAeoEntitlement = async (
  organizationId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<AeoEntitlement> => {
  const config = resolveAeoAllowanceConfig(env)

  // Período del reset siempre disponible (incluso sin entitlement) para la UI.
  const counts = await runGreenhousePostgresQuery<AllowanceCountsRow>(
    `SELECT
       (SELECT COUNT(*) FROM greenhouse_growth.grader_runs
         WHERE organization_id = $1
           AND run_source LIKE 'portal_%'
           AND created_at >= date_trunc('month', CURRENT_DATE))::int AS org_used,
       (SELECT COUNT(*) FROM greenhouse_growth.grader_runs
         WHERE run_source = 'portal_trial'
           AND created_at >= date_trunc('month', CURRENT_DATE))::int AS global_trial_used,
       (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::timestamptz AS period_reset_at`,
    [organizationId]
  )

  const periodResetAt = counts[0]?.period_reset_at
    ? new Date(counts[0].period_reset_at).toISOString()
    : new Date().toISOString()

  const orgUsed = counts[0]?.org_used ?? 0
  const globalTrialUsed = counts[0]?.global_trial_used ?? 0

  const assignmentRows = await runGreenhousePostgresQuery<AssignmentRow>(
    `SELECT assignment_id, status, metadata_json
       FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1
        AND module_key = $2
        AND effective_to IS NULL
        AND status IN ('active', 'pilot')
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC
      LIMIT 1`,
    [organizationId, AI_VISIBILITY_MODULE_KEY]
  )

  const assignment = assignmentRows[0]

  if (!assignment) {
    return {
      organizationId,
      hasModule: false,
      tier: null,
      assignmentId: null,
      status: null,
      allowanceCap: 0,
      allowanceUsed: orgUsed,
      allowanceRemaining: 0,
      periodResetAt,
      blockedReason: 'no_entitlement'
    }
  }

  const tier = resolveTier(assignment.status, assignment.metadata_json)
  const allowanceCap = resolveCap(tier, assignment.metadata_json, config)
  const allowanceRemaining = Math.max(0, allowanceCap - orgUsed)

  // Tope global mensual de trials (cost backstop): costo estimado de los trial runs del mes
  // (conteo × cost ceiling del modo light) vs el budget configurado. Solo aplica a tier trial.
  const lightCeilingUsd = resolveProviderPolicy('light').costCeilingUsdPerRun
  const globalTrialEstimatedUsd = globalTrialUsed * lightCeilingUsd

  const trialBudgetTripped =
    tier === 'trial' && globalTrialEstimatedUsd >= config.trialGlobalMonthlyBudgetUsd

  let blockedReason: AeoBlockedReason | null = null

  if (allowanceRemaining <= 0) {
    blockedReason = 'quota_exhausted'
  } else if (trialBudgetTripped) {
    blockedReason = 'trial_budget_exhausted'
  }

  return {
    organizationId,
    hasModule: true,
    tier,
    assignmentId: assignment.assignment_id,
    status: assignment.status,
    allowanceCap,
    allowanceUsed: orgUsed,
    allowanceRemaining,
    periodResetAt,
    blockedReason
  }
}
