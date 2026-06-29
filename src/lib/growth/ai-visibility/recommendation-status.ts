import 'server-only'

/**
 * TASK-1275 — Growth AI Visibility · Estado de ejecución del Plan AEO (server-only, EPIC-020).
 *
 * Contrato gobernado del avance de cada recomendación (gap key) del Plan AEO por organización.
 * Un operador interno (Growth/AM) marca cada foco; el cliente lo VE (read-only) como avance del
 * servicio done-for-you que contrató. Full API Parity: la regla vive acá; UI/Nexa/MCP son clientes.
 *
 * Invariantes load-bearing:
 *  - Ancla = (organization_id, recommendation_key) PERSISTENTE entre re-grades (la PK NO incluye
 *    run_id). `sourceRunId` = provenance del run que el operador miraba (no ata la persistencia).
 *  - `recommendationKey` ∈ RECOMMENDATION_GAP_KEYS (validado app-level; el pack es versionado en TS).
 *  - `done` = Efeonce ejecutó el trabajo del foco, NO "gap cerrada / AEO terminado" (el AEO es continuo).
 *  - Idempotencia = no-op real: mismo status+reason que el current → sin history ni outbox.
 *  - `reason` obligatorio en `blocked` (esperando insumo del cliente) y `dismissed` (foco descartado).
 *  - Write self-guarda con `can()` (recibe org arbitraria); current + history + outbox son atómicos.
 */

import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { RECOMMENDATION_GAP_KEYS, type RecommendationGapKey } from './report/contracts'

export const RECOMMENDATION_STATUS_VALUES = [
  'not_started',
  'in_progress',
  'blocked',
  'done',
  'dismissed'
] as const
export type RecommendationStatusValue = (typeof RECOMMENDATION_STATUS_VALUES)[number]

/** Estados que exigen `reason` (trazabilidad del bloqueo/descarte). */
const REASON_REQUIRED_STATUSES: readonly RecommendationStatusValue[] = ['blocked', 'dismissed']

export class RecommendationStatusError extends Error {
  readonly code: 'forbidden' | 'invalid_recommendation_key' | 'invalid_status' | 'reason_required'

  constructor(
    code: 'forbidden' | 'invalid_recommendation_key' | 'invalid_status' | 'reason_required',
    message: string
  ) {
    super(message)
    this.name = 'RecommendationStatusError'
    this.code = code
  }
}

export interface RecommendationStatusRecord {
  recommendationKey: RecommendationGapKey
  status: RecommendationStatusValue
  sourceRunId: string | null
  reason: string | null
  updatedBy: string
  updatedAt: string
}

type RawStatusRow = {
  recommendation_key: string
  status: string
  source_run_id: string | null
  reason: string | null
  updated_by: string
  updated_at: string
}

const projectStatus = (row: RawStatusRow): RecommendationStatusRecord => ({
  recommendationKey: row.recommendation_key as RecommendationGapKey,
  status: row.status as RecommendationStatusValue,
  sourceRunId: row.source_run_id ?? null,
  reason: row.reason ?? null,
  updatedBy: row.updated_by,
  updatedAt: String(row.updated_at)
})

/**
 * Lee el status de todas las recomendaciones de una organización. Gate-agnostic (mirror del reader
 * client-scoped TASK-1243): el caller resuelve el boundary — cliente por `requireClientTenantContext`
 * (su propia org), operador por capability. Degrada honesto: org sin filas → `[]` (la UI muestra
 * "sin seguimiento aún").
 */
export const readRecommendationStatuses = async (
  organizationId: string
): Promise<RecommendationStatusRecord[]> => {
  const rows = await runGreenhousePostgresQuery<RawStatusRow>(
    `SELECT recommendation_key, status, source_run_id, reason, updated_by, updated_at
       FROM greenhouse_growth.grader_recommendation_status
      WHERE organization_id = $1
      ORDER BY recommendation_key`,
    [organizationId]
  )

  return rows.map(projectStatus)
}

