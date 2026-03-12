import { BigQuery } from '@google-cloud/bigquery'

import { resolveContactDisplayName } from '../src/lib/contacts/contact-display'
import {
  buildIdentityProfileId,
  buildIdentityProfilePublicId,
  buildIdentitySourceLinkId
} from '../src/lib/ids/greenhouse-ids'

type InternalUserRow = {
  user_id: string
  email: string
  full_name: string
  job_title: string | null
  status: string
  active: boolean
  auth_mode: string
}

type HubSpotOwnerRow = {
  owner_id: string
  email: string
  first_name: string | null
  last_name: string | null
  archived: boolean
}

type IdentityProfileRecord = {
  profileId: string
  publicId: string
  profileType: string
  canonicalEmail: string | null
  fullName: string
  jobTitle: string | null
  status: string
  active: boolean
  defaultAuthMode: string | null
  primarySourceSystem: string
  primarySourceObjectType: string
  primarySourceObjectId: string
  notes: string | null
  links: IdentitySourceLinkRecord[]
}

type IdentitySourceLinkRecord = {
  profileId: string
  sourceSystem: string
  sourceObjectType: string
  sourceObjectId: string
  sourceUserId: string | null
  sourceEmail: string | null
  sourceDisplayName: string | null
  isPrimary: boolean
  isLoginIdentity: boolean
  active: boolean
}

const INTERNAL_EMAIL_DOMAIN_PATTERN = /@(efeonce\.org|efeoncepro\.com)$/i

const bigQuery = new BigQuery({
  projectId: process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
})

const dryRun = process.argv.includes('--dry-run')

const normalizeEmail = (value: string | null | undefined) => value?.trim().toLowerCase() || null

const isInternalEmail = (value: string | null | undefined) => {
  const normalizedEmail = normalizeEmail(value)

  return Boolean(normalizedEmail && INTERNAL_EMAIL_DOMAIN_PATTERN.test(normalizedEmail))
}

const getInternalUsers = async () => {
  const [rows] = await bigQuery.query({
    query: `
      SELECT
        cu.user_id,
        cu.email,
        cu.full_name,
        cu.job_title,
        cu.status,
        cu.active,
        cu.auth_mode
      FROM \`efeonce-group.greenhouse.client_users\` AS cu
      LEFT JOIN \`efeonce-group.greenhouse.user_role_assignments\` AS ura
        ON ura.user_id = cu.user_id
       AND ura.active = TRUE
       AND ura.status = 'active'
      WHERE cu.tenant_type = 'efeonce_internal'
         OR STARTS_WITH(ura.role_code, 'efeonce_')
      GROUP BY
        cu.user_id,
        cu.email,
        cu.full_name,
        cu.job_title,
        cu.status,
        cu.active,
        cu.auth_mode
      ORDER BY cu.user_id
    `
  })

  return rows as InternalUserRow[]
}

const getHubSpotOwners = async () => {
  const [rows] = await bigQuery.query({
    query: `
      SELECT
        owner_id,
        email,
        first_name,
        last_name,
        archived
      FROM \`efeonce-group.hubspot_crm.owners\`
      WHERE REGEXP_CONTAINS(LOWER(email), r'@(efeonce\\.org|efeoncepro\\.com)$')
      ORDER BY owner_id
    `
  })

  return rows as HubSpotOwnerRow[]
}

