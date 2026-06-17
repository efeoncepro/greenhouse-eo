import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { getWorkItemMarkdownById } from '@/lib/roadmap/work-item-index/reader'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1153 (follow-up) — `GET /api/roadmap/work-items/[id]`
 *
 * Devuelve el Markdown crudo de un work item del backlog (epic/task/mini-task/
 * issue) para renderizarlo in-context en el cockpit ("Abrir task"). El Markdown
 * sigue siendo SSOT; este endpoint es read-only y NUNCA muta archivos.
 *
 * Auth (dual-gate, igual que el índice): `requireInternalTenantContext`
 * (clientes excluidos) + `can(tenant, 'roadmap.work_items.read', ...)`.
 *
 * Anti-oracle: id inexistente o archivo no legible → 404 `roadmap_work_item_not_found`
 * (nunca filtra existencia ni rutas absolutas). El reader resuelve el path desde
 * el índice del filesystem; el `id` del cliente solo hace un `find` exacto.
 */

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const { id } = await params
    const item = await getWorkItemMarkdownById(id)

    if (!item) {
      return canonicalErrorResponse('roadmap_work_item_not_found')
    }

    return NextResponse.json(item)
  } catch (error) {
    captureWithDomain(error, 'roadmap', { tags: { source: 'work_item_markdown_route' } })

    return canonicalErrorResponse('internal_error', { statusOverride: 502 })
  }
}