export interface SetRecommendationStatusInput {
  /** Subject autenticado; el command self-guarda con la capability (org arbitraria). */
  subject: TenantEntitlementSubject
  organizationId: string
  recommendationKey: string
  status: string
  /** Run que el operador miraba al setear (provenance). NO ata la persistencia. */
  sourceRunId?: string | null
  updatedBy: string
  reason?: string | null
}

export interface SetRecommendationStatusResult {
  /** `false` = no-op (status+reason iguales al current; sin history ni outbox). */
  changed: boolean
  status: RecommendationStatusRecord
}

/**
 * Setea el estado de ejecución de una recomendación del Plan AEO (write gobernado).
 * - `forbidden`: el subject no tiene `growth.ai_visibility.recommendation.set_status`.
 * - `invalid_recommendation_key` / `invalid_status`: fuera de los contratos canónicos.
 * - `reason_required`: `blocked`/`dismissed` sin `reason`.
 */
export const setRecommendationStatus = async (
  input: SetRecommendationStatusInput
): Promise<SetRecommendationStatusResult> => {
  if (!can(input.subject, 'growth.ai_visibility.recommendation.set_status', 'execute', 'tenant')) {
    throw new RecommendationStatusError('forbidden', 'No tienes acceso para registrar el avance del Plan AEO.')
  }

  if (!(RECOMMENDATION_GAP_KEYS as readonly string[]).includes(input.recommendationKey)) {
    throw new RecommendationStatusError('invalid_recommendation_key', 'La recomendación indicada no es válida.')
  }

  if (!(RECOMMENDATION_STATUS_VALUES as readonly string[]).includes(input.status)) {
    throw new RecommendationStatusError('invalid_status', 'El estado indicado no es válido.')
  }

  const status = input.status as RecommendationStatusValue
  const reason = input.reason?.trim() ? input.reason.trim() : null

  if (REASON_REQUIRED_STATUSES.includes(status) && !reason) {
    throw new RecommendationStatusError('reason_required', 'Indica un motivo para bloquear o descartar este foco.')
  }

  const sourceRunId = input.sourceRunId ?? null

  return withGreenhousePostgresTransaction(async client => {
    const currentResult = await client.query<RawStatusRow>(
      `SELECT recommendation_key, status, source_run_id, reason, updated_by, updated_at
         FROM greenhouse_growth.grader_recommendation_status
        WHERE organization_id = $1 AND recommendation_key = $2
        FOR UPDATE`,
      [input.organizationId, input.recommendationKey]
    )

    const current = currentResult.rows[0] ?? null

    // No-op real: mismo status + reason → no appendea history ni publica outbox.
    if (current && current.status === status && (current.reason ?? null) === reason) {
      return { changed: false, status: projectStatus(current) }
    }

    const fromStatus = current?.status ?? null

    const upserted = await client.query<RawStatusRow>(
      `INSERT INTO greenhouse_growth.grader_recommendation_status
         (organization_id, recommendation_key, status, source_run_id, reason, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (organization_id, recommendation_key) DO UPDATE SET
         status = EXCLUDED.status,
         source_run_id = EXCLUDED.source_run_id,
         reason = EXCLUDED.reason,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING recommendation_key, status, source_run_id, reason, updated_by, updated_at`,
      [input.organizationId, input.recommendationKey, status, sourceRunId, reason, input.updatedBy]
    )

    await client.query(
      `INSERT INTO greenhouse_growth.grader_recommendation_status_history
         (organization_id, recommendation_key, from_status, to_status, source_run_id, reason, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [input.organizationId, input.recommendationKey, fromStatus, status, sourceRunId, reason, input.updatedBy]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'growth_ai_visibility_recommendation_status',
        aggregateId: `${input.organizationId}:${input.recommendationKey}`,
        eventType: 'growth.ai_visibility.recommendation_status_changed',
        payload: {
          schemaVersion: 1,
          organizationId: input.organizationId,
          recommendationKey: input.recommendationKey,
          fromStatus,
          toStatus: status,
          sourceRunId,
          updatedBy: input.updatedBy,
          reason
        }
      },
      client
    )

    return { changed: true, status: projectStatus(upserted.rows[0]) }
  })
}
