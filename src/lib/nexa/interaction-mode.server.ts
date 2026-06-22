import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isNexaFloatingExpandableEnabled, isNexaInteractionLaneEnabled } from './flags'
import {
  coerceNexaInteractionMode,
  type NexaInteractionMode,
  type NexaInteractionModeAvailability
} from './interaction-mode'

/**
 * TASK-1079 — disponibilidad de modos resuelta server-side desde los flags de
 * plataforma. El client provider la recibe ya resuelta (no relee process.env del
 * lado server; el NEXT_PUBLIC mirror cubre el lado client).
 */
export const resolveNexaInteractionAvailability = (): NexaInteractionModeAvailability => ({
  expandableEnabled: isNexaFloatingExpandableEnabled(),
  laneEnabled: isNexaInteractionLaneEnabled()
})

/**
 * Lee la preferencia de modo del usuario y la resuelve a un modo efectivo (gateado
 * por disponibilidad, default-safe). Degradación honesta: si la lectura falla o no
 * hay fila, devuelve el default que preserva el comportamiento vigente (nunca rompe
 * el layout). Reusa el mismo predicado de coerción puro que el client.
 */
export const resolveNexaInteractionModeForUser = async (userId: string): Promise<NexaInteractionMode> => {
  const availability = resolveNexaInteractionAvailability()

  try {
    const rows = await runGreenhousePostgresQuery<{ nexa_interaction_mode: string | null }>(
      `SELECT nexa_interaction_mode FROM greenhouse_core.client_users WHERE user_id = $1`,
      [userId]
    )

    return coerceNexaInteractionMode(rows[0]?.nexa_interaction_mode ?? null, availability)
  } catch {
    // Degradación honesta: sin acceso a la preferencia, el flotante se comporta como hoy.
    return coerceNexaInteractionMode(null, availability)
  }
}
