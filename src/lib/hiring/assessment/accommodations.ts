import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  ASSESSMENT_ACCOMMODATABLE_STATUSES,
  ASSESSMENT_ACCOMMODATION_MAX_EXTRA_MINUTES,
  ASSESSMENT_ACCOMMODATION_MIN_EXTRA_MINUTES,
  type Assessment,
  type AssessmentAccommodations,
} from '@/types/hiring-assessment'

import { ASSESSMENT_COLS, normalizeAssessment, type AssessmentRow } from './instances'
import { HiringNotFoundError, HiringValidationError } from '../errors'

/**
 * TASK-1719 — Otorgar un ajuste razonable (tiempo extra) sobre un candidate_test.
 * Cierra la Open Question 7 del ADR de assignment policy.
 *
 * El campo `accommodations_json` existía cableado end-to-end EN LECTURA desde TASK-1360, pero
 * sin write path: 17 instancias en la base, las 17 con `{}`. O sea, nunca se le concedió un
 * ajuste a nadie. La doctrina de selección (y la defensibilidad del proceso) exige poder
 * alargarle el tiempo a UNA persona sin alargárselo a toda la cohorte.
 *
 * ══ POR QUÉ NO SE GUARDA EL MOTIVO ══
 *
 * Este command NO acepta —ni aceptará— un campo de texto libre con la razón del ajuste, y eso
 * es una DECISIÓN DE PRIVACIDAD deliberada, no una omisión pendiente de completar.
 *
 * Un ajuste razonable revela, por construcción, una condición de discapacidad o de salud: una
 * categoría protegida. Persistir "dislexia", "TDAH", "post-operatorio" junto al expediente lo
 * convierte en un dato sensible durable, consultable y reutilizable — exactamente el material
 * con el que se discrimina, y contra el que el propio proceso de selección debería blindarse.
 * Lo que el sistema necesita para operar es el ARREGLO OPERATIVO (cuántos minutos más), no el
 * diagnóstico que lo justifica.
 *
 * Si People necesita constancia narrativa de la conversación, va al Expediente de Evaluación
 * (`hiring_application_note`, TASK-1735), que ya tiene su propia gobernanza de acceso,
 * append-only y capability. La trazabilidad de QUIÉN otorgó y CUÁNDO sí vive acá
 * (`grantedBy`/`grantedAt`) — eso es rendición de cuentas del operador, no dato del candidato.
 *
 * ══ OTRAS DECISIONES DURAS ══
 *
 * - **NO se gatea por flag.** Acomodar a una persona no puede depender de que alguien haya
 *   prendido una variable de entorno. Mismo criterio que `cancelCandidateTest`.
 * - **Re-otorgar REEMPLAZA** (con actor y timestamp nuevos): es la vía de corregir un monto
 *   mal puesto. Otorgar el MISMO monto vigente es no-op idempotente (doble click, retry).
 * - **Sólo `candidate_test`**: un `interviewer_scorecard` no tiene candidato a quien acomodar.
 * - El payload al candidato sigue siendo `PublicAssessmentTiming` (números derivados); el JSON
 *   crudo NUNCA cruza la frontera pública.
 */

export interface GrantAssessmentAccommodationInput {
  assessmentId: string
  /** Minutos adicionales al límite base. Entero 1..180. */
  extraMinutes: number
  /** Siempre `tenant.userId` de la sesión — NUNCA del body. */
  actorUserId: string
}

export type GrantAssessmentAccommodationOutcome = 'granted' | 'replaced' | 'unchanged'

export interface GrantAssessmentAccommodationResult {
  assessment: Assessment
  /**
   * `granted` = primer ajuste · `replaced` = corrigió un monto anterior ·
   * `unchanged` = no-op idempotente (mismo monto ya vigente).
   */
  outcome: GrantAssessmentAccommodationOutcome
  accommodations: AssessmentAccommodations
  /** Minutos vigentes ANTES de este otorgamiento (0 si no había ajuste). */
  previousExtraMinutes: number
}

/** Mensaje es-CL por estado terminal. Explica el porqué, no sólo que no se pudo. */
const NOT_ACCOMMODATABLE_MESSAGES: Record<string, string> = {
  submitted: 'No se puede otorgar tiempo extra: el candidato ya entregó esta evaluación.',
  scored: 'No se puede otorgar tiempo extra: esta evaluación ya está corregida.',
  expired: 'No se puede otorgar tiempo extra: esta evaluación ya venció. Asigna una nueva.',
  cancelled: 'No se puede otorgar tiempo extra: esta evaluación fue cancelada.',
}

