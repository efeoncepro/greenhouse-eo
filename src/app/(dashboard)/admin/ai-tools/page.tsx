import { redirect } from 'next/navigation'

import AiToolingDashboard from '@views/greenhouse/ai-tools/AiToolingDashboard'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'

const AiToolsPage = async () => {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess = hasAuthorizedViewCode({
    tenant,
    viewCode: 'ia.herramientas',
    fallback: tenant.routeGroups.includes('admin') || tenant.routeGroups.includes('ai_tooling')
  })

  if (!hasAccess) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  return <AiToolingDashboard />
}

export default AiToolsPage
