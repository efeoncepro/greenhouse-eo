import 'server-only'

/**
 * TASK-1921 — sujeto máquina del Ecosystem lane del render de marca (`/api/platform/ecosystem/brand-render/**`,
 * consumido por el gateway MCP). Compartido por el módulo de lectura y el de commands; no importa el command (ISSUE-177:
 * una ruta GET no carga sharp ni los mappers).
 *
 * Sólo un binding `internal` (operador máquina: gateway o Nexa interna) pide o lee piezas de marca: hoy la única marca es
 * la de Efeonce, y un binding de organización cliente no tiene nada que hacer acá (403, como en el App lane). El sujeto
 * es el rol que tiene la capability por diseño (DESIGNER, el de menor privilegio que la tiene), nunca un admin.
 */

import type { ApiPlatformRequestContext } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { ROLE_CODES } from '@/config/role-codes'

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const resolveBrandRenderEcosystemSubject = (context: ApiPlatformRequestContext): TenantEntitlementSubject => {
  if (context.binding.organizationId || context.binding.greenhouseScopeType !== 'internal') {
    throw new ApiPlatformError('Brand render is not allowed for the resolved binding scope.', { statusCode: 403, errorCode: 'scope_not_allowed' })
  }

  return {
    userId: `consumer:${context.consumer.publicId}`,
    tenantType: 'efeonce_internal',
    roleCodes: [ROLE_CODES.DESIGNER],
    primaryRoleCode: ROLE_CODES.DESIGNER,
    routeGroups: ['internal'],
    authorizedViews: []
  }
}