/**
 * Lee los minutos vigentes del bloque canónico. NO acepta grafías alternativas: si el JSON
 * trae otra cosa, se trata como "sin ajuste" y este write lo normaliza.
 */
const readCurrentExtraMinutes = (accommodations: Record<string, unknown>): number => {
  const raw = accommodations.extraMinutes

  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

export const grantAssessmentAccommodation = async (
  input: GrantAssessmentAccommodationInput,
): Promise<GrantAssessmentAccommodationResult> => {
  const actorUserId = input.actorUserId ? String(input.actorUserId) : ''

  if (!actorUserId) {
    throw new HiringValidationError(
      'Falta el usuario que otorga el ajuste.',
      'assessment_accommodation_missing_actor',
      401,
    )
  }

  const assessmentId = input.assessmentId ? String(input.assessmentId) : ''

  if (!assessmentId) {
    throw new HiringValidationError('assessmentId es obligatorio.', 'assessment_field_required', 400)
  }

  const extraMinutes = typeof input.extraMinutes === 'number' ? input.extraMinutes : Number(input.extraMinutes)

  if (
    !Number.isInteger(extraMinutes) ||
    extraMinutes < ASSESSMENT_ACCOMMODATION_MIN_EXTRA_MINUTES ||
    extraMinutes > ASSESSMENT_ACCOMMODATION_MAX_EXTRA_MINUTES
  ) {
    throw new HiringValidationError(
      `El tiempo extra debe ser un número entero de minutos entre ${ASSESSMENT_ACCOMMODATION_MIN_EXTRA_MINUTES} y ${ASSESSMENT_ACCOMMODATION_MAX_EXTRA_MINUTES}.`,
      'assessment_accommodation_invalid_extra_minutes',
      400,
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    const locked = await client.query(
      `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment
       WHERE assessment_id = $1 LIMIT 1 FOR UPDATE`,
      [assessmentId],
    )

    const current = (locked.rows as AssessmentRow[])[0]

    if (!current) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    const before = normalizeAssessment(current)

    if (before.method !== 'candidate_test') {
      throw new HiringValidationError(
        'Solo se pueden ajustar las evaluaciones que rinde el candidato.',
        'assessment_accommodation_method_not_supported',
        409,
      )
    }

    if (!(ASSESSMENT_ACCOMMODATABLE_STATUSES as readonly string[]).includes(before.status)) {
      throw new HiringValidationError(
        NOT_ACCOMMODATABLE_MESSAGES[before.status] ?? 'Esta evaluación ya no admite tiempo extra.',
        'assessment_accommodation_status_not_allowed',
        409,
        { status: before.status },
      )
    }

    const previousExtraMinutes = readCurrentExtraMinutes(before.accommodations)

    // No-op idempotente: otorgar el MISMO monto vigente no reescribe actor ni timestamp — el
    // trail debe reflejar la decisión real, no un doble click. Un monto distinto SÍ reemplaza.
    if (previousExtraMinutes === extraMinutes) {
      return {
        assessment: before,
        outcome: 'unchanged' as const,
        accommodations: before.accommodations as unknown as AssessmentAccommodations,
        previousExtraMinutes,
      }
    }

    const grantedAt = new Date().toISOString()

    const accommodations: AssessmentAccommodations = { extraMinutes, grantedBy: actorUserId, grantedAt }

    const updated = await client.query(
      `UPDATE greenhouse_hiring.hiring_assessment
       SET accommodations_json = $2::jsonb, updated_at = NOW()
       WHERE assessment_id = $1 AND status = $3
       RETURNING ${ASSESSMENT_COLS}`,
      [assessmentId, JSON.stringify(accommodations), before.status],
    )

    const row = (updated.rows as AssessmentRow[])[0]

    if (!row) {
      throw new HiringValidationError(
        'La evaluación cambió de estado mientras otorgabas el ajuste. Vuelve a cargarla.',
        'assessment_accommodation_stale_state',
        409,
      )
    }

    // Payload IDs-only. NUNCA nombre, correo, token ni score — y no hay motivo que filtrar
    // porque el motivo, deliberadamente, no se guarda.
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentAccommodationGranted,
        payload: {
          assessmentId,
          applicationId: before.applicationId,
          templateId: before.templateId,
          method: 'candidate_test',
          status: before.status,
          extraMinutes,
          previousExtraMinutes,
          actorUserId,
        },
      },
      client,
    )

    return {
      assessment: normalizeAssessment(row),
      outcome: previousExtraMinutes > 0 ? ('replaced' as const) : ('granted' as const),
      accommodations,
      previousExtraMinutes,
    }
  })
}
