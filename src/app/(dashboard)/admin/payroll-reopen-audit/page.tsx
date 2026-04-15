import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { ROLE_CODES } from '@/config/role-codes'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import PayrollReopenAuditView from '@/views/greenhouse/admin/PayrollReopenAuditView'

// TASK-412 — admin surface for the payroll period reopen audit trail.
// Admin-only (efeonce_admin). The view fetches the audit rows client-side
// via `/api/admin/payroll/reopen-audit` so filters stay interactive.

export const metadata: Metadata = { title: 'Auditoría de reaperturas | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) {
    redirect('/login')
  }

  const isAdmin = tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)
  const hasAdminRouteGroup = tenant.routeGroups.includes('admin')

  if (!isAdmin || !hasAdminRouteGroup) {
    redirect(tenant.portalHomePath)
  }

  return <PayrollReopenAuditView />
}
