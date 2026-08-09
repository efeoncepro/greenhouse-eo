import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1678 Slice 4 — Reliability signal: roles cliente sin ninguna vista otorgada.
 *
 * **Por qué esta señal y no "claim degradado".** El claim `authorizedViews` se deriva
 * en login y NO se persiste: ninguna query lo puede contar, así que una señal DB de
 * "claims degradados" mentiría. Los dos concerns se reparten:
 *
 *   - el **evento runtime** (la derivación falló y la sesión quedó con claim vacío) va
 *     a Sentry vía `captureWithDomain(error, 'identity', …)` desde el catch de
 *     `resolveTenantRuntimeAccess` (`src/lib/tenant/access.ts`);
 *   - esta señal mide la **precondición estructural** que hace que un claim vacío sea
 *     inevitable en vez de accidental.
 *
 * Es la misma postura de `client_portal.composition.resolver_failure_rate`, que declara
 * explícitamente que la tasa runtime vive en un adapter de telemetría y la señal DB
 * conserva la forma canónica.
 *
 * **Qué mide.** Desde TASK-1678 Slice 2 el carril rol→vista falla hacia cerrado para el
 * routeGroup `client`: sin fila `granted=TRUE` en `role_view_assignments` no hay acceso.
 * Eso vuelve al seed load-bearing. Un rol cliente con cero grants explícitos ya no
 * degrada a "ve todo su routeGroup" — degrada a **no ve nada**, y sus usuarios quedan
 * con un portal vacío sin error visible.
 *
 * **Steady state: 0.** Verificado contra PG el 2026-08-09 — la query devuelve 0 filas:
 * `client_executive` 22 grants, `client_manager` 22, `client_specialist` 19. Cualquier
 * valor > 0 significa que un rol cliente existe sin seed — típicamente porque alguien
 * agregó un cuarto rol `client_*` y su migración de seed no acompañó al mismo PR.
 *
 * **Kind**: `data_quality`. **Severidad**: 0 → `ok`; cualquier rol sin grants → `error`.
 * No hay banda intermedia a propósito: un rol cliente sin grants no es un estado
 * transitorio tolerable, es un rol que no puede usar el portal.
 *
 * **Subsystem rollup**: `identity`.
 *
 * **Acción de remediación**:
 *   1. Identificar el rol reportado en la evidencia.
 *   2. Decidir qué vistas cliente le corresponden (contrato comercial, no pertenencia).
 *   3. Seedear `granted=TRUE` explícito vía migración aditiva — la tabla es append-only
 *      en la práctica: se marca, no se borra.
 *   4. Si el rol no debe usar el portal cliente, quitarle el routeGroup `client` en
 *      `ROLE_ROUTE_GROUPS` en vez de dejarlo sin grants.
 */
export const CLIENT_ROLE_WITHOUT_VIEW_GRANTS_SIGNAL_ID = 'identity.view_access.client_role_without_grants'

/**
 * Los roles cliente salen de `greenhouse_core.roles` por su `tenant_type`, no de una
 * lista literal: así un rol `client_*` nuevo entra a la señal sin tocar este archivo.
 *
 * Se discrimina por `tenant_type = 'client'` y NO por `'client' = ANY(route_group_scope)`:
 * el scope es un conjunto y roles internos pueden legítimamente incluir `client` (un
 * admin que da soporte), así que ese predicado los arrastraría a una señal que no habla
 * de ellos. Verificado contra PG el 2026-08-09: `tenant_type='client'` devuelve
 * exactamente los 3 roles cliente.
 *
 * Ojo con el schema real: `greenhouse_core.roles` **no tiene columna `active`**
 * (verificado contra `information_schema`). No agregar un predicado de vigencia acá sin
 * comprobar primero que la columna exista.
 */
const QUERY_SQL = `
  SELECT
    r.role_code,
    COUNT(rva.view_code) FILTER (WHERE rva.granted) AS granted_count
  FROM greenhouse_core.roles r
  LEFT JOIN greenhouse_core.role_view_assignments rva
    ON rva.role_code = r.role_code
  WHERE r.tenant_type = 'client'
  GROUP BY r.role_code
  HAVING COUNT(rva.view_code) FILTER (WHERE rva.granted) = 0
  ORDER BY r.role_code
`

const resolveSummary = (roleCodes: string[]): string => {
  if (roleCodes.length === 0) {
    return 'Todos los roles cliente activos tienen al menos una vista otorgada explícitamente.'
  }

  const noun = roleCodes.length === 1 ? 'rol cliente activo' : 'roles cliente activos'

  return `${roleCodes.length} ${noun} sin ninguna vista otorgada (${roleCodes.join(', ')}). Desde TASK-1678 el carril cliente falla hacia cerrado, así que sus usuarios entran a un portal vacío. Falta el seed de \`role_view_assignments\`.`
}

export const getClientRoleWithoutViewGrantsSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ role_code: string; granted_count: number }>(QUERY_SQL)
    const roleCodes = rows.map(row => row.role_code)

    return {
      signalId: CLIENT_ROLE_WITHOUT_VIEW_GRANTS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientRoleWithoutViewGrantsSignal',
      label: 'Roles cliente sin vistas otorgadas',
      severity: roleCodes.length === 0 ? 'ok' : 'error',
      summary: resolveSummary(roleCodes),
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'count',
          value: String(roleCodes.length)
        },
        {
          kind: 'metric',
          label: 'roles',
          value: roleCodes.length === 0 ? 'ninguno' : roleCodes.join(', ')
        },
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_core.roles LEFT JOIN role_view_assignments WHERE tenant_type='client' HAVING COUNT(view_code) FILTER (WHERE granted) = 0"
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-1678-authorized-views-derivation-fails-closed.md'
        },
        {
          kind: 'doc',
          label: 'Runtime del claim degradado',
          value: 'Sentry dominio identity, source=resolve_tenant_runtime_access'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_client_role_without_view_grants' }
    })

    return {
      signalId: CLIENT_ROLE_WITHOUT_VIEW_GRANTS_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getClientRoleWithoutViewGrantsSignal',
      label: 'Roles cliente sin vistas otorgadas',
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