const upsertIdentityProfile = async (profile: IdentityProfileRecord) => {
  await bigQuery.query({
    query: `
      MERGE \`efeonce-group.greenhouse.identity_profiles\` AS target
      USING (
        SELECT
          @profileId AS profile_id,
          @publicId AS public_id,
          @profileType AS profile_type,
          @canonicalEmail AS canonical_email,
          @fullName AS full_name,
          @jobTitle AS job_title,
          @status AS status,
          @active AS active,
          @defaultAuthMode AS default_auth_mode,
          @primarySourceSystem AS primary_source_system,
          @primarySourceObjectType AS primary_source_object_type,
          @primarySourceObjectId AS primary_source_object_id,
          @notes AS notes,
          CURRENT_TIMESTAMP() AS created_at,
          CURRENT_TIMESTAMP() AS updated_at
      ) AS source
      ON target.profile_id = source.profile_id
      WHEN MATCHED THEN
        UPDATE SET
          public_id = source.public_id,
          profile_type = source.profile_type,
          canonical_email = source.canonical_email,
          full_name = source.full_name,
          job_title = source.job_title,
          status = source.status,
          active = source.active,
          default_auth_mode = source.default_auth_mode,
          primary_source_system = source.primary_source_system,
          primary_source_object_type = source.primary_source_object_type,
          primary_source_object_id = source.primary_source_object_id,
          notes = source.notes,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          profile_id,
          public_id,
          profile_type,
          canonical_email,
          full_name,
          job_title,
          status,
          active,
          default_auth_mode,
          primary_source_system,
          primary_source_object_type,
          primary_source_object_id,
          notes,
          created_at,
          updated_at
        )
        VALUES (
          source.profile_id,
          source.public_id,
          source.profile_type,
          source.canonical_email,
          source.full_name,
          source.job_title,
          source.status,
          source.active,
          source.default_auth_mode,
          source.primary_source_system,
          source.primary_source_object_type,
          source.primary_source_object_id,
          source.notes,
          source.created_at,
          source.updated_at
        )
    `,
    params: {
      profileId: profile.profileId,
      publicId: profile.publicId,
      profileType: profile.profileType,
      canonicalEmail: profile.canonicalEmail,
      fullName: profile.fullName,
      jobTitle: profile.jobTitle,
      status: profile.status,
      active: profile.active,
      defaultAuthMode: profile.defaultAuthMode,
      primarySourceSystem: profile.primarySourceSystem,
      primarySourceObjectType: profile.primarySourceObjectType,
      primarySourceObjectId: profile.primarySourceObjectId,
      notes: profile.notes
    },
    types: {
      profileId: 'STRING',
      publicId: 'STRING',
      profileType: 'STRING',
      canonicalEmail: 'STRING',
      fullName: 'STRING',
      jobTitle: 'STRING',
      status: 'STRING',
      active: 'BOOL',
      defaultAuthMode: 'STRING',
      primarySourceSystem: 'STRING',
      primarySourceObjectType: 'STRING',
      primarySourceObjectId: 'STRING',
      notes: 'STRING'
    }
  })
}

const upsertIdentitySourceLink = async (link: IdentitySourceLinkRecord) => {
  const linkId = buildIdentitySourceLinkId({
    profileId: link.profileId,
    sourceSystem: link.sourceSystem,
    sourceObjectType: link.sourceObjectType,
    sourceObjectId: link.sourceObjectId
  })

  await bigQuery.query({
    query: `
      MERGE \`efeonce-group.greenhouse.identity_profile_source_links\` AS target
      USING (
        SELECT
          @linkId AS link_id,
          @profileId AS profile_id,
          @sourceSystem AS source_system,
          @sourceObjectType AS source_object_type,
          @sourceObjectId AS source_object_id,
          @sourceUserId AS source_user_id,
          @sourceEmail AS source_email,
          @sourceDisplayName AS source_display_name,
          @isPrimary AS is_primary,
          @isLoginIdentity AS is_login_identity,
          @active AS active,
          CURRENT_TIMESTAMP() AS created_at,
          CURRENT_TIMESTAMP() AS updated_at
      ) AS source
      ON target.link_id = source.link_id
      WHEN MATCHED THEN
        UPDATE SET
          profile_id = source.profile_id,
          source_system = source.source_system,
          source_object_type = source.source_object_type,
          source_object_id = source.source_object_id,
          source_user_id = source.source_user_id,
          source_email = source.source_email,
          source_display_name = source.source_display_name,
          is_primary = source.is_primary,
          is_login_identity = source.is_login_identity,
          active = source.active,
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (
          link_id,
          profile_id,
          source_system,
          source_object_type,
          source_object_id,
          source_user_id,
          source_email,
          source_display_name,
          is_primary,
          is_login_identity,
          active,
          created_at,
          updated_at
        )
        VALUES (
          source.link_id,
          source.profile_id,
          source.source_system,
          source.source_object_type,
          source.source_object_id,
          source.source_user_id,
          source.source_email,
          source.source_display_name,
          source.is_primary,
          source.is_login_identity,
          source.active,
          source.created_at,
          source.updated_at
        )
    `,
    params: {
      linkId,
      profileId: link.profileId,
      sourceSystem: link.sourceSystem,
      sourceObjectType: link.sourceObjectType,
      sourceObjectId: link.sourceObjectId,
      sourceUserId: link.sourceUserId,
      sourceEmail: link.sourceEmail,
      sourceDisplayName: link.sourceDisplayName,
      isPrimary: link.isPrimary,
      isLoginIdentity: link.isLoginIdentity,
      active: link.active
    },
    types: {
      linkId: 'STRING',
      profileId: 'STRING',
      sourceSystem: 'STRING',
      sourceObjectType: 'STRING',
      sourceObjectId: 'STRING',
      sourceUserId: 'STRING',
      sourceEmail: 'STRING',
      sourceDisplayName: 'STRING',
      isPrimary: 'BOOL',
      isLoginIdentity: 'BOOL',
      active: 'BOOL'
    }
  })
}

