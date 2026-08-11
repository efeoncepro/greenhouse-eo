import { redirect } from 'next/navigation'

import type { ChildrenType } from '@core/types'

import { verifyCapabilityModuleAccess } from '@/lib/capabilities/verify-module-access'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export default async function Layout({ children, params }: ChildrenType & { params: Promise<{ moduleId: string }> }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType !== 'client' || !tenant.routeGroups.includes('client')) {
    redirect('/401')
  }

  // client-portal-visibility-allowed: `cliente.modulos` no gatea una superficie vendida —
  // gatea el bloque LEGACY de capability modules, que se deriva de
  // `session.user.businessLines`/`serviceModules` (ver `verifyCapabilityModuleAccess` abajo),
  // no de `module_assignments`. Migrarlo al primitive exige antes migrar ese carril entero:
  // es el follow-up `capability-modules-resolver-migration`, declarado en TASK-827 §Follow-ups
  // y confirmado fuera de alcance en TASK-1685 §Out of Scope. Cambiarlo acá sin migrar el
  // carril dejaría a estos módulos sin puerta.
  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'cliente.modulos',
    fallback: tenant.routeGroups.includes('client')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  const { moduleId } = await params

  if (!verifyCapabilityModuleAccess(moduleId, tenant)) {
    redirect('/home')
  }

  return children
}
