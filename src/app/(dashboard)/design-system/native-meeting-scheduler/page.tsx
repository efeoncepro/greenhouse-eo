import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import NativeMeetingSchedulerPreviewView from '@views/greenhouse/admin/design-system/native-meeting-scheduler/NativeMeetingSchedulerPreviewView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Native meeting scheduler — Design System | Greenhouse',
}

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')
  if (tenant.tenantType === 'client') redirect('/401')

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'plataforma.design_system',
    fallback: tenant.tenantType === 'efeonce_internal',
  })

  if (!hasAccess) redirect('/401')

  return <NativeMeetingSchedulerPreviewView />
}
