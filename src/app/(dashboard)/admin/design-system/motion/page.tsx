import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import MotionLabView from '@views/greenhouse/admin/design-system/MotionLabView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Motion Lab — Design System | Greenhouse'
}

// Internal motion-primitive reference (TASK-1045). INTERNAL ONLY — clients must
// never see this. Mirrors the `/admin/design-system` guard and keeps the motion
// lab as a child surface of the design-system entrypoint.
export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.design_system',
    fallback: tenant.routeGroups.includes('internal')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <MotionLabView />
}
