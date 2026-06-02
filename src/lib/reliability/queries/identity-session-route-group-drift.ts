import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-987 — Reliability signal: session route_groups que NO derivan de roles
 * ACTIVOS y vigentes (over-exposure de navegación).
 *
 * ROOT CAUSE (ISSUE-083): el view `greenhouse_serving.session_360` derivaba
 * `route_groups` SIN el predicado de lifecycle (`ura.active AND effective
 * window`) que sí aplica a `role_codes`. Resultado: un rol REVOCADO/expirado
 * seguía aportando su `roles.route_group_scope`, dándole al usuario navegación
 * más amplia que su rol activo (p.ej. una `collaborator` con `efeonce_account`
 * revocado seguía viendo Personas/Comercial vía `internal`+`commercial`).
 *
 * Este signal es el detector de defensa-en-profundidad: cuenta usuarios cuyo
 * `route_groups` efectivo ⊋ la derivación canónica desde roles ACTIVOS. Tras el
 * fix del view debe ser 0; cualquier > 0 indica regresión (alguien re-rompió el
 * FILTER, o un consumer alternativo derivó route_groups sin honrar lifecycle).
 *
 * Steady state esperado = 0.
 *
 * **Kind**: `drift` (divergencia entre el contrato de acceso y el dataset).
 * **Severidad**: `error` cuando count > 0 (over-exposure de acceso, no cosmético).
 *
 * Pattern reference: TASK-613 `finance-client-profile-unlinked.ts`,
 * TASK-877 `identity-notion-bridge-coverage.ts`.
 */
export const IDENTITY_SESSION_ROUTE_GROUP_DRIFT_SIGNAL_ID =
  'identity.session.route_group_drift'

// Compara, por usuario, el `route_groups` del view contra la derivación
// canónica desde SOLO sus role assignments activos y vigentes. `<@` = "está
// contenido en"; si NO está contenido, hay un route group que no proviene de
// ningún rol activo → fuga. La sub-derivación replica exactamente el predicado
// de lifecycle que el view aplica a `role_codes`.
const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_serving.session_360 s
  LEFT JOIN LATERAL (
    SELECT COALESCE(array_agg(DISTINCT rg.rg) FILTER (WHERE rg.rg IS NOT NULL), ARRAY[]::text[]) AS active_groups
    FROM greenhouse_core.user_role_assignments ura
    JOIN greenhouse_core.roles r ON r.role_code = ura.role_code
    LEFT JOIN LATERAL unnest(r.route_group_scope) rg(rg) ON true
    WHERE ura.user_id = s.user_id
      AND ura.active AND (ura.effective_to IS NULL OR ura.effective_to > CURRENT_TIMESTAMP)
  ) a ON true
  WHERE NOT (s.route_groups <@ COALESCE(a.active_groups, ARRAY[]::text[]))
`

export const getIdentitySessionRouteGroupDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_SESSION_ROUTE_GROUP_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentitySessionRouteGroupDriftSignal',
      label: 'Route groups de sesión que no derivan de roles activos',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Todo route_group de sesión deriva de un rol activo y vigente. Sin over-exposure por roles revocados.'
          : `${count} usuario${count === 1 ? '' : 's'} con route_groups que NO derivan de ningún rol activo (over-exposure por roles revocados/expirados). Revisa el FILTER de lifecycle en session_360 o el path que derivó route_groups.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: QUERY_SQL.trim()
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/issues/resolved/ISSUE-083-session-route-groups-leak-from-revoked-roles.md + docs/tasks/complete/TASK-987-session-route-groups-lifecycle-fix.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_identity_session_route_group_drift' }
    })

    return {
      signalId: IDENTITY_SESSION_ROUTE_GROUP_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentitySessionRouteGroupDriftSignal',
      label: 'Route groups de sesión que no derivan de roles activos',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
