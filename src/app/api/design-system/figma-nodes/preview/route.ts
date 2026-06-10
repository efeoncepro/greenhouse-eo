import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getFigmaNodeRender } from '@/lib/design-system/figma-nodes/figma-render'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'
import { AXIS_FILE_KEY } from '@/components/greenhouse/primitives/GreenhouseFigmaNodeButton'

export const dynamic = 'force-dynamic'

/**
 * TASK-1072 Slice 4 — Figma node render preview.
 *
 * GET ?fileKey=&nodeId= → `{ imageUrl, nodeName, status }` para el preview del editor
 * de vínculo (render real del nodo AXIS). Mismo gate que linkear (`design_system.figma_node.link`)
 * — solo quien puede vincular previsualiza. Degrada honesto a `status:'unavailable'` cuando
 * no hay token Figma o la API falla; el editor cae al preview de identidad AXIS.
 */

const CAPABILITY = 'design_system.figma_node.link' as const
const NODE_ID_SHAPE = /^[0-9]+:[0-9]+$/

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CAPABILITY, 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const url = new URL(request.url)
  const fileKey = url.searchParams.get('fileKey') ?? ''
  const nodeId = url.searchParams.get('nodeId') ?? ''

  // Fail-closed: solo nodos del archivo AXIS, shape canónico `NNN:MMM`.
  if (fileKey !== AXIS_FILE_KEY) {
    return canonicalErrorResponse('figma_node_not_axis')
  }

  if (!NODE_ID_SHAPE.test(nodeId)) {
    return canonicalErrorResponse('invalid_figma_url')
  }

  try {
    const render = await getFigmaNodeRender({ fileKey, nodeId })

    return NextResponse.json(render)
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'figma_node_preview' } })

    // El preview es enrichment — degrada honesto, nunca rompe el editor.
    return NextResponse.json({ imageUrl: null, nodeName: null, status: 'unavailable' })
  }
}
