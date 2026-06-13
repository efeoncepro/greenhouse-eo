import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import KnowledgeCenterView from '@/views/greenhouse/knowledge/KnowledgeCenterView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { isKnowledgeCanvasLensEnabled } from '@/lib/knowledge/nexa/canvas-lens-flag'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Knowledge | Greenhouse'
}

export default async function KnowledgePage() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'plataforma.knowledge',
    fallback: tenant.routeGroups.includes('internal') || tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) {
    redirect('/401')
  }

  return <KnowledgeCenterView canvasLensEnabled={isKnowledgeCanvasLensEnabled()} />
}
