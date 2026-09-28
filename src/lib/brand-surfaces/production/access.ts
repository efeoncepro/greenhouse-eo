import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

/**
 * TASK-1921 — descarga de fuentes y salidas del render de marca por el asset store. Capability real
 * (`brand_render.request.read`), nunca routeGroup; un actor `client_*` nunca pasa (hoy las piezas son de la marca propia
 * de Efeonce). El dueño por organización lo aplican el command y el reader del dominio.
 */
export const canAccessBrandRenderAsset = (subject: TenantEntitlementSubject): boolean => {
  if (subject.tenantType === 'client') return false

  return can(subject, 'brand_render.request.read', 'read', 'tenant')
}
