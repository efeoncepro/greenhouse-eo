import 'server-only'

import { query } from '@/lib/db'
import { resolveHubSpotGreenhouseOwnerByEmail } from '@/lib/integrations/hubspot-greenhouse-service'
import { listHubSpotOwnerIdentities } from '@/lib/commercial/hubspot-owner-identity'

export interface HubSpotOwnerMappingSyncSummary {
  scannedMembers: number
  matchedMembers: number
  updatedMembers: number
  alreadyMappedMembers: number
  unresolvedMembers: number
  syncedAt: string
}

export const syncHubSpotOwnerMappings = async (): Promise<HubSpotOwnerMappingSyncSummary> => {
  const rows = await listHubSpotOwnerIdentities()

  let matchedMembers = 0
  let updatedMembers = 0
  let alreadyMappedMembers = 0
  let unresolvedMembers = 0

  for (const row of rows) {
    let resolvedOwnerId: string | null = null

    for (const email of row.candidateEmails) {
      const resolution = await resolveHubSpotGreenhouseOwnerByEmail(email)

      if (resolution.status === 'endpoint_not_deployed') {
        throw new Error('HubSpot integration service does not expose GET /owners/resolve yet.')
      }

      if (resolution.owner?.hubspotOwnerId) {
        resolvedOwnerId = resolution.owner.hubspotOwnerId
        break
      }
    }

    if (!resolvedOwnerId) {
      unresolvedMembers += 1
      continue
    }

    matchedMembers += 1

    if (row.hubspotOwnerId === resolvedOwnerId) {
      alreadyMappedMembers += 1
      continue
    }

    await query(
      `UPDATE greenhouse_core.members
          SET hubspot_owner_id = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE member_id = $1`,
      [row.memberId, resolvedOwnerId]
    )

    updatedMembers += 1
  }

  return {
    scannedMembers: rows.length,
    matchedMembers,
    updatedMembers,
    alreadyMappedMembers,
    unresolvedMembers,
    syncedAt: new Date().toISOString()
  }
}
