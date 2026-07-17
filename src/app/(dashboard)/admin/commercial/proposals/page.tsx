import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { listProposalStudioOrgs } from '@/lib/commercial/tenders/proposals/org-resolution'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import ProposalStudioView from '@/views/greenhouse/commercial/proposals/ProposalStudioView'

/**
 * TASK-1413 — Proposal Studio: ventana operador de propuestas (lista + versiones + descarga).
 *
 * Guard de doble puerta: viewCode `administracion.commercial_proposals` (surface visible, seed
 * TASK-1413) + capability `commercial.proposal.read` (autoridad fina, granteada a
 * EFEONCE_ADMIN ∪ EFEONCE_ACCOUNT). La org dueña se DERIVA del entitlement per-ORG
 * `proposal_studio_v1` server-side — la UI nunca inventa un ownerOrgId.
 */

export const metadata: Metadata = { title: 'Propuestas | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.commercial_proposals'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  if (tenant.tenantType === 'client') {
    redirect('/401')
  }

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('admin')
    }) && can(tenant, 'commercial.proposal.read', 'read', 'tenant')

  if (!hasAccess) {
    redirect('/401')
  }

  const orgs = await listProposalStudioOrgs()

  return <ProposalStudioView ownerOrgId={orgs[0]?.organizationId ?? null} />
}
