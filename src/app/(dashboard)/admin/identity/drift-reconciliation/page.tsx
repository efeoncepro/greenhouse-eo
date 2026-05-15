import { redirect } from 'next/navigation'

import DriftReconciliationView from '@/views/greenhouse/admin/identity/drift-reconciliation/DriftReconciliationView'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-891 Slice 4 — /admin/identity/drift-reconciliation surface.
 *
 * Server page que renderiza el form auditado de reconciliacion Person 360
 * para EFEONCE_ADMIN. Operador llega via deep link desde el reliability
 * signal `identity.relationship.member_contract_drift` en /admin/operations.
 *
 * Query params:
 *   - `memberId` (opcional, pre-fill del form si presente)
 *
 * Spec: docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md §6
 */

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ memberId?: string }>
}

const Page = async ({ searchParams }: PageProps) => {
  await requireServerSession()
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  // Capability granular: EFEONCE_ADMIN solo V1.0 (drift Person 360 es cross-domain).
  if (!can(subject, 'person.legal_entity_relationships.reconcile_drift', 'update', 'tenant')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  const params = await searchParams
  const prefilledMemberId = typeof params.memberId === 'string' ? params.memberId.trim() : ''

  return <DriftReconciliationView prefilledMemberId={prefilledMemberId} />
}

export default Page
