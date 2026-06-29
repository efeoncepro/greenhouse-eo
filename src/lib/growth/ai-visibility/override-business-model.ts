import 'server-only'

/**
 * TASK-1289 Slice 3 — Growth AI Visibility · Override del modelo de negocio (gobernado).
 *
 * El operador (Growth/AM) corrige el `business_model` derivado de un perfil cuando la
 * clasificación automática (grounded / heurística de categoría) se equivocó. Es una acción
 * gobernada DISTINTA: reencuadra el buyer-intent de TODO run futuro de la org (blast real),
 * por eso una capability dedicada + auditoría append-only. Full API Parity: la regla vive acá;
 * UI/Nexa/MCP son clientes (Nexa muta sólo vía propose→confirm→execute sobre este command).
 *
 * Invariantes load-bearing (mirror de setRecommendationStatus, TASK-1275):
 *  - Write self-guarda con `can()` (recibe un profileId/org arbitrarios).
 *  - `businessModel` ∈ BUSINESS_MODELS (enum cerrado; `unknown` permitido para marcar "revisar").
 *  - Override = human-asserted ⇒ source `operator_override` + confidence 1.0 (autoritativo).
 *  - Idempotencia = no-op real: mismo valor ya como override → sin history ni outbox.
 *  - current (grader_profiles) + history (append-only) + outbox son atómicos (una tx).
 */

import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { BUSINESS_MODELS, type BusinessModel } from './taxonomy'

/** Confianza asignada a un override humano (autoritativo, no un prior). */
export const OPERATOR_OVERRIDE_CONFIDENCE = 1.0

export class OverrideBusinessModelError extends Error {
  readonly code: 'forbidden' | 'invalid_business_model' | 'profile_not_found'

  constructor(code: 'forbidden' | 'invalid_business_model' | 'profile_not_found', message: string) {
    super(message)
    this.name = 'OverrideBusinessModelError'
    this.code = code
  }
}

export interface OverrideProfileBusinessModelInput {
  /** Subject autenticado; el command self-guarda con la capability (profile arbitrario). */
  subject: TenantEntitlementSubject
  /** Perfil objetivo (SoT del business_model). */
  profileId: string
  /** Nuevo modelo de negocio (enum cerrado). */
  businessModel: string
  updatedBy: string
  /** Motivo del override (recomendado para trazabilidad; libre). */
  reason?: string | null
}

export interface OverrideProfileBusinessModelResult {
  /** `false` = no-op (mismo valor ya como override; sin history ni outbox). */
  changed: boolean
  businessModel: BusinessModel
  source: 'operator_override'
}

type ProfileLockRow = {
  profile_id: string
  organization_id: string | null
  business_model: string | null
  business_model_source: string | null
}

/**
 * Override del modelo de negocio de un perfil AEO (write gobernado + auditado).
 * - `forbidden`: el subject no tiene `growth.ai_visibility.profile.set_business_model`.
 * - `invalid_business_model`: fuera del enum cerrado.
 * - `profile_not_found`: el profileId no existe.
 */
export const overrideProfileBusinessModel = async (
  input: OverrideProfileBusinessModelInput
): Promise<OverrideProfileBusinessModelResult> => {
  if (!can(input.subject, 'growth.ai_visibility.profile.set_business_model', 'execute', 'tenant')) {
    throw new OverrideBusinessModelError(
      'forbidden',
      'No tienes acceso para corregir el modelo de negocio del perfil AEO.'
    )
  }

  if (!(BUSINESS_MODELS as readonly string[]).includes(input.businessModel)) {
    throw new OverrideBusinessModelError('invalid_business_model', 'El modelo de negocio indicado no es válido.')
  }

  const businessModel = input.businessModel as BusinessModel
  const reason = input.reason?.trim() ? input.reason.trim() : null

  return withGreenhousePostgresTransaction(async client => {
    const currentResult = await client.query<ProfileLockRow>(
      `SELECT profile_id, organization_id, business_model, business_model_source
         FROM greenhouse_growth.grader_profiles
        WHERE profile_id = $1
        FOR UPDATE`,
      [input.profileId]
    )

    const current = currentResult.rows[0]

    if (!current) {
      throw new OverrideBusinessModelError('profile_not_found', 'El perfil AEO indicado no existe.')
    }

    // No-op real: ya es este valor por override humano → no appendea history ni publica outbox.
    if (current.business_model === businessModel && current.business_model_source === 'operator_override') {
      return { changed: false, businessModel, source: 'operator_override' }
    }

    const fromBusinessModel = current.business_model

    await client.query(
      `UPDATE greenhouse_growth.grader_profiles
          SET business_model = $2,
              business_model_source = 'operator_override',
              business_model_confidence = $3,
              updated_at = NOW()
        WHERE profile_id = $1`,
      [input.profileId, businessModel, OPERATOR_OVERRIDE_CONFIDENCE]
    )

    await client.query(
      `INSERT INTO greenhouse_growth.grader_business_model_history
         (profile_id, organization_id, from_business_model, to_business_model, to_source, confidence, reason, changed_by)
       VALUES ($1, $2, $3, $4, 'operator_override', $5, $6, $7)`,
      [
        input.profileId,
        current.organization_id,
        fromBusinessModel,
        businessModel,
        OPERATOR_OVERRIDE_CONFIDENCE,
        reason,
        input.updatedBy
      ]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'growth_ai_visibility_business_model',
        aggregateId: input.profileId,
        eventType: 'growth.ai_visibility.business_model_overridden',
        payload: {
          schemaVersion: 1,
          profileId: input.profileId,
          organizationId: current.organization_id,
          fromBusinessModel,
          toBusinessModel: businessModel,
          updatedBy: input.updatedBy,
          reason
        }
      },
      client
    )

    return { changed: true, businessModel, source: 'operator_override' }
  })
}

/** Lectura del historial de cambios de business_model de un perfil (auditoría / trazabilidad). */
export interface BusinessModelHistoryRecord {
  fromBusinessModel: string | null
  toBusinessModel: string
  toSource: string
  confidence: number | null
  reason: string | null
  changedBy: string
  changedAt: string
}

export const readBusinessModelHistory = async (
  profileId: string
): Promise<BusinessModelHistoryRecord[]> => {
  const rows = await runGreenhousePostgresQuery<Record<string, unknown>>(
    `SELECT from_business_model, to_business_model, to_source, confidence, reason, changed_by, changed_at
       FROM greenhouse_growth.grader_business_model_history
      WHERE profile_id = $1
      ORDER BY changed_at DESC`,
    [profileId]
  )

  return rows.map(row => ({
    fromBusinessModel: (row.from_business_model as string | null) ?? null,
    toBusinessModel: String(row.to_business_model),
    toSource: String(row.to_source),
    confidence: row.confidence != null ? Number(row.confidence) : null,
    reason: (row.reason as string | null) ?? null,
    changedBy: String(row.changed_by),
    changedAt: String(row.changed_at)
  }))
}
