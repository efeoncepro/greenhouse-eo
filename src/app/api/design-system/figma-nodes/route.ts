import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import {
  DesignSystemFigmaLinkError,
  getDesignSystemFigmaNodeMap,
  linkDesignSystemFigmaNode
} from '@/lib/design-system/figma-nodes/store'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-1072 Slice 3 — Design System ↔ AXIS Figma node link API.
 *
 * GET  → el mapa actual surface→node (SSOT runtime). Lo consume el shell server-side;
 *        este endpoint queda como contrato programático del registro.
 * POST → vincula/cambia el nodo de una superficie. Gateado por la capability
 *        `design_system.figma_node.link` (DESIGNER ∪ EFEONCE_ADMIN) — ver el Design
 *        System es plano views; vincular es este entitlement. NO vive bajo /api/admin
 *        porque el designer NO es admin y el DS salió de Admin Center (TASK-1070).
 *
 * Errores es-CL canónicos (canonicalErrorResponse); nunca error.message crudo.
 */

const CAPABILITY = 'design_system.figma_node.link' as const

interface LinkBody {
  surfaceKey?: unknown
  url?: unknown
}

export async function GET() {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CAPABILITY, 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  try {
    const map = await getDesignSystemFigmaNodeMap()

    return NextResponse.json({ nodes: map })
  } catch (error) {
    captureWithDomain(error, 'identity', { tags: { source: 'design_system_figma_nodes_get' } })

    return canonicalErrorResponse('internal_error')
  }
}

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CAPABILITY, 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  let body: LinkBody = {}

  try {
    body = (await request.json()) as LinkBody
  } catch {
    return canonicalErrorResponse('invalid_figma_url')
  }

  if (typeof body.surfaceKey !== 'string' || typeof body.url !== 'string') {
    return canonicalErrorResponse('invalid_figma_url')
  }

  try {
    const result = await linkDesignSystemFigmaNode({
      surfaceKey: body.surfaceKey,
      url: body.url,
      actorUserId: tenant.userId
    })

    return NextResponse.json({
      ok: true,
      surfaceKey: result.surfaceKey,
      nodeId: result.nodeId,
      outcome: result.outcome
    })
  } catch (error) {
    if (error instanceof DesignSystemFigmaLinkError) {
      if (error.code === 'invalid_figma_url') return canonicalErrorResponse('invalid_figma_url')
      if (error.code === 'figma_node_not_axis') return canonicalErrorResponse('figma_node_not_axis')
      // invalid_surface_key: no alcanzable desde la UI (surfaceKey = pathname del DS).
      // Señal de tampering/bug — log + 400 sin filtrar el valor.
      captureWithDomain(error, 'identity', {
        tags: { source: 'design_system_figma_nodes_post', reason: error.code }
      })

      return canonicalErrorResponse('forbidden', { statusOverride: 400 })
    }

    captureWithDomain(error, 'identity', { tags: { source: 'design_system_figma_nodes_post' } })

    return canonicalErrorResponse('internal_error')
  }
}
