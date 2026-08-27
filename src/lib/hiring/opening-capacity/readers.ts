import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { activeProcessPredicate } from '../active-process'

import type { OpeningCapacityStatus } from './types'

/**
 * TASK-1762 Slice 1 — lectura canónica del estado de capacidad de una vacante.
 *
 * Único punto que traduce «política + cupos + decisiones vigentes» a una respuesta. Todo consumidor
 * —UI de `TASK-1763`, worker, Product API/MCP— pasa por acá: ninguno recompone la regla.
 *
 * El predicado de «sigue en proceso» se DERIVA de `activeProcessPredicate`, nunca se transcribe:
 * son dos ejes (sin desenlace vigente Y no archivada) y escribir sólo uno deja fuera del conteo a
 * gente archivada o le atribuye proceso activo a quien ya cerró. Hay un gate `--strict` que bloquea
 * la reintroducción de la lista literal.
 */

interface CapacityRow extends Record<string, unknown> {
  opening_id: string
  public_id: string
  requested_seats: number
  occupied_seats: string | number
  active_applications: string | number
  managed_since: string | null
  set_by_user_id: string | null
  reason: string | null
  policy_version: number | null
}

const toCount = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? parsed : 0
}

export const readOpeningCapacityStatus = async (openingId: string): Promise<OpeningCapacityStatus | null> => {
  // `runGreenhousePostgresQuery` devuelve `result.rows` YA desempaquetado: es un array, no un
  // objeto con `.rows`. Tratarlo como `{ rows }` compila sin queja y revienta en runtime.
  const rows = await runGreenhousePostgresQuery<CapacityRow>(
    `SELECT o.opening_id,
            o.public_id,
            o.requested_seats,
            count(a.application_id) FILTER (WHERE a.decision = 'selected')  AS occupied_seats,
            count(a.application_id) FILTER (WHERE ${activeProcessPredicate('a')}) AS active_applications,
            c.managed_since,
            c.set_by_user_id,
            c.reason,
            c.policy_version
       FROM greenhouse_hiring.hiring_opening o
       LEFT JOIN greenhouse_hiring.hiring_application a
              ON a.opening_id = o.opening_id
       -- La politica se une SOLO si esta vigente: una fila retirada deja la vacante unmanaged
       -- otra vez, sin borrar la evidencia de que alguna vez se activo.
       -- (Sin backticks ni acentos en este comentario: vive dentro de un template literal de JS,
       --  donde un backtick cierra la cadena y rompe el parseo.)
       LEFT JOIN greenhouse_hiring.hiring_opening_capacity c
              ON c.opening_id = o.opening_id
             AND c.retired_at IS NULL
      WHERE o.opening_id = $1
      GROUP BY o.opening_id, o.public_id, o.requested_seats,
               c.managed_since, c.set_by_user_id, c.reason, c.policy_version`,
    [openingId]
  )

  const row = rows[0]

  if (!row) return null

  const targetSeats = toCount(row.requested_seats)
  const occupiedSeats = toCount(row.occupied_seats)
  const managed = row.managed_since !== null

  // `Math.max(0, …)` no es cosmético: si alguien seleccionó más gente que cupos declarados, el
  // remanente real es cero, no un negativo que un consumidor podría mostrar como «quedan -2».
  const remainingSeats = Math.max(0, targetSeats - occupiedSeats)

  return {
    openingId: row.opening_id,
    publicId: row.public_id,
    state: managed ? 'managed' : 'unmanaged',
    targetSeats,
    occupiedSeats,
    remainingSeats,
    // Una vacante `unmanaged` NUNCA reporta capacidad llena: sin opt-in no hay automatización que
    // gatillar, y decir «llena» invitaría a un consumidor a ofrecer el cierre.
    capacityFilled: managed && remainingSeats === 0,
    activeApplications: toCount(row.active_applications),
    policy:
      managed && row.managed_since
        ? {
            openingId: row.opening_id,
            managedSince: row.managed_since,
            setByUserId: row.set_by_user_id ?? '',
            reason: row.reason ?? '',
            policyVersion: row.policy_version ?? 1
          }
        : null
  }
}
