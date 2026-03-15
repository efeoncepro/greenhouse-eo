import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  const { runGreenhousePostgresQuery, closeGreenhousePostgres } = await import('@/lib/postgres/client')

  try {
    const [coverage] = await runGreenhousePostgresQuery<{
      members_total: number | string
      members_linked: number | string
      users_total: number | string
      users_linked: number | string
      users_with_member: number | string
      internal_users_total: number | string
      internal_users_with_member: number | string
      contacts_total: number | string
      contacts_linked_profile: number | string
      contacts_linked_user: number | string
      contacts_linked_owner_member: number | string
      contacts_linked_owner_user: number | string
      profiles_total: number | string
    }>(
      `
        WITH members AS (
          SELECT
            COUNT(*)::int AS members_total,
            COUNT(identity_profile_id)::int AS members_linked
          FROM greenhouse_core.members
        ),
        users AS (
          SELECT
            COUNT(*)::int AS users_total,
            COUNT(identity_profile_id)::int AS users_linked,
            COUNT(*) FILTER (
              WHERE identity_profile_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM greenhouse_core.members m
                  WHERE m.identity_profile_id = greenhouse_core.client_users.identity_profile_id
                )
            )::int AS users_with_member,
            COUNT(*) FILTER (WHERE tenant_type = 'efeonce_internal')::int AS internal_users_total,
            COUNT(*) FILTER (
              WHERE tenant_type = 'efeonce_internal'
                AND identity_profile_id IS NOT NULL
                AND EXISTS (
                  SELECT 1
                  FROM greenhouse_core.members m
                  WHERE m.identity_profile_id = greenhouse_core.client_users.identity_profile_id
                )
            )::int AS internal_users_with_member
          FROM greenhouse_core.client_users
        ),
        contacts AS (
          SELECT
            COUNT(*)::int AS contacts_total,
            COUNT(linked_identity_profile_id)::int AS contacts_linked_profile,
            COUNT(linked_user_id)::int AS contacts_linked_user,
            COUNT(owner_member_id)::int AS contacts_linked_owner_member,
            COUNT(owner_user_id)::int AS contacts_linked_owner_user
          FROM greenhouse_crm.contacts
        ),
        profiles AS (
          SELECT COUNT(*)::int AS profiles_total
          FROM greenhouse_core.identity_profiles
        )
        SELECT *
        FROM members, users, contacts, profiles
      `
    )

    const [facetCoverage] = await runGreenhousePostgresQuery<{
      total_profiles: number | string
      profiles_with_member: number | string
      profiles_with_user: number | string
      profiles_with_contact: number | string
      profiles_with_member_and_user: number | string
      profiles_with_member_and_contact: number | string
      profiles_with_user_and_contact: number | string
      profiles_with_all_three: number | string
      profiles_without_any_facet: number | string
    }>(
      `
        SELECT
          COUNT(*)::int AS total_profiles,
          COUNT(*) FILTER (WHERE has_member)::int AS profiles_with_member,
          COUNT(*) FILTER (WHERE has_user)::int AS profiles_with_user,
          COUNT(*) FILTER (WHERE has_contact)::int AS profiles_with_contact,
          COUNT(*) FILTER (WHERE has_member AND has_user)::int AS profiles_with_member_and_user,
          COUNT(*) FILTER (WHERE has_member AND has_contact)::int AS profiles_with_member_and_contact,
          COUNT(*) FILTER (WHERE has_user AND has_contact)::int AS profiles_with_user_and_contact,
          COUNT(*) FILTER (WHERE has_member AND has_user AND has_contact)::int AS profiles_with_all_three,
          COUNT(*) FILTER (WHERE NOT has_member AND NOT has_user AND NOT has_contact)::int AS profiles_without_any_facet
        FROM (
          SELECT
            p.profile_id,
            EXISTS(
              SELECT 1
              FROM greenhouse_core.members m
              WHERE m.identity_profile_id = p.profile_id
            ) AS has_member,
            EXISTS(
              SELECT 1
              FROM greenhouse_core.client_users u
              WHERE u.identity_profile_id = p.profile_id
            ) AS has_user,
            EXISTS(
              SELECT 1
              FROM greenhouse_crm.contacts c
              WHERE c.linked_identity_profile_id = p.profile_id
            ) AS has_contact
          FROM greenhouse_core.identity_profiles p
        ) facets
      `
    )

    const gaps = await runGreenhousePostgresQuery<{
      metric: string
      count: number | string
    }>(
      `
        SELECT 'members_without_profile' AS metric, COUNT(*)::int AS count
        FROM greenhouse_core.members
        WHERE identity_profile_id IS NULL
        UNION ALL
        SELECT 'users_without_profile', COUNT(*)::int
        FROM greenhouse_core.client_users
        WHERE identity_profile_id IS NULL
        UNION ALL
        SELECT 'contacts_without_profile', COUNT(*)::int
        FROM greenhouse_crm.contacts
        WHERE linked_identity_profile_id IS NULL
        UNION ALL
        SELECT 'internal_users_without_member', COUNT(*)::int
        FROM greenhouse_core.client_users
        WHERE tenant_type = 'efeonce_internal'
          AND (
            identity_profile_id IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM greenhouse_core.members m
              WHERE m.identity_profile_id = greenhouse_core.client_users.identity_profile_id
            )
          )
        UNION ALL
        SELECT 'profiles_without_any_facet', COUNT(*)::int
        FROM greenhouse_core.identity_profiles p
        WHERE NOT EXISTS (
          SELECT 1 FROM greenhouse_core.members m WHERE m.identity_profile_id = p.profile_id
        )
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_core.client_users u WHERE u.identity_profile_id = p.profile_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_crm.contacts c WHERE c.linked_identity_profile_id = p.profile_id
          )
      `
    )

    const unresolvedSamples = await runGreenhousePostgresQuery<{
      facet_type: string
      facet_id: string
      display_name: string | null
      email: string | null
    }>(
      `
        SELECT *
        FROM (
          SELECT
            'member'::text AS facet_type,
            m.member_id AS facet_id,
            m.display_name,
            m.primary_email AS email,
            1 AS sort_group
          FROM greenhouse_core.members m
          WHERE m.identity_profile_id IS NULL

          UNION ALL

          SELECT
            'user'::text AS facet_type,
            u.user_id AS facet_id,
            u.full_name AS display_name,
            u.email,
            2 AS sort_group
          FROM greenhouse_core.client_users u
          WHERE u.identity_profile_id IS NULL

          UNION ALL

          SELECT
            'crm_contact'::text AS facet_type,
            c.contact_record_id AS facet_id,
            c.display_name,
            c.email,
            3 AS sort_group
          FROM greenhouse_crm.contacts c
          WHERE c.linked_identity_profile_id IS NULL
        ) unresolved
        ORDER BY sort_group, display_name NULLS LAST, facet_id
        LIMIT 15
      `
    )

    console.log(
      JSON.stringify(
        {
          coverage,
          facetCoverage,
          gaps,
          unresolvedSamples: unresolvedSamples.map(({ facet_type, facet_id, display_name, email }) => ({
            facet_type,
            facet_id,
            display_name,
            email
          }))
        },
        null,
        2
      )
    )
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
