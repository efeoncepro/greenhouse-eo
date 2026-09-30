import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { getDb } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { getTenantAccessRecordFromPostgresByUserId } from '@/lib/tenant/access'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'

const NEEDS = {
  read: ['growth.xray.case.read', 'read'],
  create: ['growth.xray.draft.manage', 'create'],
  update: ['growth.xray.draft.manage', 'update'],
  issue: ['growth.xray.edition.issue', 'approve'],
  withdraw: ['growth.xray.edition.issue', 'update'],
  share_read: ['growth.xray.share.manage', 'read'],
  share_create: ['growth.xray.share.manage', 'create'],
  share_revoke: ['growth.xray.share.manage', 'update']
} as const

export type XrayAccessNeed = keyof typeof NEEDS

/** The prospect in a case is not the owning organization. Never accept an org from a payload. */
export async function resolveXrayAuthority(context: AppPlatformRequestContext, need: XrayAccessNeed) {
  const subject = buildTenantEntitlementSubject(context.tenant)
  const [capability, action] = NEEDS[need]

  // OAuth federation has no delegated X-Ray contract yet; an internal identity is not consent.
  if (
    context.authSource === 'sister_platform_oauth' ||
    subject.tenantType !== 'efeonce_internal' ||
    !can(subject, capability, action, 'tenant')
  ) {
    throw new ApiPlatformError('X-Ray access is not permitted.', { statusCode: 403, errorCode: 'forbidden' })
  }

  const current = await getTenantAccessRecordFromPostgresByUserId(subject.userId)

  if (!current || !current.active || current.status !== 'active' || current.tenantType !== 'efeonce_internal') {
    throw new ApiPlatformError('X-Ray identity is not active.', { statusCode: 403, errorCode: 'forbidden' })
  }

  const currentSubject: TenantEntitlementSubject = {
    ...current,
    memberId: current.memberId ?? undefined
  }

  if (
    !can(currentSubject, capability, action, 'tenant') ||
    (current.organizationId &&
      context.tenant.organizationId &&
      current.organizationId !== context.tenant.organizationId)
  ) {
    throw new ApiPlatformError('X-Ray authority has changed.', { statusCode: 403, errorCode: 'forbidden' })
  }

  const ownerId = current.organizationId ?? context.tenant.organizationId

  let query = (await getDb())
    .selectFrom('greenhouse_core.organizations')
    .select('organization_id')
    .where('is_operating_entity', '=', true)
    .where('status', '=', 'active')
    .where('active', '=', true)

  if (ownerId) query = query.where('organization_id', '=', ownerId)

  // Old internal sessions lack organizationId. A unique internal owner is safe; ambiguity fails closed.
  const owners = await query.limit(2).execute()

  if (owners.length !== 1) {
    throw new ApiPlatformError('X-Ray owner context is unavailable.', { statusCode: 403, errorCode: 'forbidden' })
  }

  return { organizationId: owners[0].organization_id, actorUserId: subject.userId }
}
