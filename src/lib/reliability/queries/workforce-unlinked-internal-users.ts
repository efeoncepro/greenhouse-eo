import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * Canonical API error contract — Identity UX hardening (2026-05-14, complementario a TASK-878 session-member-identity-self-heal).
 *
 * Detecta internal users activos (`tenant_type='efeonce_internal' AND active=TRUE`)
 * cuyo `client_users` row no resuelve a un `members.member_id` (member_id IS NULL
 * en la VIEW `greenhouse_serving.session_360`).
 *
 * Cuando emerge un row aquí:
 *  - El usuario se loguea OK pero todos los endpoints `/api/my/*` retornan 422
 *    `member_identity_not_linked` (vía `requireMyTenantContext`).
 *  - UX: el usuario ve banners "Tu cuenta aún no está enlazada a un colaborador"
 *    en todas las vistas /my (post 2026-05-14 contract canónico — pre era
 *    "Member identity not linked" raw inglés, violando microcopy es-CL).
 *  - Root cause: usuario interno nuevo entró antes de que TASK-877
 *    (workforce external identity reconciliation) lo enlazara a su member row,
 *    o el bridge SCIM creó el `client_users` sin `members.member_id`
 *    (workforce_intake_status pendiente).
 *
 * **Steady state**: 0 post-TASK-877 reconciliación completa. Cualquier valor > 0
 * indica que un usuario interno está bloqueado de las vistas /my hasta que HR
 * lo active vía workforce intake o la reconciliación.
 *
 * **Kind**: `data_quality`. **Severidad**:
 *   - 0 → `ok`
 *   - 1-3 → `warning` (puede ser un usuario nuevo en onboarding normal)
 *   - >3 → `error` (más allá del flujo natural → drift sistémico)
 *
 * **Subsystem rollup**: `identity` (alineado con TASK-742 7-layer auth reliability).
 *
 * **Acción remediación**:
 *   1. Identificar el usuario afectado: query manual el row.
 *   2. Verificar si tiene member row real en `greenhouse_core.members` (vía email
 *      / microsoft_oid / identity_profile).
 *   3. Si existe member: link manual o re-correr workforce intake (TASK-877).
 *   4. Si no existe member: HR debe crear la ficha y ejecutar el
 *      `workforce.member.complete_intake` endpoint (TASK-872 Slice 5).
 */
export const WORKFORCE_UNLINKED_INTERNAL_USERS_SIGNAL_ID =
  'identity.workforce.unlinked_internal_user'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_serving.session_360
  WHERE tenant_type = 'efeonce_internal'
    AND active = TRUE
    AND status = 'active'
    AND member_id IS NULL
`

const resolveSeverity = (count: number): ReliabilitySignal['severity'] => {
  if (count === 0) return 'ok'

  if (count <= 3) return 'warning'

  return 'error'
}

const resolveSummary = (count: number): string => {
  if (count === 0) {
    return 'Todos los usuarios internos activos tienen identity de colaborador enlazada.'
  }

  const noun = count === 1 ? 'usuario interno activo' : 'usuarios internos activos'
  const verb = count === 1 ? 'está' : 'están'
  const target = count === 1 ? 'sus vistas personales' : 'sus vistas personales'

  return `${count} ${noun} sin member_id. ${verb.charAt(0).toUpperCase() + verb.slice(1)} bloqueado(s) de ${target} (/api/my/*) hasta que HR los active vía workforce intake (TASK-877).`
}

export const getWorkforceUnlinkedInternalUsersSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: WORKFORCE_UNLINKED_INTERNAL_USERS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getWorkforceUnlinkedInternalUsersSignal',
      label: 'Usuarios internos sin member enlazado',
      severity: resolveSeverity(count),
      summary: resolveSummary(count),
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: `greenhouse_serving.session_360 WHERE tenant_type='efeonce_internal' AND active=TRUE AND status='active' AND member_id IS NULL`
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-877-workforce-external-identity-reconciliation.md'
        },
        {
          kind: 'doc',
          label: 'Contract',
          value: 'src/lib/api/canonical-error-response.ts (code=member_identity_not_linked)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_workforce_unlinked_internal_users' }
    })

    return {
      signalId: WORKFORCE_UNLINKED_INTERNAL_USERS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getWorkforceUnlinkedInternalUsersSignal',
      label: 'Usuarios internos sin member enlazado',
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
