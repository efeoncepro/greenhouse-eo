import { BigQuery } from '@google-cloud/bigquery'

import { buildIdentitySourceLinkId } from '@/lib/ids/greenhouse-ids'
import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

type ClientAssigneeLink = {
  label: string
  sourceObjectId: string
  sourceDisplayName: string
  profileId: string
}

const CLIENT_ASSIGNEE_LINKS: ClientAssigneeLink[] = [
  {
    label: 'Sky in-house designer - Constanza',
    sourceObjectId: '242d872b-594c-8178-9f19-0002c0cda59c',
    sourceDisplayName: 'Constanza Rojas',
    profileId: 'profile-hubspot-contact-157404441684'
  },
  {
    label: 'Sky in-house designer - Adriana',
    sourceObjectId: '242d872b-594c-819c-b0fe-0002083f5da7',
    sourceDisplayName: 'Adriana',
    profileId: 'profile-hubspot-contact-157404441685'
  }
]

async function main() {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const bq = new BigQuery(getGoogleAuthOptions())
  const projectId = getGoogleProjectId()

  for (const link of CLIENT_ASSIGNEE_LINKS) {
    const profileRows = await runGreenhousePostgresQuery<{
      profile_id: string
      full_name: string | null
      canonical_email: string | null
      profile_type: string
      user_id: string | null
      tenant_type: string | null
    }>(
      `SELECT
         ip.profile_id,
         ip.full_name,
         ip.canonical_email,
         ip.profile_type,
         cu.user_id,
         cu.tenant_type
       FROM greenhouse_core.identity_profiles ip
       LEFT JOIN greenhouse_core.client_users cu
         ON cu.identity_profile_id = ip.profile_id
       WHERE ip.profile_id = $1`,
      [link.profileId]
    )

    const profile = profileRows[0]

    if (!profile) {
      throw new Error(`Profile ${link.profileId} not found for ${link.label}`)
    }

    if (profile.profile_type !== 'external_contact') {
      throw new Error(`Profile ${link.profileId} is not external_contact for ${link.label}`)
    }

    const linkId = buildIdentitySourceLinkId({
      profileId: link.profileId,
      sourceSystem: 'notion',
      sourceObjectType: 'person',
      sourceObjectId: link.sourceObjectId
    })

    const nowIso = new Date().toISOString()

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_core.identity_profile_source_links (
         link_id, profile_id, source_system, source_object_type, source_object_id,
         source_user_id, source_email, source_display_name, active
       ) VALUES ($1, $2, 'notion', 'person', $3, $4, $5, $6, TRUE)
       ON CONFLICT (profile_id, source_system, source_object_type, source_object_id)
       DO UPDATE SET
         source_user_id = EXCLUDED.source_user_id,
         source_email = EXCLUDED.source_email,
         source_display_name = EXCLUDED.source_display_name,
         active = TRUE,
         updated_at = NOW()`,
      [
        linkId,
        link.profileId,
        link.sourceObjectId,
        link.sourceObjectId,
        profile.canonical_email,
        link.sourceDisplayName
      ]
    )

    await bq.query({
      query: `
        MERGE \`${projectId}.greenhouse.identity_profile_source_links\` AS target
        USING (
          SELECT
            @linkId AS link_id,
            @profileId AS profile_id,
            'notion' AS source_system,
            'person' AS source_object_type,
            @sourceObjectId AS source_object_id,
            @sourceUserId AS source_user_id,
            @sourceEmail AS source_email,
            @sourceDisplayName AS source_display_name,
            FALSE AS is_primary,
            FALSE AS is_login_identity,
            TRUE AS active,
            TIMESTAMP(@createdAt) AS created_at,
            TIMESTAMP(@updatedAt) AS updated_at
        ) AS source
        ON target.profile_id = source.profile_id
           AND target.source_system = source.source_system
           AND target.source_object_type = source.source_object_type
           AND COALESCE(target.source_object_id, '') = COALESCE(source.source_object_id, '')
        WHEN MATCHED THEN
          UPDATE SET
            source_user_id = source.source_user_id,
            source_email = source.source_email,
            source_display_name = source.source_display_name,
            is_primary = source.is_primary,
            is_login_identity = source.is_login_identity,
            active = source.active,
            updated_at = source.updated_at
        WHEN NOT MATCHED THEN
          INSERT (
            link_id, profile_id, source_system, source_object_type, source_object_id,
            source_user_id, source_email, source_display_name, is_primary, is_login_identity, active, created_at, updated_at
          )
          VALUES (
            source.link_id, source.profile_id, source.source_system, source.source_object_type, source.source_object_id,
            source.source_user_id, source.source_email, source.source_display_name, source.is_primary, source.is_login_identity, source.active, source.created_at, source.updated_at
          )
      `,
      params: {
        linkId,
        profileId: link.profileId,
        sourceObjectId: link.sourceObjectId,
        sourceUserId: link.sourceObjectId,
        sourceEmail: profile.canonical_email,
        sourceDisplayName: link.sourceDisplayName,
        createdAt: nowIso,
        updatedAt: nowIso
      },
      types: {
        linkId: 'STRING',
        profileId: 'STRING',
        sourceObjectId: 'STRING',
        sourceUserId: 'STRING',
        sourceEmail: 'STRING',
        sourceDisplayName: 'STRING',
        createdAt: 'STRING',
        updatedAt: 'STRING'
      }
    })

    console.log(`Linked ${link.label} -> ${link.profileId}`)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
