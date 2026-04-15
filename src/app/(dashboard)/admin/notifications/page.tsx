import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import { getAdminNotificationsOverview } from '@/lib/admin/get-admin-notifications-overview'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AdminNotificationsView from '@/views/greenhouse/admin/AdminNotificationsView'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Notificaciones — Admin Center'
}

export default async function AdminNotificationsPage() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.notifications',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const data = await getAdminNotificationsOverview()

  return <AdminNotificationsView data={data} />
}
