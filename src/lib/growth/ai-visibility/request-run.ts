import 'server-only'

/**
 * TASK-1277 Slice 3 — Chokepoint gobernado de runs AEO (entitlement & metering).
 *
 * UN motor, varias puertas. Este módulo es el ÚNICO entrypoint de runs de PORTAL:
 *
 *   - `requestGraderRunForOrganization` (puertas cliente): gate entitlement → ventana →
 *     allowance → costo, consume allowance de forma ATÓMICA (lock de la fila del assignment
 *     + recuento dentro de la tx → sin doble-consumo bajo carrera), y encola el run con
 *     atribución per-org (`organization_id`/`assignment_id`/`run_source`/`cost_attribution`).
 *
 *   - `requestGraderRunAsOperator` (puerta operador, 4.ª): Growth/AM corre el motor sobre
 *     cualquier cliente o prospecto como jugada de venta — ILIMITADO (sin allowance/tope),
 *     costo atribuido a "sales". Gateada por capability (en la route), NO por el flag de portal.
 *
 * NUNCA llamar `enqueueGraderDiagnostic`/`runGraderDiagnostic` directo desde una route de
 * portal sin pasar por este chokepoint. El run reusa el cost ceiling por-run de `policy.ts`
 * y la idempotencia de `enqueueGraderDiagnostic` (defense in depth).
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { isRunCategoryBlocked } from './category-guard'
import { enqueueGraderDiagnostic, type RunGraderDiagnosticInput } from './commands'
import { resolveAeoEntitlement, type AeoTier } from './entitlement'
import { isGraderEnabled, isPortalRunEnabled, isTrialTierEnabled } from './flags'
import { getGraderProfileForOrganization, type GraderProfileRow, type GraderRunSource } from './store'

export type RequestRunBlockedReason =
  | 'disabled'
  | 'not_entitled'
  | 'profile_required'
  | 'category_unresolved'
  | 'quota_exhausted'
  | 'cost_blocked'

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

const portalRunSourceForTier = (tier: AeoTier): GraderRunSource =>
  tier === 'contracted' ? 'portal_contracted' : tier === 'pilot' ? 'portal_pilot' : 'portal_trial'

/** Construye el input ejecutable (modo light, public_diagnostic) desde el perfil de la org. */
const buildRunInputFromProfile = (
  profile: GraderProfileRow
): Omit<RunGraderDiagnosticInput, 'attribution' | 'idempotencyKey'> => ({
  brandName: profile.brandName,
  websiteUrl: profile.websiteUrl,
  market: profile.market,
  locale: profile.locale,
  category: profile.category ?? '',
  // TASK-1288 — la categoría canónica resuelta del perfil (SoT); el run usa la label, no el enum.
  categoryNodeId: profile.categoryNodeId,
  categoryLabel: profile.categoryLabel,
  categoryConfidence: profile.categoryConfidence,
  // TASK-1290 — eje de buyer-intent; detrás del flag selecciona el baseline del arquetipo.
  businessModel: profile.businessModel,
  competitorsDeclared: profile.competitorsDeclared,
  mode: 'light',
  runKind: 'public_diagnostic'
})

const emitRunRequestedEvent = async (payload: Record<string, unknown>): Promise<void> => {
  try {
    await publishOutboxEvent({
      aggregateType: 'growth_ai_visibility_run',
      aggregateId: String(payload.runId),
      eventType: 'growth.ai_visibility.run.requested',
      payload
    })
  } catch (error) {
    // Best-effort: el run ya quedó encolado; el evento es de observabilidad/parity.
    captureWithDomain(error, 'growth', {
      tags: { source: 'aeo_run_requested_event' },
      extra: { runId: payload.runId }
    })
  }
}

/**
 * Puertas cliente (contratado / trial / pilot). Único entrypoint de runs de portal.
 * Consume allowance atómico y atribuye el run a la org. No incurre costo si bloquea.
 */
