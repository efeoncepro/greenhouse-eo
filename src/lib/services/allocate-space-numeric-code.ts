import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-813a — Canonical allocator de `greenhouse_core.spaces.numeric_code`.
 *
 * Single source of truth para asignar el próximo `numeric_code` libre. Usa
 * `pg_advisory_xact_lock` para evitar race condition cuando 2 spaces se
 * crean concurrent (e.g. 2 webhooks HubSpot llegan simultáneo, o cron
 * + webhook coinciden).
 *
 * Sin el advisory lock, ambos callers leerían MAX y sumarían 1 → ambos
 * intentan INSERT con el mismo `numeric_code` → UNIQUE constraint rechaza
 * uno → caller debe retry. El lock serializa la región crítica.
 *
 * Lock key: 8131_0001 (TASK-813a + sequence). Hash distinto a otros locks
 * canónicos (TASK-700 internal_account_number_registry usa por (space, type)
 * key); este es global a la tabla spaces.
 *
 * Constraint check: numeric_code es CHAR(2) con CHECK '^[0-9]{2}$' →
 * máximo 99 spaces. Si el número crece, migración debe extender a 4 dígitos.
 */

const SPACE_NUMERIC_CODE_LOCK_KEY = 8131_0001 as const

export class SpaceNumericCodeAllocatorFullError extends Error {
  constructor() {
    super('numeric_code allocator full (99 spaces). Schema migration needed to extend to 4 digits.')
    this.name = 'SpaceNumericCodeAllocatorFullError'
  }
}

export const allocateSpaceNumericCode = async (): Promise<string> => {
  // Advisory lock dentro de la tx evita race con otros writers concurrent.
  // pg_advisory_xact_lock libera al COMMIT/ROLLBACK automáticamente, sin
  // riesgo de deadlock por leak.
  await runGreenhousePostgresQuery(`SELECT pg_advisory_xact_lock($1::bigint)`, [
    SPACE_NUMERIC_CODE_LOCK_KEY
  ])

  const rows = await runGreenhousePostgresQuery<{ numeric_code: string }>(
    `SELECT numeric_code FROM greenhouse_core.spaces ORDER BY numeric_code DESC LIMIT 1`
  )

  const last = parseInt(rows[0]?.numeric_code ?? '00', 10)
  const next = last + 1

  if (next > 99) {
    throw new SpaceNumericCodeAllocatorFullError()
  }

  return String(next).padStart(2, '0')
}
