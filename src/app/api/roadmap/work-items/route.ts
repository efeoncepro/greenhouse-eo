import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  getWorkItemIndex,
  isWorkItemHealthLevel,
  isWorkItemKind,
  isWorkItemLifecycle
} from '@/lib/roadmap/work-item-index/reader'
import type { WorkItemFilters, WorkItemReadiness } from '@/lib/roadmap/work-item-index/types'
import { WORK_ITEM_READINESS_STATES } from '@/lib/roadmap/work-item-index/types'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1152 — `GET /api/roadmap/work-items`
 *
 * Reader read-only del backlog operativo repo-native (epics/tasks/mini-tasks/
 * issues) como `roadmap-work-item-index.v1`. El Markdown sigue siendo SSOT; este
 * endpoint NUNCA muta archivos, lifecycle ni Markdown.
 *
 * Auth (dual-gate, defense in depth):
 * - `requireInternalTenantContext` (route_group=internal) — clientes excluidos.
 * - `can(tenant, 'roadmap.work_items.read', 'read', 'tenant')` — capability
 *   granular (grant: internal ∪ admin). Los `client_*` no la tienen por
 *   construcción del grant → 403.
 *
 * Query params (todos opcionales, AND): `kind`, `lifecycle`, `domain`,
 * `executionProfile`, `uiImpact`, `backendImpact`, `blocked`, `health`,
 * `readiness`, `parentEpic`, `search`, `page`, `pageSize`.
 *
 * Errores sanitizados (sin rutas absolutas, sin stack traces). Parse failures
 * agregados van a Sentry con dominio `roadmap`.
 */

export const dynamic = 'force-dynamic'

const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === null) return undefined
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false

  return undefined
}

const isWorkItemReadiness = (value: string): value is WorkItemReadiness =>
  (WORK_ITEM_READINESS_STATES as readonly string[]).includes(value)

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) {
    return errorResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, 'roadmap.work_items.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'roadmap.work_items.read' }
    })
  }

  try {
    const { searchParams } = new URL(request.url)

    const filters: WorkItemFilters = {}

    const kind = searchParams.get('kind')

    if (kind && isWorkItemKind(kind)) filters.kind = kind

    const lifecycle = searchParams.get('lifecycle')

    if (lifecycle && isWorkItemLifecycle(lifecycle)) filters.lifecycle = lifecycle

    const health = searchParams.get('health')

    if (health && isWorkItemHealthLevel(health)) filters.health = health

    const readiness = searchParams.get('readiness')

    if (readiness && isWorkItemReadiness(readiness)) filters.readiness = readiness

    const domain = searchParams.get('domain')

    if (domain) filters.domain = domain

    const executionProfile = searchParams.get('executionProfile')

    if (executionProfile) filters.executionProfile = executionProfile

    const uiImpact = searchParams.get('uiImpact')

    if (uiImpact) filters.uiImpact = uiImpact

    const backendImpact = searchParams.get('backendImpact')

    if (backendImpact) filters.backendImpact = backendImpact

    const parentEpic = searchParams.get('parentEpic')

    if (parentEpic) filters.parentEpic = parentEpic

    const search = searchParams.get('search')

    if (search) filters.search = search

    const blocked = parseBoolean(searchParams.get('blocked'))

    if (typeof blocked === 'boolean') filters.blocked = blocked

    const pageRaw = Number(searchParams.get('page'))
    const pageSizeRaw = Number(searchParams.get('pageSize'))

    const result = await getWorkItemIndex(filters, {
      page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : undefined,
      pageSize: Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? pageSizeRaw : undefined
    })

    return NextResponse.json(result)
  } catch (error) {
    captureWithDomain(error, 'roadmap', { tags: { source: 'work_items_index_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
