import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-2096 — personas sin cuenta operativa en un cliente con varios Spaces.
 *
 * Con un solo Space activo, el cliente conserva el comportamiento de siempre sin grants
 * (`single_space_client`). Cuando el cliente pasa a tener dos o más Spaces activos, nadie queda en un
 * Space por defecto: cada persona necesita un grant vigente en `greenhouse_core.space_access_grants`
 * para operar alguno. Esta señal cuenta las personas activas de esos clientes que no tienen ningún
 * grant vigente: perdieron el acceso operativo al abrirse la segunda cuenta.
 *
 * **Steady state**: 0. Hoy (2026-11-06) ningún cliente tiene más de un Space activo.
 * **Kind**: `data_quality`. **Severidad**: 0 → ok · 1-3 → warning · >3 → error.
 * `not_configured` mientras la tabla de grants no exista (migración `20261106230745107` sin aplicar).
 * **Remediación**: otorgar el Space que corresponda con `grantSpaceAccess` (TASK-2099 trae el command
 * operable) o revisar si la segunda cuenta se activó antes de tiempo (TASK-1852 gobierna la apertura).
 */
export const OPERATIONAL_SPACE_UNGRANTED_USERS_SIGNAL_ID = 'identity.operational_space.ungranted_user'

const SIGNAL_BASE = {
  signalId: OPERATIONAL_SPACE_UNGRANTED_USERS_SIGNAL_ID,
  moduleKey: 'identity',
  kind: 'data_quality',
  source: 'getOperationalSpaceUngrantedUsersSignal',
  label: 'Personas sin cuenta operativa en clientes con varios Spaces'
} as const

const QUERY_SQL = `
  WITH multi_space_clients AS (
    SELECT client_id
      FROM greenhouse_core.spaces
     WHERE active = true AND client_id IS NOT NULL
     GROUP BY client_id
    HAVING count(*) > 1
  )
  SELECT count(*)::int AS n
    FROM greenhouse_core.client_users u
    JOIN multi_space_clients m ON m.client_id = u.client_id
   WHERE u.active = true
     AND u.status = 'active'
     AND u.tenant_type = 'client'
     AND NOT EXISTS (
       SELECT 1
         FROM greenhouse_core.space_access_grants g
         JOIN greenhouse_core.spaces s ON s.space_id = g.space_id AND s.active = true AND s.client_id = u.client_id
        WHERE g.identity_profile_id = u.identity_profile_id
          AND g.active = true
          AND g.valid_from <= now()
          AND (g.valid_to IS NULL OR g.valid_to > now())
     )
`

export const resolveOperationalSpaceUngrantedSeverity = (count: number): ReliabilitySignal['severity'] => {
  if (count === 0) return 'ok'
  if (count <= 3) return 'warning'

  return 'error'
}

const resolveSummary = (count: number) =>
  count === 0
    ? 'Toda persona activa de un cliente con varios Spaces tiene al menos una cuenta operativa otorgada.'
    : `${count} ${count === 1 ? 'persona activa no tiene' : 'personas activas no tienen'} ninguna cuenta operativa en un cliente con varios Spaces: no pueden operar ninguno hasta recibir un grant.`

export const getOperationalSpaceUngrantedUsersSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const table = await query<{ exists: boolean }>(
      `SELECT to_regclass('greenhouse_core.space_access_grants') IS NOT NULL AS exists`
    )

    if (!table[0]?.exists) {
      return {
        ...SIGNAL_BASE,
        severity: 'not_configured',
        summary: 'La tabla de cuentas operativas por Space todavía no existe en esta base.',
        observedAt,
        evidence: [{ kind: 'doc', label: 'Migración', value: 'migrations/20261106230745107_task-2096-space-access-grants.sql' }]
      }
    }

    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      ...SIGNAL_BASE,
      severity: resolveOperationalSpaceUngrantedSeverity(count),
      summary: resolveSummary(count),
      observedAt,
      evidence: [
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'doc', label: 'Contrato', value: 'docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'reliability_signal_operational_space_ungranted_users' } })

    return {
      ...SIGNAL_BASE,
      severity: 'unknown',
      summary: 'No fue posible leer la señal. Revisa los logs.',
      observedAt,
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