const updateClientUserIdentityProfile = async ({ userId, profileId }: { userId: string; profileId: string }) => {
  await bigQuery.query({
    query: `
      UPDATE \`efeonce-group.greenhouse.client_users\`
      SET
        identity_profile_id = @profileId,
        updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @userId
    `,
    params: {
      userId,
      profileId
    },
    types: {
      userId: 'STRING',
      profileId: 'STRING'
    }
  })
}

const ensureFoundation = async () => {
  const statements = [
    `
      ALTER TABLE \`efeonce-group.greenhouse.client_users\`
      ADD COLUMN IF NOT EXISTS identity_profile_id STRING
    `,
    `
      CREATE TABLE IF NOT EXISTS \`efeonce-group.greenhouse.identity_profiles\` (
        profile_id STRING NOT NULL,
        public_id STRING NOT NULL,
        profile_type STRING NOT NULL,
        canonical_email STRING,
        full_name STRING NOT NULL,
        job_title STRING,
        status STRING NOT NULL,
        active BOOL NOT NULL,
        default_auth_mode STRING,
        primary_source_system STRING NOT NULL,
        primary_source_object_type STRING NOT NULL,
        primary_source_object_id STRING NOT NULL,
        notes STRING,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS \`efeonce-group.greenhouse.identity_profile_source_links\` (
        link_id STRING NOT NULL,
        profile_id STRING NOT NULL,
        source_system STRING NOT NULL,
        source_object_type STRING NOT NULL,
        source_object_id STRING NOT NULL,
        source_user_id STRING,
        source_email STRING,
        source_display_name STRING,
        is_primary BOOL NOT NULL,
        is_login_identity BOOL NOT NULL,
        active BOOL NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )
    `
  ]

  for (const statement of statements) {
    await bigQuery.query({ query: statement })
  }
}