export const requestGraderRunForOrganization = async (input: {
  organizationId: string
  requestedBy: string
  idempotencyKey?: string | null
  env?: NodeJS.ProcessEnv
}): Promise<RequestRunResult> => {
  const env = input.env ?? process.env

  if (!isPortalRunEnabled(env)) {
    return { status: 'blocked', reason: 'disabled' }
  }

  const entitlement = await resolveAeoEntitlement(input.organizationId, env)

  if (!entitlement.hasModule || !entitlement.tier || !entitlement.assignmentId) {
    return { status: 'blocked', reason: 'not_entitled' }
  }

  if (entitlement.tier === 'trial' && !isTrialTierEnabled(env)) {
    return { status: 'blocked', reason: 'disabled' }
  }

  if (entitlement.blockedReason === 'quota_exhausted') {
    return { status: 'blocked', reason: 'quota_exhausted' }
  }

  if (entitlement.blockedReason === 'trial_budget_exhausted') {
    return { status: 'blocked', reason: 'cost_blocked' }
  }

  const profile = await getGraderProfileForOrganization(input.organizationId)

  if (!profile) {
    return { status: 'blocked', reason: 'profile_required' }
  }

  // TASK-1288 — pre-check limpio (sin malgastar allowance): categoría no resuelta bloquea el run.
  if (isRunCategoryBlocked({ categoryNodeId: profile.categoryNodeId, rawCategory: profile.category }, env)) {
    return { status: 'blocked', reason: 'category_unresolved' }
  }

  const tier = entitlement.tier
  const assignmentId = entitlement.assignmentId
  const allowanceCap = entitlement.allowanceCap

  // Claim atómico: lock de la fila del assignment serializa a las requests concurrentes de
  // ESTA org; el recuento corre dentro del lock y el enqueue (que commitea el run con su
  // atribución) ocurre ANTES de liberar el lock → la siguiente request recuenta y ve el run.
  const claim = await withGreenhousePostgresTransaction(async client => {
    await client.query(
      `SELECT 1 FROM greenhouse_client_portal.module_assignments WHERE assignment_id = $1 FOR UPDATE`,
      [assignmentId]
    )

    const usedResult = await client.query<{ used: number }>(
      `SELECT COUNT(*)::int AS used FROM greenhouse_growth.grader_runs
        WHERE organization_id = $1
          AND run_source LIKE 'portal_%'
          AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [input.organizationId]
    )

    const used = usedResult.rows[0]?.used ?? 0

    if (used >= allowanceCap) {
      return { blocked: true as const }
    }

    const enqueue = await enqueueGraderDiagnostic({
      ...buildRunInputFromProfile(profile),
      idempotencyKey: input.idempotencyKey ?? null,
      attribution: {
        organizationId: input.organizationId,
        assignmentId,
        runSource: portalRunSourceForTier(tier),
        costAttribution: 'client'
      }
    })

    return {
      blocked: false as const,
      run: enqueue.run,
      idempotentHit: enqueue.idempotentHit,
      usedAfter: enqueue.idempotentHit ? used : used + 1
    }
  })

  if (claim.blocked) {
    return { status: 'blocked', reason: 'quota_exhausted' }
  }

  await emitRunRequestedEvent({
    runId: claim.run.runId,
    organizationId: input.organizationId,
    assignmentId,
    tier,
    runSource: portalRunSourceForTier(tier),
    costAttribution: 'client',
    requestedBy: input.requestedBy,
    idempotentHit: claim.idempotentHit
  })

  return {
    status: 'accepted',
    runId: claim.run.runId,
    runPublicId: claim.run.publicId,
    pollToken: claim.run.pollToken,
    idempotentHit: claim.idempotentHit,
    tier,
    allowanceRemaining: Math.max(0, allowanceCap - claim.usedAfter)
  }
}

/**
 * Puerta operador (4.ª): Growth/AM corre el motor sobre el subject org (cliente o prospecto)
 * como jugada de venta. ILIMITADO (sin allowance/tope), costo atribuido a "sales". Gateada por
 * capability `growth.ai_visibility.run.operator` en la route + el kill switch global del grader.
 */
export const requestGraderRunAsOperator = async (input: {
  subjectOrganizationId: string
  requestedBy: string
  idempotencyKey?: string | null
  env?: NodeJS.ProcessEnv
}): Promise<RequestRunResult> => {
  const env = input.env ?? process.env

  if (!isGraderEnabled(env)) {
    return { status: 'blocked', reason: 'disabled' }
  }

  const profile = await getGraderProfileForOrganization(input.subjectOrganizationId)

  if (!profile) {
    return { status: 'blocked', reason: 'profile_required' }
  }

  // TASK-1288 — el operador tampoco corre/envía sobre un prospecto con categoría no resuelta.
  if (isRunCategoryBlocked({ categoryNodeId: profile.categoryNodeId, rawCategory: profile.category }, env)) {
    return { status: 'blocked', reason: 'category_unresolved' }
  }

  // Atribución del assignment del subject SI existe (auditoría); NO se exige entitlement —
  // la puerta operador es ilimitada (cross-sell). No consume allowance del cliente.
  const assignmentRows = await runGreenhousePostgresQuery<{ assignment_id: string }>(
    `SELECT assignment_id FROM greenhouse_client_portal.module_assignments
      WHERE organization_id = $1 AND module_key = 'ai_visibility_v1' AND effective_to IS NULL
      ORDER BY created_at DESC LIMIT 1`,
    [input.subjectOrganizationId]
  )

  const enqueue = await enqueueGraderDiagnostic({
    ...buildRunInputFromProfile(profile),
    idempotencyKey: input.idempotencyKey ?? null,
    attribution: {
      organizationId: input.subjectOrganizationId,
      assignmentId: assignmentRows[0]?.assignment_id ?? null,
      runSource: 'operator_sales',
      costAttribution: 'sales'
    }
  })

  await emitRunRequestedEvent({
    runId: enqueue.run.runId,
    organizationId: input.subjectOrganizationId,
    assignmentId: assignmentRows[0]?.assignment_id ?? null,
    tier: 'operator',
    runSource: 'operator_sales',
    costAttribution: 'sales',
    requestedBy: input.requestedBy,
    idempotentHit: enqueue.idempotentHit
  })

  return {
    status: 'accepted',
    runId: enqueue.run.runId,
    runPublicId: enqueue.run.publicId,
    pollToken: enqueue.run.pollToken,
    idempotentHit: enqueue.idempotentHit,
    tier: 'operator',
    allowanceRemaining: null
  }
}
