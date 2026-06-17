import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import NexaAnswersExperienceView from '@views/greenhouse/admin/design-system/nexa-answers-experience/NexaAnswersExperienceView'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nexa Answers Experience — Design System | Greenhouse'
}

// "Nexa Answers Experience" — la primera page del Design System que agrega el flujo conversacional completo
// (TASK-1110 Slice B): la respuesta lidera y SE ARMA (chart draw + número que cuenta), portabilidad cross-dominio,
// y la composición in-place con host (NexaMomentComposition, GAP A). INTERNAL ONLY — los clientes nunca la ven;
// espeja el guard de `/design-system`.
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

  return <NexaAnswersExperienceView />
}
