import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { SEO_MODULE_KEY } from '../entitlement'
import { isSeoModuleEnabled } from '../flags'

/**
 * TASK-1306 — Spaces elegibles del cockpit Overview SEO.
 *
 * Plumbing de SUPERFICIE, no contrato de negocio: resuelve qué organizaciones puede
 * elegir el operador en el Space picker. La autoridad fina sigue siendo la misma que
 * usa el resto del dominio — un `module_assignment` de `seo_v1` vigente
 * (`effective_to IS NULL AND status IN ('active','pilot')`), idéntico predicado al de
 * `listEligibleTargets` en `rank-capture-batch.ts` y al de `resolveSeoEntitlement`.
 *
 * ⚠️ El predicado de vigencia va COMPLETO o no va: un assignment cerrado
 * (`effective_to` en el pasado) NUNCA debe ofrecer el Space en el picker — sería
 * exponer una org que ya no tiene el módulo contratado.
 *
 * A diferencia del batch, acá NO se exige que la org tenga un `seo_target` creado:
 * un Space recién asignado todavía no tiene target y aun así debe poder abrirse en el
 * cockpit para ver su estado honesto de "aún no hay datos".
 */

export interface SeoSpaceOption {
  organizationId: string
  organizationName: string
  /** `true` si la org ya tiene al menos un `seo_target` activo (hay algo que medir). */
  hasActiveTarget: boolean
}

export const listSeoEligibleSpaces = async (): Promise<SeoSpaceOption[]> => {
  // Mismo gate que el resto del dominio: con el módulo apagado NO se ofrece ningún Space.
  // Sin esto, el flag apagaría los readers de negocio pero el picker seguiría poblado.
  if (!isSeoModuleEnabled()) {
    return []
  }

  const rows = await runGreenhousePostgresQuery<{
    organization_id: string
    organization_name: string | null
    has_active_target: boolean
  }>(
    `SELECT o.organization_id,
            o.organization_name,
            EXISTS (
              SELECT 1
                FROM greenhouse_growth.seo_targets t
               WHERE t.organization_id = o.organization_id
                 AND t.status = 'active'
            ) AS has_active_target
       FROM greenhouse_core.organizations o
      WHERE EXISTS (
              SELECT 1
                FROM greenhouse_client_portal.module_assignments ma
               WHERE ma.organization_id = o.organization_id
                 AND ma.module_key = $1
                 AND ma.effective_to IS NULL
                 AND ma.status IN ('active', 'pilot')
            )
      ORDER BY o.organization_name NULLS LAST, o.organization_id`,
    [SEO_MODULE_KEY]
  )

  return rows.map(row => ({
    organizationId: row.organization_id,
    // Sin nombre mostramos el id, nunca un placeholder inventado: el operador debe poder
    // identificar la fila aunque el catálogo esté incompleto.
    organizationName: row.organization_name?.trim() || row.organization_id,
    hasActiveTarget: row.has_active_target
  }))
}
