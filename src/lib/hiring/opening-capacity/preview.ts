import 'server-only'

import { createHash } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { activeProcessPredicate, notArchivedPredicate } from '../active-process'

import { readOpeningCapacityStatus } from './readers'

import type { ClosureCohortCategory, ClosureCohortMember, OpeningClosurePreview } from './types'

/**
 * TASK-1762 Slice 2 — preview de la cohorte de un cierre por capacidad.
 *
 * Read-only y sin efectos. Devuelve exactamente a quién afectaría el cierre, agrupado por CÓMO
 * entraría, más una huella (`effectDigest`) que el confirm exige para probar que el humano aprobó
 * esta cohorte y no otra.
 *
 * Las tres categorías no son cosmética de UI: gobiernan quién entra por defecto.
 *
 * - `eligible`  — sigue en proceso activo. Entra por defecto.
 * - `paused`    — etapa `decision_pending` sin desenlace. Es una pausa DELIBERADA del equipo;
 *                 cerrarla sin que nadie lo pida sería revertir una decisión humana.
 * - `backup`    — desenlace `backup_selected`. Es un compromiso ABIERTO con esa persona: si quien
 *                 fue seleccionado se cae, ella entra. Cerrarla por capacidad rompe esa promesa.
 *
 * Nunca entran las candidaturas con desenlace terminal vigente ni las archivadas.
 */

interface CohortRow extends Record<string, unknown> {
  application_id: string
  stage: string
  category: ClosureCohortCategory
}

/**
 * El digest cubre la COMPOSICIÓN exacta (ids + categoría, ordenados) y los cupos. Deliberadamente
 * NO incluye timestamps: dos previews idénticos en contenido deben producir el mismo digest, o el
 * operador vería el confirm rechazado por el mero paso del tiempo y aprendería a reintentar a ciegas.
 *
 * Lo que sí lo invalida es que la realidad cambie: alguien nuevo en la cohorte, alguien que salió,
 * una selección que movió los cupos. Eso es exactamente lo que debe frenar un cierre.
 */
export const computeEffectDigest = (input: {
  openingId: string
  targetSeats: number
  occupiedSeats: number
  members: ClosureCohortMember[]
}): string => {
  const fingerprint = [
    input.openingId,
    `seats:${input.targetSeats}/${input.occupiedSeats}`,
    ...input.members
      .map(member => `${member.category}:${member.applicationId}`)
      .sort((a, b) => a.localeCompare(b))
  ].join('|')

  return createHash('sha256').update(fingerprint).digest('hex')
}

export const previewOpeningCapacityClosure = async (
  openingId: string
): Promise<OpeningClosurePreview | null> => {
  const status = await readOpeningCapacityStatus(openingId)

  if (!status) return null

  const rows = await runGreenhousePostgresQuery<CohortRow>(
    `SELECT a.application_id,
            a.stage,
            CASE
              WHEN a.decision = 'backup_selected' THEN 'backup'
              WHEN a.stage = 'decision_pending'   THEN 'paused'
              ELSE 'eligible'
            END AS category
       FROM greenhouse_hiring.hiring_application a
      WHERE a.opening_id = $1
        AND (
          -- Sigue en proceso: sin desenlace vigente Y no archivada. Se DERIVA del predicado
          -- canonico; transcribirlo a mano deja caer uno de los dos ejes en silencio.
          (${activeProcessPredicate('a')})
          -- El respaldo tiene desenlace, asi que no cae en el predicado anterior, pero su
          -- compromiso sigue abierto: se muestra aparte para que el humano decida.
          OR (a.decision = 'backup_selected' AND ${notArchivedPredicate('a')})
        )
      ORDER BY a.application_id`,
    [openingId]
  )

  const members: ClosureCohortMember[] = rows.map(row => ({
    applicationId: row.application_id,
    category: row.category,
    stage: row.stage
  }))

  const byCategory = (category: ClosureCohortCategory) => members.filter(m => m.category === category)

  const totalRows = await runGreenhousePostgresQuery<{ total: string | number }>(
    `SELECT count(*) AS total FROM greenhouse_hiring.hiring_application WHERE opening_id = $1`,
    [openingId]
  )

  const total = Number(totalRows[0]?.total ?? 0)

  return {
    openingId: status.openingId,
    publicId: status.publicId,
    targetSeats: status.targetSeats,
    occupiedSeats: status.occupiedSeats,
    remainingSeats: status.remainingSeats,
    capacityFilled: status.capacityFilled,
    eligible: byCategory('eligible'),
    paused: byCategory('paused'),
    backup: byCategory('backup'),
    excludedCount: Math.max(0, total - members.length),
    effectDigest: computeEffectDigest({
      openingId: status.openingId,
      targetSeats: status.targetSeats,
      occupiedSeats: status.occupiedSeats,
      members
    })
  }
}
