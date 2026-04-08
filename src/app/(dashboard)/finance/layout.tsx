import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

import { hasAnyAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { ROLE_CODES } from '@/config/role-codes'

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAnyAuthorizedViewCode({
    tenant,
    viewCodes: [
      'finanzas.resumen',
      'finanzas.ingresos',
      'finanzas.egresos',
      'finanzas.conciliacion',
      'finanzas.banco',
      'finanzas.clientes',
      'finanzas.proveedores',
      'finanzas.inteligencia',
      'finanzas.asignaciones_costos',
      'finanzas.cotizaciones',
      'finanzas.ordenes_compra',
      'finanzas.hes'
    ],
    fallback: tenant.routeGroups.includes('finance') || tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return children
}
