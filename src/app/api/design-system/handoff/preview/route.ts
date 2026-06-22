import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getFigmaNodeRender } from '@/lib/design-system/figma-nodes/figma-render'
import { getAllowedDesignHandoffFile } from '@/lib/design-system/handoff/allowlist'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CREATE_CAPABILITY = 'design_system.handoff.create' as const
const NODE_ID_SHAPE = /^[0-9]+:[0-9]+$/

export async function GET(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse ?? canonicalErrorResponse('unauthorized')
  }

  if (!can(tenant, CREATE_CAPABILITY, 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  const url = new URL(request.url)
  const fileKey = url.searchParams.get('fileKey') ?? ''
  const nodeId = url.searchParams.get('nodeId') ?? ''

  if (!NODE_ID_SHAPE.test(nodeId)) {
    return canonicalErrorResponse('invalid_figma_url')
  }

  try {
    const allowed = await getAllowedDesignHandoffFile(fileKey)

    if (!allowed) {
      return canonicalErrorResponse('figma_file_not_allowed')
    }

    const render = await getFigmaNodeRender({ fileKey, nodeId })

    return NextResponse.json(render)
  } catch (error) {
    captureWithDomain(error, 'platform', { tags: { source: 'design_handoff_preview' } })

    return NextResponse.json({ imageUrl: null, nodeName: null, status: 'unavailable' })
  }
}
