import { redirect } from 'next/navigation'

import type { Metadata } from 'next'


import AdminOperationalCalendarView from '@/views/greenhouse/admin/AdminOperationalCalendarView'
import { getAdminOperationalCalendarOverview } from '@/lib/calendar/get-admin-operational-calendar-overview'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Calendario operativo | Admin Center | Greenhouse'
}

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.calendario_operativo',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath)
  }

  const resolvedSearchParams = await searchParams
  const data = await getAdminOperationalCalendarOverview(resolvedSearchParams.month)

  return <AdminOperationalCalendarView data={data} />
}
