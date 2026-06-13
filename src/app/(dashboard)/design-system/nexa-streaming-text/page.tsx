import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import NexaStreamingTextLabView from '@views/greenhouse/admin/design-system/nexa-streaming-text/NexaStreamingTextLabView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nexa Streaming Text — Design System | Greenhouse'
}

// Internal NexaStreamingText reference. INTERNAL ONLY — clients must never see this.
// Mirrors the `/design-system` guard and keeps the lab under the DS entrypoint.
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
    viewCode: 'plataforma.design_system',
    fallback: tenant.tenantType === 'efeonce_internal'
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <NexaStreamingTextLabView />
}
