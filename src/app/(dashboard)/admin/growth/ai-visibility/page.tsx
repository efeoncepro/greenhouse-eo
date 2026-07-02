import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { can } from '@/lib/entitlements/runtime'
import { hasAuthorizedViewCode } from '@/lib/tenant/authorization'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import AdminReviewView from '@/views/greenhouse/admin/growth/ai-visibility/review/AdminReviewView'

/**
 * TASK-1247 — Admin Review UI del AEO Grader (gate humano pre-publicación, EPIC-020 F).
 *
 * Guard de doble puerta: viewCode `administracion.growth_ai_visibility` (surface visible) +
 * capability `growth.ai_visibility.report.review` acción `execute` (autoridad fina del gate;
 * granteada a EFEONCE_ADMIN ∪ AI_TOOLING_ADMIN en TASK-1244). La view runtime consume los
 * contratos gobernados client-side (freshness + refetch tras cada acción).
 */

export const metadata: Metadata = { title: 'AEO Grader — Revisión | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

const VIEW_CODE = 'administracion.growth_ai_visibility'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const hasAccess =
    hasAuthorizedViewCode({
      tenant,
      viewCode: VIEW_CODE,
      fallback: tenant.routeGroups.includes('admin')
    }) && can(tenant, 'growth.ai_visibility.report.review', 'execute', 'tenant')

  if (!hasAccess) {
    redirect('/401')
  }

  return <AdminReviewView />
}
