import { NextResponse } from 'next/server'

import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { getServerAuthSession } from '@/lib/auth'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import {
  listPendingIntakeMembers,
  type WorkforceIntakeStatusFilter
} from '@/lib/workforce/intake-queue/list-pending-members'

import type { WorkforceIntakeStatus } from '@/types/people'

/**
 * TASK-873 Slice 4 — GET /api/admin/workforce/activation.
 *
 * Cursor-paginated listing de members con `workforce_intake_status != 'completed'`.
 * Consumido por `WorkforceActivationView` en `/admin/workforce/activation`.
 *
 * Auth: `workforce.member.complete_intake` capability (granted en runtime.ts
 * por Slice 1 a hr ∪ EFEONCE_ADMIN ∪ FINANCE_ADMIN).
 *
 * Query params:
 *   - cursor: JSON `{createdAt, memberId}` (URL-encoded)
 *   - pageSize: número máximo de filas (default 50, max 200)
 *   - statusFilter: 'pending_intake' | 'in_review' | 'all' (default 'all')
 *
 * Response shape:
 *   { items, nextCursor, hasMore, totalApprox }
 *
 * Mirror canónico de TASK-854 /api/admin/releases pattern.
 *
 * Forward-compat TASK-874: items[] expone slots opcionales `readinessStatus?`,
 * `blockerCount?`, `topBlockerLane?` que el resolver de readiness va a populate.
 */

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

    if (!can(subject, 'workforce.member.complete_intake', 'update', 'tenant')) {
      return NextResponse.json({ error: 'Sin capability requerida' }, { status: 403 })
    }

    const url = new URL(request.url)
    const cursor = parseCursor(url.searchParams.get('cursor'))
    const statusFilter = parseStatusFilter(url.searchParams.get('statusFilter'))
    const pageSizeRaw = url.searchParams.get('pageSize')
    const pageSize = pageSizeRaw ? Math.max(1, Math.min(200, Number(pageSizeRaw))) : 50

    const result = await listPendingIntakeMembers({
      cursor,
      pageSize,
      statusFilter
    })

    return NextResponse.json({
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      totalApprox: result.totalApprox
    } satisfies {
      items: ReadonlyArray<{ workforceIntakeStatus: WorkforceIntakeStatus }>
      nextCursor: { createdAt: string; memberId: string } | null
      hasMore: boolean
      totalApprox: number | null
    })
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'admin_workforce_intake_queue', stage: 'api_get' }
    })

    return NextResponse.json(
      { error: 'No fue posible listar fichas pendientes', detail: redactErrorForResponse(error) },
      { status: 500 }
    )
  }
}
