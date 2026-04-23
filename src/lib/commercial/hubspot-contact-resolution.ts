import 'server-only'

import { query } from '@/lib/db'

export interface ResolvedHubSpotContact {
  identityProfileId: string
  hubspotContactId: string | null
  displayName: string | null
}

export const resolveHubSpotContactByIdentityProfileId = async (
  identityProfileId: string
): Promise<ResolvedHubSpotContact | null> => {
  const rows = await query<{
    identity_profile_id: string
    hubspot_contact_id: string | null
    display_name: string | null
  }>(
    `SELECT ip.profile_id AS identity_profile_id,
            COALESCE(
              p360.hubspot_contact_id,
              ct.hubspot_contact_id,
              CASE
                WHEN ip.primary_source_system = 'hubspot'
                 AND ip.primary_source_object_type = 'contact'
                THEN ip.primary_source_object_id
                ELSE NULL
              END
            ) AS hubspot_contact_id,
            COALESCE(p360.resolved_display_name, ct.display_name, ip.full_name) AS display_name
       FROM greenhouse_core.identity_profiles AS ip
       LEFT JOIN greenhouse_serving.person_360 AS p360
         ON p360.identity_profile_id = ip.profile_id
       LEFT JOIN greenhouse_crm.contacts AS ct
         ON ct.linked_identity_profile_id = ip.profile_id
        AND ct.is_deleted = FALSE
       WHERE ip.profile_id = $1
       LIMIT 1`,
    [identityProfileId]
  )

  const row = rows[0]

  if (!row) {
    return null
  }

  return {
    identityProfileId: row.identity_profile_id,
    hubspotContactId: row.hubspot_contact_id,
    displayName: row.display_name
  }
}
