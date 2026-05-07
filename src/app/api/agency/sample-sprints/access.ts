import { NextResponse } from 'next/server'

import type { EntitlementAction, EntitlementCapabilityKey } from '@/config/entitlements-catalog'
import { can } from '@/lib/entitlements/runtime'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { requireCommercialTenantContext } from '@/lib/tenant/authorization'

export const requireSampleSprintEntitlement = async (
  capability: EntitlementCapabilityKey,
  action: EntitlementAction
) => {
  const { tenant, errorResponse } = await requireCommercialTenantContext()

  if (!tenant) {
    return { tenant: null, errorResponse: errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!can(buildTenantEntitlementSubject(tenant), capability, action, 'tenant')) {
    return { tenant: null, errorResponse: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { tenant, errorResponse: null }
}

export const parseJsonBody = async <T>(request: Request): Promise<T | null> => {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export const mapSampleSprintError = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Sample Sprint operation failed.'

  if (
    error instanceof Error &&
    (
      error.name.endsWith('ValidationError') ||
      error.name === 'ServiceNotEligibleForEngagementError'
    )
  ) {
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (error instanceof Error && error.name.endsWith('ConflictError')) {
    return NextResponse.json({ error: message }, { status: 409 })
  }

  if (error instanceof Error && error.name.endsWith('NotFoundError')) {
    return NextResponse.json({ error: message }, { status: 404 })
  }

  throw error
}
