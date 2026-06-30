import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import GrowthFormsRendererPreviewView from '@views/greenhouse/admin/design-system/growth-forms-renderer/GrowthFormsRendererPreviewView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Growth Forms renderer — Design System | Greenhouse'
}

// Preview interno del renderer portable Growth Forms (TASK-1231). INTERNAL ONLY — los clientes nunca lo ven.
// Mirrors the `/design-system` guard y mantiene el preview bajo el entrypoint del Design System.
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

  return <GrowthFormsRendererPreviewView />
}
