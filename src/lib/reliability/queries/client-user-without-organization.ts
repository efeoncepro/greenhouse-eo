import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1679 Slice 1 — Reliability signal: usuarios cliente activos sin organización resuelta.
 *
 * **Va antes que el fix del guard a propósito.** Hasta TASK-1679, `requireViewCodeAccess`
 * pasaba un `clientId` donde el resolver espera un `organizationId`, así que denegaba a
 * **todos** los clientes por igual (`ISSUE-146`). Al corregir la llave, el modo de fallo
 * no desaparece: se **mueve** de "deniega a todos" a "deniega a los que no tienen la
 * columna poblada". Sin esta señal, ese segundo modo también sería mudo.
 *
 * **Por qué la columna puede estar vacía.** `greenhouse_serving.session_360` deriva la
 * organización por un puente de tres saltos:
 *
 *     client_users.client_id → spaces (client_id, active) → organizations (active)
 *
 * No hay backfill ni constraint que lo garantice: basta que un cliente no tenga `space`
 * activo, o que su space no apunte a una organización activa, para que la sesión quede sin
 * organización. Y el carril de fallback BigQuery ni siquiera selecciona la columna.
 *
 * Un usuario en ese estado se loguea bien y **no puede abrir ninguna página del portal
 * cliente**: el guard lo manda a `/home` sin poder decirle por qué, porque no hay
 * organización contra la que preguntar. Es un bloqueo total, silencioso desde el lado del
 * operador.
 *
 * **Steady state: 0.** Medido el 2026-08-09: había 1 — la propia persona agente
 * `agent-client@greenhouse.efeonce.org`, cuyo `client_id` (`agent-client-sandbox`) no
 * tenía fila en `spaces`. El Slice 2 le crea su space, así que la señal nace en 0.
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → `ok`; ≥1 → `error`. Sin banda intermedia:
 * no es un estado transitorio tolerable, es un usuario que no puede usar el portal.
 *
 * **Subsystem rollup**: `identity`.
 *
 * **Acción de remediación**:
 *   1. Identificar el usuario reportado en la evidencia.
 *   2. Verificar si su `client_id` tiene `spaces` activo: si no, el onboarding del cliente
 *      quedó incompleto (`GREENHOUSE_CLIENT_LIFECYCLE_V1`).
 *   3. Si el space existe pero su `organization_id` apunta a una organización inactiva,
 *      el problema es el lifecycle de la organización, no el usuario.
 *   4. **NUNCA** resolverlo dándole acceso por omisión: un cliente sin organización no
 *      tiene contra qué evaluar módulos contratados.
 */
export const CLIENT_USER_WITHOUT_ORGANIZATION_SIGNAL_ID = 'identity.client_portal.client_without_organization'

const QUERY_SQL = `
  SELECT email
  FROM greenhouse_serving.session_360
  WHERE tenant_type = 'client'
    AND active = TRUE
    AND status = 'active'
    AND organization_id IS NULL
  ORDER BY email
`

const resolveSummary = (emails: string[]): string => {
  if (emails.length === 0) {
    return 'Todos los usuarios cliente activos tienen su organización resuelta.'
  }

  const noun = emails.length === 1 ? 'usuario cliente activo' : 'usuarios cliente activos'
  const verb = emails.length === 1 ? 'puede' : 'pueden'

  return `${emails.length} ${noun} sin organización resuelta. No ${verb} abrir ninguna página del portal cliente: el puente client_id → spaces → organizations quedó incompleto.`
}

export const getClientUserWithoutOrganizationSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ email: string }>(QUERY_SQL)
    const emails = rows.map(row => row.email)

    return {
      signalId: CLIENT_USER_WITHOUT_ORGANIZATION_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientUserWithoutOrganizationSignal',
      label: 'Usuarios cliente sin organización resuelta',
      severity: emails.length === 0 ? 'ok' : 'error',
      summary: resolveSummary(emails),
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'count',
          value: String(emails.length)
        },
        {
          kind: 'metric',
          label: 'usuarios',
          value: emails.length === 0 ? 'ninguno' : emails.join(', ')
        },
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_serving.session_360 WHERE tenant_type='client' AND active AND status='active' AND organization_id IS NULL"
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1679-client-portal-guard-key-and-base-views.md'
        },
        {
          kind: 'doc',
          label: 'Puente de derivación',
          value: 'client_users.client_id → greenhouse_core.spaces (active) → greenhouse_core.organizations (active)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_client_user_without_organization' }
    })

    return {
      signalId: CLIENT_USER_WITHOUT_ORGANIZATION_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientUserWithoutOrganizationSignal',
      label: 'Usuarios cliente sin organización resuelta',
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