const main = async () => {
  await ensureFoundation()

  const [internalUsers, hubSpotOwners] = await Promise.all([getInternalUsers(), getHubSpotOwners()])

  const profileCandidatesByEmail = new Map<
    string,
    {
      internalUsers: InternalUserRow[]
      hubspotOwners: HubSpotOwnerRow[]
    }
  >()

  for (const user of internalUsers) {
    const normalizedEmail = normalizeEmail(user.email)

    if (!normalizedEmail || !isInternalEmail(normalizedEmail)) {
      continue
    }

    const current = profileCandidatesByEmail.get(normalizedEmail) || { internalUsers: [], hubspotOwners: [] }

    current.internalUsers.push(user)
    profileCandidatesByEmail.set(normalizedEmail, current)
  }

  for (const owner of hubSpotOwners) {
    const normalizedEmail = normalizeEmail(owner.email)

    if (!normalizedEmail || !isInternalEmail(normalizedEmail)) {
      continue
    }

    const current = profileCandidatesByEmail.get(normalizedEmail) || { internalUsers: [], hubspotOwners: [] }

    current.hubspotOwners.push(owner)
    profileCandidatesByEmail.set(normalizedEmail, current)
  }

  const unmatchedInternalUsers = internalUsers.filter(user => {
    const normalizedEmail = normalizeEmail(user.email)

    return !normalizedEmail || !profileCandidatesByEmail.has(normalizedEmail)
  })

  const profiles: IdentityProfileRecord[] = []

  for (const [normalizedEmail, bucket] of profileCandidatesByEmail.entries()) {
    const primaryOwner = bucket.hubspotOwners[0] || null
    const primaryInternalUser = bucket.internalUsers[0] || null

    const anchor = primaryOwner
      ? {
          sourceSystem: 'hubspot_crm',
          sourceObjectType: 'owner',
          sourceObjectId: primaryOwner.owner_id
        }
      : {
          sourceSystem: 'greenhouse_auth',
          sourceObjectType: 'client_user',
          sourceObjectId: primaryInternalUser?.user_id || normalizedEmail
        }

    const profileId = buildIdentityProfileId(anchor)
    const publicId = buildIdentityProfilePublicId(anchor)

    const profileFullName = primaryOwner
      ? resolveContactDisplayName({
          hubspotContactId: primaryOwner.owner_id,
          email: primaryOwner.email,
          firstName: primaryOwner.first_name,
          lastName: primaryOwner.last_name
        })
      : primaryInternalUser?.full_name || normalizedEmail

    const profileJobTitle = primaryInternalUser?.job_title || null
    const profileStatus = primaryInternalUser?.status || (primaryOwner?.archived ? 'archived' : 'active')
    const profileActive = primaryInternalUser ? primaryInternalUser.active : !Boolean(primaryOwner?.archived)
    const defaultAuthMode = primaryInternalUser?.auth_mode || 'sso'
    const links: IdentitySourceLinkRecord[] = []

    if (primaryOwner) {
      links.push({
        profileId,
        sourceSystem: 'hubspot_crm',
        sourceObjectType: 'owner',
        sourceObjectId: primaryOwner.owner_id,
        sourceUserId: primaryOwner.owner_id,
        sourceEmail: normalizeEmail(primaryOwner.email),
        sourceDisplayName: profileFullName,
        isPrimary: true,
        isLoginIdentity: false,
        active: !primaryOwner.archived
      })
    }

    for (const user of bucket.internalUsers) {
      links.push({
        profileId,
        sourceSystem: 'greenhouse_auth',
        sourceObjectType: 'client_user',
        sourceObjectId: user.user_id,
        sourceUserId: user.user_id,
        sourceEmail: normalizeEmail(user.email),
        sourceDisplayName: user.full_name,
        isPrimary: !primaryOwner,
        isLoginIdentity: true,
        active: user.active
      })
    }

    profiles.push({
      profileId,
      publicId,
      profileType: 'efeonce_internal',
      canonicalEmail: normalizedEmail,
      fullName: profileFullName,
      jobTitle: profileJobTitle,
      status: profileStatus,
      active: profileActive,
      defaultAuthMode,
      primarySourceSystem: anchor.sourceSystem,
      primarySourceObjectType: anchor.sourceObjectType,
      primarySourceObjectId: anchor.sourceObjectId,
      notes: primaryOwner && bucket.internalUsers.length === 0 ? 'Canonical internal profile seeded from HubSpot owner.' : null,
      links
    })
  }

  for (const user of unmatchedInternalUsers) {
    const anchor = {
      sourceSystem: 'greenhouse_auth',
      sourceObjectType: 'client_user',
      sourceObjectId: user.user_id
    }

    const profileId = buildIdentityProfileId(anchor)

    profiles.push({
      profileId,
      publicId: buildIdentityProfilePublicId(anchor),
      profileType: 'efeonce_internal',
      canonicalEmail: normalizeEmail(user.email),
      fullName: user.full_name,
      jobTitle: user.job_title,
      status: user.status,
      active: user.active,
      defaultAuthMode: user.auth_mode,
      primarySourceSystem: anchor.sourceSystem,
      primarySourceObjectType: anchor.sourceObjectType,
      primarySourceObjectId: anchor.sourceObjectId,
      notes: 'Canonical internal profile seeded from existing Greenhouse auth principal.',
      links: [
        {
          profileId,
          sourceSystem: 'greenhouse_auth',
          sourceObjectType: 'client_user',
          sourceObjectId: user.user_id,
          sourceUserId: user.user_id,
          sourceEmail: normalizeEmail(user.email),
          sourceDisplayName: user.full_name,
          isPrimary: true,
          isLoginIdentity: true,
          active: user.active
        }
      ]
    })
  }

  let linkedClientUsers = 0

  if (!dryRun) {
    for (const profile of profiles) {
      await upsertIdentityProfile(profile)

      for (const link of profile.links) {
        await upsertIdentitySourceLink(link)

        if (link.sourceSystem === 'greenhouse_auth' && link.sourceObjectType === 'client_user' && link.sourceUserId) {
          await updateClientUserIdentityProfile({
            userId: link.sourceUserId,
            profileId: profile.profileId
          })

          linkedClientUsers += 1
        }
      }
    }
  } else {
    linkedClientUsers = profiles.reduce(
      (total, profile) =>
        total +
        profile.links.filter(link => link.sourceSystem === 'greenhouse_auth' && link.sourceObjectType === 'client_user').length,
      0
    )
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        internalUsersScanned: internalUsers.length,
        hubspotOwnersScanned: hubSpotOwners.length,
        profilesPrepared: profiles.length,
        linkedClientUsers,
        preview: profiles.slice(0, 12).map(profile => ({
          profileId: profile.profileId,
          publicId: profile.publicId,
          canonicalEmail: profile.canonicalEmail,
          fullName: profile.fullName,
          primarySource: `${profile.primarySourceSystem}:${profile.primarySourceObjectType}:${profile.primarySourceObjectId}`,
          links: profile.links.map(link => `${link.sourceSystem}:${link.sourceObjectType}:${link.sourceObjectId}`)
        }))
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
