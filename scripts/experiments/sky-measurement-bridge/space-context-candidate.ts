/** Local experiment only: fresh identity + explicit grant + real Insights capability/organization gate.
 * No runtime caller. Does not replace production authorization, route authentication or write transactions.
 */
import { getTenantAccessRecordFromPostgresByUserId } from '@/lib/tenant/access'
import { runGreenhousePostgresQuery as query } from '@/lib/postgres/client'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { assertInsightsAccess } from '@/lib/efeonce-insights/authz'
import { getInsightReportById } from '@/lib/efeonce-insights/stores/report-store'

export interface SpaceTarget {
  organizationId: string
  spaceId: string
  serviceId: string
  need: 'read' | 'create'
}
export interface LocalSpaceContext extends SpaceTarget {
  userId: string
  profileId: string
  bridgeClientId: string
  grantId: string
  grantVersion: number
}
export class LocalAccessDenied extends Error {
  constructor() { super('local_context_denied') }
}

/** userId is supplied by the authenticated server boundary, never by the request body. */
export const selectLocalSpaceContext = async (userId: string, target: SpaceTarget): Promise<LocalSpaceContext> => {
  const tenant = await getTenantAccessRecordFromPostgresByUserId(userId)

  if (!tenant?.active || tenant.status !== 'active' || tenant.tenantType !== 'client' || !tenant.identityProfileId ||
    !['read', 'create'].includes(target.need)) throw new LocalAccessDenied()

  // Metadata/membership/default-client do not confer authority. Exactly one valid grant is required.
  const rows = await query<{ grant_id: string; version: number; client_id: string }>(`
    SELECT g.grant_id, g.version, s.client_id
      FROM sky_experiment.space_grants g
      JOIN greenhouse_core.spaces s ON s.space_id=g.space_id AND s.organization_id=g.organization_id
      JOIN greenhouse_core.organizations o ON o.organization_id=s.organization_id AND o.active
      JOIN greenhouse_core.clients c ON c.client_id=s.client_id AND c.active
      JOIN greenhouse_core.services svc ON svc.space_id=s.space_id AND svc.organization_id=o.organization_id
     WHERE g.profile_id=$1 AND g.organization_id=$2 AND s.space_id=$3 AND svc.service_id=$4
       AND g.active AND s.active AND svc.active
       AND g.valid_from <= now() AND (g.valid_to IS NULL OR g.valid_to > now())
       AND $5=ANY(g.needs)`,
  [tenant.identityProfileId, target.organizationId, target.spaceId, target.serviceId, target.need])

  if (rows.length !== 1) throw new LocalAccessDenied()
  // Existing capability ceiling remains; a local grant cannot manufacture a global capability.
  await assertInsightsAccess({ subject: buildTenantEntitlementSubject({ ...tenant,
    spaceId: tenant.spaceId ?? undefined, organizationId: tenant.organizationId ?? undefined,
    organizationName: tenant.organizationName ?? undefined, memberId: tenant.memberId ?? undefined,
    identityProfileId: tenant.identityProfileId ?? undefined }),
    actorOrganizationId: tenant.organizationId, organizationId: target.organizationId, need: target.need })

  return { userId: tenant.userId, profileId: tenant.identityProfileId, organizationId: target.organizationId,
    spaceId: target.spaceId, serviceId: target.serviceId, need: target.need,
    bridgeClientId: rows[0].client_id, grantId: rows[0].grant_id, grantVersion: rows[0].version }
}

/** Revalidate at point of use; selected context is not a reusable bearer capability. */
export const revalidateLocalSpaceContext = async (authenticatedUserId: string, context: LocalSpaceContext): Promise<LocalSpaceContext> => {
  if (context.userId !== authenticatedUserId) throw new LocalAccessDenied()

  const fresh = await selectLocalSpaceContext(authenticatedUserId, context)

  if (fresh.grantId !== context.grantId || fresh.grantVersion !== context.grantVersion ||
    fresh.profileId !== context.profileId || fresh.bridgeClientId !== context.bridgeClientId) throw new LocalAccessDenied()

  return fresh
}

export const readLocalBoundReport = async (authenticatedUserId: string, context: LocalSpaceContext, reportId: string) => {
  const fresh = await revalidateLocalSpaceContext(authenticatedUserId, context)

  const [binding] = await query(`SELECT report_id FROM sky_experiment.report_bindings
    WHERE report_id=$1 AND space_id=$2 AND service_id=$3`, [reportId, fresh.spaceId, fresh.serviceId])

  if (!binding || fresh.need !== 'read') throw new LocalAccessDenied()
  const report = await getInsightReportById(undefined, fresh.organizationId, reportId)

  if (!report) throw new LocalAccessDenied()

  return report
}
