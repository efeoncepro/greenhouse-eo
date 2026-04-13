import { redirect } from 'next/navigation'

import type { Metadata } from 'next'

import { getDb } from '@/lib/db'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import ScimTenantMappingsView from '@/views/greenhouse/admin/ScimTenantMappingsView'

export const metadata: Metadata = { title: 'SCIM Tenant Mappings | Admin Center | Greenhouse' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  if (!tenant.routeGroups.includes('admin')) {
    redirect(tenant.portalHomePath)
  }

  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.scim_tenant_mappings')
    .selectAll()
    .orderBy('tenant_name', 'asc')
    .execute()

  const mappings = rows.map(r => ({
    ...r,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)
  }))

  return <ScimTenantMappingsView mappings={mappings} />
}
