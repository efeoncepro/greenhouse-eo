import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import EmailTemplatePreviewView from '@/views/greenhouse/admin/email-preview/EmailTemplatePreviewView'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Preview de correos | Admin Center | Greenhouse'
}

export default async function EmailPreviewPage() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'administracion.email_delivery',
    fallback: tenant.routeGroups.includes('admin')
  })

  if (!hasAccess) redirect(tenant.portalHomePath)

  return <EmailTemplatePreviewView />
}
