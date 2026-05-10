import { redirect } from 'next/navigation'

import AdminReleasesView from '@/views/greenhouse/admin/releases/AdminReleasesView'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { listRecentReleasesPaginated } from '@/lib/release/list-recent-releases-paginated'
import { getReleaseLastStatusSignal } from '@/lib/reliability/queries/release-last-status'
import { requireServerSession } from '@/lib/auth/require-server-session'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-854 Slice 1 — /admin/releases dashboard.
 *
 * Server page que renderiza el histórico de releases producción para
 * EFEONCE_ADMIN + DEVOPS_OPERATOR. Lectura inicial server-side (SSR-friendly,
 * initial paint rápido) + handoff al view client para drawer + pagination.
 */

export const dynamic = 'force-dynamic'

const Page = async () => {
  await requireServerSession()
  const tenant = await getTenantContext()

  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)

  // Capability `platform.release.execute` se reusa como read-equivalent V1
  // (ver TASK-854 spec). En V1.2 emergerá `platform.release.read_results`
  // granular si el dashboard expone superficies adicionales.
  if (!can(subject, 'platform.release.execute', 'execute', 'all')) {
    redirect(tenant.portalHomePath || '/dashboard')
  }

  // Initial page fetch + last status signal en paralelo.
  const [initialPage, lastStatusSignal] = await Promise.all([
    listRecentReleasesPaginated({ targetBranch: 'main' }).catch(() => ({
      releases: [],
      nextCursor: null,
      hasMore: false
    })),
    getReleaseLastStatusSignal().catch(() => null)
  ])

  return (
    <AdminReleasesView
      initialReleases={[...initialPage.releases]}
      initialCursor={initialPage.nextCursor}
      initialHasMore={initialPage.hasMore}
      lastStatusSignal={lastStatusSignal}
    />
  )
}

export default Page
