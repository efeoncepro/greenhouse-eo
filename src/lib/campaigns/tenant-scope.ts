import 'server-only'

import { getDb } from '@/lib/db'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import {
  getCampaign,
  listAllCampaigns,
  listCampaigns,
  listCampaignsBySpaceIds,
  type Campaign
} from './campaign-store'

export type CampaignTenantAccessResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: 'not_found' | 'forbidden' }

const listClientSpaceIds = async (clientId: string): Promise<string[]> => {
  const db = await getDb()

  const rows = await db
    .selectFrom('greenhouse_core.spaces')
    .select(['space_id'])
    .where('client_id', '=', clientId)
    .where('active', '=', true)
    .orderBy('space_id asc')
    .execute()

  return [...new Set(rows.map(row => row.space_id).filter(Boolean))]
}

export const resolveTenantCampaignSpaceIds = async (
  tenant: TenantContext
): Promise<string[] | null> => {
  if (tenant.tenantType !== 'client') {
    return null
  }

  if (tenant.spaceId) {
    return [tenant.spaceId]
  }

  if (!tenant.clientId) {
    return []
  }

  return listClientSpaceIds(tenant.clientId)
}

export const listCampaignsForTenant = async ({
  tenant,
  status,
  requestedSpaceId
}: {
  tenant: TenantContext
  status?: string
  requestedSpaceId?: string
}): Promise<{ ok: true; items: Campaign[] } | { ok: false; reason: 'forbidden' }> => {
  const campaignIds = tenant.campaignScopes.length > 0 ? tenant.campaignScopes : undefined

  if (tenant.tenantType !== 'client') {
    if (requestedSpaceId) {
      const items = await listCampaigns(requestedSpaceId, { status, campaignIds })

      return { ok: true, items }
    }

    const items = await listAllCampaigns({ status, campaignIds })

    return { ok: true, items }
  }

  const allowedSpaceIds = await resolveTenantCampaignSpaceIds(tenant)

  if (!allowedSpaceIds || allowedSpaceIds.length === 0) {
    return { ok: true, items: [] }
  }

  if (requestedSpaceId) {
    if (!allowedSpaceIds.includes(requestedSpaceId)) {
      return { ok: false, reason: 'forbidden' }
    }

    const items = await listCampaigns(requestedSpaceId, { status, campaignIds })

    return { ok: true, items }
  }

  if (allowedSpaceIds.length === 1) {
    const items = await listCampaigns(allowedSpaceIds[0], { status, campaignIds })

    return { ok: true, items }
  }

  const items = await listCampaignsBySpaceIds(allowedSpaceIds, { status, campaignIds })

  return { ok: true, items }
}

export const getCampaignForTenant = async ({
  tenant,
  campaignId
}: {
  tenant: TenantContext
  campaignId: string
}): Promise<CampaignTenantAccessResult> => {
  if (tenant.campaignScopes.length > 0 && !tenant.campaignScopes.includes(campaignId)) {
    return { ok: false, reason: 'forbidden' }
  }

  const campaign = await getCampaign(campaignId)

  if (!campaign) {
    return { ok: false, reason: 'not_found' }
  }

  if (tenant.tenantType !== 'client') {
    return { ok: true, campaign }
  }

  const allowedSpaceIds = await resolveTenantCampaignSpaceIds(tenant)

  if (!allowedSpaceIds || !allowedSpaceIds.includes(campaign.spaceId)) {
    return { ok: false, reason: 'forbidden' }
  }

  return { ok: true, campaign }
}
