import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringNotFoundError, HiringValidationError } from '../errors'

import { computeEffectDigest, previewOpeningCapacityClosure } from './preview'

import type { ClosureCohortMember } from './types'

/**
 * TASK-1762 Slice 2 — confirmación del cierre por capacidad.
 *
 * 🔴 **Esta transacción NO cambia ninguna candidatura y NO envía ningún correo.** Sólo crea el run y
 * sus items. Los efectos los aplica el reconciler (Slice 3), item por item, a través del command
 * canónico de decisión.
 *
 * La separación no es estilística: si la confirmación aplicara los efectos, un fallo a mitad dejaría
 * a unas personas decididas y a otras no, sin ningún registro de cuáles faltaban. Escribir primero
 * un item por candidatura es lo que convierte un cierre parcial en algo recuperable.
 */

export interface ConfirmClosureInput {
  openingId: string
  /** Digest del preview que el humano vio. Sin él no se puede confirmar. */
  effectDigest: string
  idempotencyKey: string
  confirmedByUserId: string
  /** Inclusiones explícitas. Por defecto ambas `false`: no se cierra lo que nadie pidió cerrar. */
  includePaused?: boolean
  includeBackup?: boolean
}

export interface ConfirmClosureResult {
  runId: string
  cohortSize: number
  /** `true` cuando la clave de idempotencia ya había creado este run: no se hizo nada nuevo. */
  replayed: boolean
}

export const confirmOpeningCapacityClosure = async (
  input: ConfirmClosureInput
): Promise<ConfirmClosureResult> => {
  if (!input.idempotencyKey || input.idempotencyKey.trim().length < 8) {
    throw new HiringValidationError(
      'La clave de idempotencia es obligatoria y debe tener al menos 8 caracteres.',
      'hiring_opening_closure_idempotency_required',
      422
    )
  }

  const preview = await previewOpeningCapacityClosure(input.openingId)

  if (!preview) throw new HiringNotFoundError('La vacante no existe.', 'hiring_opening_not_found')

  // Una vacante sin politica vigente no tiene automatizacion que gatillar. Rechazar aca —en vez de
  // dejar pasar un cierre "manual"— es lo que impide que el opt-in gobernado se vuelva decorativo.
  if (!preview.capacityFilled && preview.remainingSeats > 0) {
    throw new HiringValidationError(
      'La vacante todavía tiene cupos disponibles, así que no corresponde cerrar la cohorte por capacidad.',
      'hiring_opening_capacity_not_filled',
      422
    )
  }

  const members: ClosureCohortMember[] = [
    ...preview.eligible,
    ...(input.includePaused ? preview.paused : []),
    ...(input.includeBackup ? preview.backup : [])
  ]

  // El digest se recomputa sobre la cohorte COMPLETA del preview, no sobre la seleccion: si alguien
  // entro o salio de cualquier categoria desde que el humano miro, la huella cambia y el cierre se
  // detiene. Comparar solo la seleccion dejaria pasar cambios en las categorias no incluidas, que
  // son justo las que el operador decidio NO cerrar.
  const currentDigest = computeEffectDigest({
    openingId: preview.openingId,
    targetSeats: preview.targetSeats,
    occupiedSeats: preview.occupiedSeats,
    members: [...preview.eligible, ...preview.paused, ...preview.backup]
  })

  if (currentDigest !== input.effectDigest) {
    throw new HiringValidationError(
      'La cohorte cambió desde que viste el resumen. Vuelve a revisarla antes de cerrar.',
      'hiring_opening_closure_preview_stale',
      409
    )
  }

  return withGreenhousePostgresTransaction(async client => {
    // Lock del opening: dos confirmaciones simultaneas de la misma vacante se serializan aca, y la
    // segunda encuentra el run de la primera en vez de duplicar decisiones sobre las mismas personas.
    await client.query('SELECT opening_id FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1 FOR UPDATE', [
      input.openingId
    ])

    const replay = await client.query<{ run_id: string; cohort_size: number }>(
      `SELECT run_id, cohort_size
         FROM greenhouse_hiring.hiring_opening_closure_run
        WHERE opening_id = $1 AND idempotency_key = $2`,
      [input.openingId, input.idempotencyKey]
    )

    if (replay.rows[0]) {
      return { runId: replay.rows[0].run_id, cohortSize: replay.rows[0].cohort_size, replayed: true }
    }

    const active = await client.query<{ run_id: string }>(
      `SELECT run_id FROM greenhouse_hiring.hiring_opening_closure_run
        WHERE opening_id = $1 AND state IN ('pending', 'running')`,
      [input.openingId]
    )

    if (active.rows[0]) {
      throw new HiringValidationError(
        'Ya hay un cierre en curso para esta vacante. Espera a que termine antes de iniciar otro.',
        'hiring_opening_closure_conflict',
        409
      )
    }

    const run = await client.query<{ run_id: string }>(
      `INSERT INTO greenhouse_hiring.hiring_opening_closure_run
         (opening_id, effect_digest, idempotency_key, confirmed_by_user_id,
          target_seats, occupied_seats, cohort_size, included_paused, included_backup)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING run_id`,
      [
        input.openingId,
        input.effectDigest,
        input.idempotencyKey,
        input.confirmedByUserId,
        preview.targetSeats,
        preview.occupiedSeats,
        members.length,
        Boolean(input.includePaused),
        Boolean(input.includeBackup)
      ]
    )

    const runId = run.rows[0]!.run_id

    // Un item por candidatura, ANTES de cualquier efecto. Si el proceso muere despues de esta
    // transaccion, el estado de cada persona ya esta escrito y reanudar es leer los pendientes.
    for (const member of members) {
      await client.query(
        `INSERT INTO greenhouse_hiring.hiring_opening_closure_run_item (run_id, application_id, cohort_category)
         VALUES ($1, $2, $3)
         ON CONFLICT (run_id, application_id) DO NOTHING`,
        [runId, member.applicationId, member.category]
      )
    }

    return { runId, cohortSize: members.length, replayed: false }
  })
}
