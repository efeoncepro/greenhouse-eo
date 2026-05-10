import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { listRecentReleasesPaginated } from '@/lib/release/list-recent-releases-paginated'
import { getServerAuthSession } from '@/lib/auth'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * TASK-854 Slice 1 — GET /api/admin/releases para cursor pagination del
 * dashboard /admin/releases. Auth via `platform.release.execute` capability
 * (read-equivalent V1).
 *
 * Query params:
 *   - cursor: ISO timestamp (started_at del último row recibido)
 *   - pageSize: número máximo de filas (default 30, max 100)
 *   - targetBranch: default 'main'
 */
export const dynamic = 'force-dynamic'

export const GET = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const tenant = await getTenantContext()

    if (!tenant) {
      return NextResponse.json({ error: 'Sin contexto de tenant' }, { status: 403 })
    }

    const subject = buildTenantEntitlementSubject(tenant)

    if (!can(subject, 'platform.release.execute', 'execute', 'all')) {
      return NextResponse.json({ error: 'Sin capability requerida' }, { status: 403 })
    }

    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor')
    const pageSizeRaw = url.searchParams.get('pageSize')
    const targetBranch = url.searchParams.get('targetBranch') ?? 'main'

    const pageSize = pageSizeRaw ? Math.max(1, Math.min(100, Number(pageSizeRaw))) : 30

    const result = await listRecentReleasesPaginated({
      targetBranch,
      cursor: cursor ?? undefined,
      pageSize
    })

    return NextResponse.json({
      releases: result.releases,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    })
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'admin_releases_list', stage: 'api_get' }
    })

    return NextResponse.json(
      { error: 'No fue posible listar releases', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
