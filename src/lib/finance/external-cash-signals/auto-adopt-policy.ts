import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { ExternalSignalAutoAdoptMode } from './types'

/**
 * TASK-708 D3 — Resuelve la política `review` vs `auto_adopt` para
 * (sourceSystem, spaceId).
 *
 * Reglas duras:
 *   - default global cuando no hay row activa: `review` (conservador).
 *   - una row con `space_id = spaceId` gana sobre una row con `space_id = NULL`
 *     (override por space).
 *   - si hay 2+ rows activas para el mismo (sourceSystem, spaceId), el UNIQUE
 *     parcial del schema garantiza que es imposible — pero defendemos en
 *     código devolviendo `review` como conservador.
 */
export const resolveAutoAdoptPolicy = async (
  sourceSystem: string,
  spaceId: string
): Promise<ExternalSignalAutoAdoptMode> => {
  const rows = await runGreenhousePostgresQuery<{ mode: ExternalSignalAutoAdoptMode; space_id: string | null }>(
    `
      SELECT mode, space_id
      FROM greenhouse_finance.external_signal_auto_adopt_policies
      WHERE is_active = TRUE
        AND source_system = $1
        AND (space_id IS NULL OR space_id = $2)
      ORDER BY space_id IS NULL ASC
      LIMIT 1
    `,
    [sourceSystem, spaceId]
  )

  return rows[0]?.mode ?? 'review'
}
