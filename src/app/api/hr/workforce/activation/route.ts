import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'
import {
  listPendingIntakeMembers,
  searchWorkforceActivationMembers,
  type WorkforceIntakeStatusFilter
} from '@/lib/workforce/intake-queue/list-pending-members'

export const dynamic = 'force-dynamic'

const VALID_STATUS_FILTERS: ReadonlySet<WorkforceIntakeStatusFilter> = new Set<WorkforceIntakeStatusFilter>([
  'all',
  'pending_intake',
  'in_review'
])

const parseStatusFilter = (raw: string | null): WorkforceIntakeStatusFilter => {
  if (raw && VALID_STATUS_FILTERS.has(raw as WorkforceIntakeStatusFilter)) {
    return raw as WorkforceIntakeStatusFilter
  }

  return 'all'
}

const parseCursor = (raw: string | null): { createdAt: string; memberId: string } | null => {
  if (!raw) return null

  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as { createdAt?: unknown; memberId?: unknown }

    if (typeof decoded.createdAt === 'string' && typeof decoded.memberId === 'string') {
      return { createdAt: decoded.createdAt, memberId: decoded.memberId }
    }
  } catch {
    return null
  }

  return null
}

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

    if (!can(subject, 'workforce.member.activation_readiness.read', 'read', 'tenant')) {
      return NextResponse.json({ error: 'Sin capability requerida' }, { status: 403 })
    }

    const url = new URL(request.url)
    const cursor = parseCursor(url.searchParams.get('cursor'))
    const statusFilter = parseStatusFilter(url.searchParams.get('statusFilter'))
    const search = url.searchParams.get('q')?.trim() ?? ''
    const pageSizeRaw = url.searchParams.get('pageSize')
    const pageSize = pageSizeRaw ? Math.max(1, Math.min(200, Number(pageSizeRaw))) : 50

    if (search.length >= 2) {
      const items = await searchWorkforceActivationMembers({
        query: search,
        limit: Math.min(pageSize, 20),
        includeReadiness: true
      })

      return NextResponse.json({
        items,
        nextCursor: null,
        hasMore: false,
        totalApprox: items.length
      })
    }

    const result = await listPendingIntakeMembers({
      cursor,
      pageSize,
      statusFilter,
      includeReadiness: true
    })

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'hr_workforce_activation_queue', stage: 'api_get' }
    })

    return NextResponse.json(
      { error: 'No fue posible listar activaciones workforce', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
