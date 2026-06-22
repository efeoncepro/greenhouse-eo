import { NextResponse } from 'next/server'

import { executeApiPlatformCommand } from '@/lib/api-platform/core/commands'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import type { DesignHandoffError } from '@/lib/design-system/handoff/state-machine'
import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

export const mapDesignHandoffError = (error: DesignHandoffError) => {
  if (error.code === 'invalid_figma_url') return canonicalErrorResponse('invalid_figma_url')
  if (error.code === 'figma_file_not_allowed') return canonicalErrorResponse('figma_file_not_allowed')
  if (error.code === 'design_handoff_not_found') return canonicalErrorResponse('design_handoff_not_found')
  if (error.code === 'invalid_design_handoff_input') return canonicalErrorResponse('invalid_design_handoff_input')
  if (error.code === 'invalid_allowed_file') return canonicalErrorResponse('figma_file_not_allowed')
  if (error.code === 'invalid_design_handoff_link') return canonicalErrorResponse('invalid_design_handoff_link')
  if (error.code === 'invalid_design_handoff_evidence') return canonicalErrorResponse('invalid_design_handoff_evidence')

  if (error.code === 'invalid_design_handoff_primitive_decision') {
    return canonicalErrorResponse('invalid_design_handoff_primitive_decision')
  }

  if (error.code === 'design_handoff_missing_evidence') return canonicalErrorResponse('design_handoff_missing_evidence')

  if (error.code === 'design_handoff_missing_primitive_decision') {
    return canonicalErrorResponse('design_handoff_missing_primitive_decision')
  }

  if (error.code === 'design_handoff_node_unavailable') return canonicalErrorResponse('design_handoff_node_unavailable')

  return canonicalErrorResponse('invalid_design_handoff_transition')
}

export const requireHandoffCapability = (
  tenant: TenantEntitlementSubject,
  capability: string,
  action: 'read' | 'create' | 'update'
) => {
  if (!can(tenant, capability as never, action as never, 'tenant')) {
    return canonicalErrorResponse('forbidden')
  }

  return null
}

export const runDesignHandoffCommand = async <T>({
  tenant,
  request,
  routeKey,
  body,
  run
}: {
  tenant: TenantEntitlementSubject
  request: Request
  routeKey: string
  body: unknown
  run: () => Promise<T>
}) => {
  try {
    const result = await executeApiPlatformCommand<T>({
      principal: {
        lane: 'internal',
        principalKind: 'internal_actor',
        principalId: tenant.userId,
        userId: tenant.userId
      },
      scope: {
        greenhouseScopeType: tenant.tenantType === 'client' ? 'client' : 'internal'
      },
      routeKey,
      request,
      body,
      run: async () => ({ data: await run(), status: 200 })
    })

    return NextResponse.json(result.data, {
      status: result.status ?? 200,
      headers: result.headers
    })
  } catch (error) {
    if (error instanceof ApiPlatformError) {
      return NextResponse.json(
        { error: { code: error.errorCode, message: error.message, details: error.details } },
        { status: error.statusCode }
      )
    }

    throw error
  }
}
