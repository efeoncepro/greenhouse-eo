import 'server-only'

import { query } from '@/lib/db'

// ── Types ──────────────────────────────────────────────────────

export interface TalentOpsMetrics {
  totalMembers: number
  profileHealthScore: number // 0-100 avg completeness across all members

  // Completeness
  completeProfiles: number // members with completeness >= 80%
  incompleteProfiles: number // members with completeness < 80%

  // Verification
  pendingReviewCount: number
  verifiedItemCount: number
  rejectedItemCount: number

  // Expiration
  expiredCertCount: number
  expiringSoonCertCount: number // within 90 days

  // Staleness
  staleProfileCount: number // no skill/tool/cert update in 90+ days

  // Coverage
  skillCatalogCoverage: number // % of catalog skills assigned to at least 1 member
  toolCatalogCoverage: number // % of catalog tools assigned to at least 1 member

  // Evidence & endorsements
  membersWithEvidence: number
  totalEndorsements: number
}

export interface MemberCompleteness {
  memberId: string
  displayName: string
  avatarUrl: string | null
  completenessScore: number // 0-100
  hasHeadline: boolean
  hasAboutMe: boolean
  hasSkills: boolean
  hasTools: boolean
  hasCertifications: boolean
  hasLanguages: boolean
  hasLinks: boolean
  hasEvidence: boolean
  lastProfileUpdate: string | null // most recent updated_at across talent tables
}

export interface SkillGap {
  skillCode: string
  skillName: string
  skillCategory: string
  memberCount: number // how many members have this skill
  verifiedCount: number // how many are verified
}

export interface TalentOpsActionItem {
  type: 'expiring_cert' | 'stale_profile' | 'incomplete_profile' | 'pending_review'
  memberId: string
  memberDisplayName: string
  description: string
  urgency: 'high' | 'medium' | 'low'
  actionUrl: string // link to admin detail
}

// ── Internal row types ─────────────────────────────────────────

type MetricsRow = {
  total_members: string | number
  profile_health_score: string | number
  complete_profiles: string | number
  incomplete_profiles: string | number
  pending_review_count: string | number
  verified_item_count: string | number
  rejected_item_count: string | number
  expired_cert_count: string | number
  expiring_soon_cert_count: string | number
  stale_profile_count: string | number
  skill_catalog_coverage: string | number
  tool_catalog_coverage: string | number
  members_with_evidence: string | number
  total_endorsements: string | number
}

type CompletenessRow = {
  member_id: string
  display_name: string
  avatar_url: string | null
  completeness_score: string | number
  has_headline: boolean
  has_about_me: boolean
  has_skills: boolean
  has_tools: boolean
  has_certifications: boolean
  has_languages: boolean
  has_links: boolean
  has_evidence: boolean
  last_profile_update: string | Date | null
}

type SkillGapRow = {
  skill_code: string
  skill_name: string
  skill_category: string
  member_count: string | number
  verified_count: string | number
}

type ActionItemRow = {
  action_type: string
  member_id: string
  member_display_name: string
  description: string
  urgency: string
  sort_order: string | number
}

// ── Helpers ────────────────────────────────────────────────────

const toInt = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Math.round(value)
  if (typeof value === 'string') return parseInt(value, 10) || 0

  return 0
}

const toFloat = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value) || 0

  return 0
}

const toTimestamp = (value: string | Date | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Computes aggregate talent ops metrics using a single optimized query with CTEs.
 */
export const getTalentOpsMetrics = async (): Promise<TalentOpsMetrics> => {
  const rows = await query<MetricsRow>(
    `
      WITH active_members AS (
        SELECT member_id, display_name, headline, about_me,
               linkedin_url, portfolio_url, twitter_url, threads_url,
               behance_url, github_url, dribbble_url
        FROM greenhouse_core.members
        WHERE active = TRUE AND assignable = TRUE
      ),

      member_dimensions AS (
        SELECT
          am.member_id,
          (
            CASE WHEN am.headline IS NOT NULL AND am.headline <> '' THEN 12.5 ELSE 0 END
            + CASE WHEN am.about_me IS NOT NULL AND am.about_me <> '' THEN 12.5 ELSE 0 END
            + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_skills ms WHERE ms.member_id = am.member_id) THEN 12.5 ELSE 0 END
            + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_tools mt WHERE mt.member_id = am.member_id) THEN 12.5 ELSE 0 END
            + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_certifications mc WHERE mc.member_id = am.member_id) THEN 12.5 ELSE 0 END
            + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_languages ml WHERE ml.member_id = am.member_id) THEN 12.5 ELSE 0 END
            + CASE WHEN (
                COALESCE(am.linkedin_url, '') <> '' OR COALESCE(am.portfolio_url, '') <> '' OR
                COALESCE(am.twitter_url, '') <> '' OR COALESCE(am.threads_url, '') <> '' OR
                COALESCE(am.behance_url, '') <> '' OR COALESCE(am.github_url, '') <> '' OR
                COALESCE(am.dribbble_url, '') <> ''
              ) THEN 12.5 ELSE 0 END
            + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_evidence me WHERE me.member_id = am.member_id) THEN 12.5 ELSE 0 END
          ) AS completeness
        FROM active_members am
      ),

      verification_counts AS (
        SELECT
          COUNT(*) FILTER (WHERE verification_status = 'pending_review') AS pending_review,
          COUNT(*) FILTER (WHERE verification_status = 'verified') AS verified,
          COUNT(*) FILTER (WHERE verification_status = 'rejected') AS rejected
        FROM (
          SELECT verification_status FROM greenhouse_core.member_skills
          WHERE member_id IN (SELECT member_id FROM active_members)
          UNION ALL
          SELECT verification_status FROM greenhouse_core.member_tools
          WHERE member_id IN (SELECT member_id FROM active_members)
          UNION ALL
          SELECT verification_status FROM greenhouse_core.member_certifications
          WHERE member_id IN (SELECT member_id FROM active_members)
        ) all_items
      ),

      cert_expiry AS (
        SELECT
          COUNT(*) FILTER (WHERE expiry_date < CURRENT_DATE) AS expired,
          COUNT(*) FILTER (WHERE expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '90 days') AS expiring_soon
        FROM greenhouse_core.member_certifications
        WHERE member_id IN (SELECT member_id FROM active_members)
          AND expiry_date IS NOT NULL
      ),

      staleness AS (
        SELECT COUNT(*) AS stale_count
        FROM active_members am
        WHERE NOT EXISTS (
          SELECT 1 FROM greenhouse_core.member_skills ms
          WHERE ms.member_id = am.member_id AND ms.updated_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_core.member_tools mt
          WHERE mt.member_id = am.member_id AND mt.updated_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_core.member_certifications mc
          WHERE mc.member_id = am.member_id AND mc.updated_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        )
      ),

      skill_coverage AS (
        SELECT
          CASE WHEN (SELECT COUNT(*) FROM greenhouse_core.skill_catalog) = 0 THEN 0
          ELSE ROUND(
            (COUNT(DISTINCT ms.skill_code)::numeric / NULLIF((SELECT COUNT(*) FROM greenhouse_core.skill_catalog), 0)) * 100,
            1
          )
          END AS coverage
        FROM greenhouse_core.member_skills ms
        WHERE ms.member_id IN (SELECT member_id FROM active_members)
      ),

      tool_coverage AS (
        SELECT
          CASE WHEN (SELECT COUNT(*) FROM greenhouse_core.tool_catalog) = 0 THEN 0
          ELSE ROUND(
            (COUNT(DISTINCT mt.tool_code)::numeric / NULLIF((SELECT COUNT(*) FROM greenhouse_core.tool_catalog), 0)) * 100,
            1
          )
          END AS coverage
        FROM greenhouse_core.member_tools mt
        WHERE mt.member_id IN (SELECT member_id FROM active_members)
      ),

      evidence_stats AS (
        SELECT COUNT(DISTINCT member_id) AS members_with_evidence
        FROM greenhouse_core.member_evidence
        WHERE member_id IN (SELECT member_id FROM active_members)
      ),

      endorsement_stats AS (
        SELECT COUNT(*) AS total_endorsements
        FROM greenhouse_core.member_endorsements
        WHERE member_id IN (SELECT member_id FROM active_members)
          AND status = 'active'
      )

      SELECT
        (SELECT COUNT(*) FROM active_members)                               AS total_members,
        COALESCE((SELECT ROUND(AVG(completeness), 1) FROM member_dimensions), 0) AS profile_health_score,
        (SELECT COUNT(*) FROM member_dimensions WHERE completeness >= 80)   AS complete_profiles,
        (SELECT COUNT(*) FROM member_dimensions WHERE completeness < 80)    AS incomplete_profiles,
        vc.pending_review                                                   AS pending_review_count,
        vc.verified                                                         AS verified_item_count,
        vc.rejected                                                         AS rejected_item_count,
        ce.expired                                                          AS expired_cert_count,
        ce.expiring_soon                                                    AS expiring_soon_cert_count,
        s.stale_count                                                       AS stale_profile_count,
        sc.coverage                                                         AS skill_catalog_coverage,
        tc.coverage                                                         AS tool_catalog_coverage,
        es.members_with_evidence                                            AS members_with_evidence,
        ends.total_endorsements                                             AS total_endorsements
      FROM verification_counts vc,
           cert_expiry ce,
           staleness s,
           skill_coverage sc,
           tool_coverage tc,
           evidence_stats es,
           endorsement_stats ends
    `
  )

  const row = rows[0]

  if (!row) {
    return {
      totalMembers: 0,
      profileHealthScore: 0,
      completeProfiles: 0,
      incompleteProfiles: 0,
      pendingReviewCount: 0,
      verifiedItemCount: 0,
      rejectedItemCount: 0,
      expiredCertCount: 0,
      expiringSoonCertCount: 0,
      staleProfileCount: 0,
      skillCatalogCoverage: 0,
      toolCatalogCoverage: 0,
      membersWithEvidence: 0,
      totalEndorsements: 0
    }
  }

  return {
    totalMembers: toInt(row.total_members),
    profileHealthScore: toFloat(row.profile_health_score),
    completeProfiles: toInt(row.complete_profiles),
    incompleteProfiles: toInt(row.incomplete_profiles),
    pendingReviewCount: toInt(row.pending_review_count),
    verifiedItemCount: toInt(row.verified_item_count),
    rejectedItemCount: toInt(row.rejected_item_count),
    expiredCertCount: toInt(row.expired_cert_count),
    expiringSoonCertCount: toInt(row.expiring_soon_cert_count),
    staleProfileCount: toInt(row.stale_profile_count),
    skillCatalogCoverage: toFloat(row.skill_catalog_coverage),
    toolCatalogCoverage: toFloat(row.tool_catalog_coverage),
    membersWithEvidence: toInt(row.members_with_evidence),
    totalEndorsements: toInt(row.total_endorsements)
  }
}

/**
 * Returns per-member completeness breakdown, sorted worst-first.
 */
export const getMemberCompletenessBreakdown = async (): Promise<MemberCompleteness[]> => {
  const rows = await query<CompletenessRow>(
    `
      WITH active_members AS (
        SELECT member_id, display_name, avatar_url, headline, about_me,
               linkedin_url, portfolio_url, twitter_url, threads_url,
               behance_url, github_url, dribbble_url
        FROM greenhouse_core.members
        WHERE active = TRUE AND assignable = TRUE
      )

      SELECT
        am.member_id,
        am.display_name,
        am.avatar_url,
        (
          CASE WHEN am.headline IS NOT NULL AND am.headline <> '' THEN 1 ELSE 0 END
          + CASE WHEN am.about_me IS NOT NULL AND am.about_me <> '' THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_skills ms WHERE ms.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_tools mt WHERE mt.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_certifications mc WHERE mc.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_languages ml WHERE ml.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN (
              COALESCE(am.linkedin_url, '') <> '' OR COALESCE(am.portfolio_url, '') <> '' OR
              COALESCE(am.twitter_url, '') <> '' OR COALESCE(am.threads_url, '') <> '' OR
              COALESCE(am.behance_url, '') <> '' OR COALESCE(am.github_url, '') <> '' OR
              COALESCE(am.dribbble_url, '') <> ''
            ) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_evidence me WHERE me.member_id = am.member_id) THEN 1 ELSE 0 END
        )::numeric / 8.0 * 100 AS completeness_score,
        (am.headline IS NOT NULL AND am.headline <> '') AS has_headline,
        (am.about_me IS NOT NULL AND am.about_me <> '') AS has_about_me,
        EXISTS (SELECT 1 FROM greenhouse_core.member_skills ms WHERE ms.member_id = am.member_id) AS has_skills,
        EXISTS (SELECT 1 FROM greenhouse_core.member_tools mt WHERE mt.member_id = am.member_id) AS has_tools,
        EXISTS (SELECT 1 FROM greenhouse_core.member_certifications mc WHERE mc.member_id = am.member_id) AS has_certifications,
        EXISTS (SELECT 1 FROM greenhouse_core.member_languages ml WHERE ml.member_id = am.member_id) AS has_languages,
        (
          COALESCE(am.linkedin_url, '') <> '' OR COALESCE(am.portfolio_url, '') <> '' OR
          COALESCE(am.twitter_url, '') <> '' OR COALESCE(am.threads_url, '') <> '' OR
          COALESCE(am.behance_url, '') <> '' OR COALESCE(am.github_url, '') <> '' OR
          COALESCE(am.dribbble_url, '') <> ''
        ) AS has_links,
        EXISTS (SELECT 1 FROM greenhouse_core.member_evidence me WHERE me.member_id = am.member_id) AS has_evidence,
        GREATEST(
          (SELECT MAX(updated_at) FROM greenhouse_core.member_skills ms WHERE ms.member_id = am.member_id),
          (SELECT MAX(updated_at) FROM greenhouse_core.member_tools mt WHERE mt.member_id = am.member_id),
          (SELECT MAX(updated_at) FROM greenhouse_core.member_certifications mc WHERE mc.member_id = am.member_id),
          (SELECT MAX(updated_at) FROM greenhouse_core.member_languages ml WHERE ml.member_id = am.member_id),
          (SELECT MAX(updated_at) FROM greenhouse_core.member_evidence me WHERE me.member_id = am.member_id)
        ) AS last_profile_update
      FROM active_members am
      ORDER BY completeness_score ASC, am.display_name ASC
    `
  )

  return rows.map(row => ({
    memberId: row.member_id,
    displayName: row.display_name || '',
    avatarUrl: row.avatar_url,
    completenessScore: Math.round(toFloat(row.completeness_score)),
    hasHeadline: Boolean(row.has_headline),
    hasAboutMe: Boolean(row.has_about_me),
    hasSkills: Boolean(row.has_skills),
    hasTools: Boolean(row.has_tools),
    hasCertifications: Boolean(row.has_certifications),
    hasLanguages: Boolean(row.has_languages),
    hasLinks: Boolean(row.has_links),
    hasEvidence: Boolean(row.has_evidence),
    lastProfileUpdate: toTimestamp(row.last_profile_update)
  }))
}

/**
 * Returns skill gaps — catalog skills sorted by least member coverage.
 */
export const getSkillGaps = async (): Promise<SkillGap[]> => {
  const rows = await query<SkillGapRow>(
    `
      SELECT
        sc.skill_code,
        sc.skill_name,
        COALESCE(sc.category, 'uncategorized') AS skill_category,
        COUNT(ms.member_id) AS member_count,
        COUNT(ms.member_id) FILTER (WHERE ms.verification_status = 'verified') AS verified_count
      FROM greenhouse_core.skill_catalog sc
      LEFT JOIN greenhouse_core.member_skills ms ON ms.skill_code = sc.skill_code
        AND ms.member_id IN (
          SELECT member_id FROM greenhouse_core.members WHERE active = TRUE AND assignable = TRUE
        )
      GROUP BY sc.skill_code, sc.skill_name, sc.category
      ORDER BY member_count ASC, sc.skill_name ASC
    `
  )

  return rows.map(row => ({
    skillCode: row.skill_code,
    skillName: row.skill_name,
    skillCategory: row.skill_category || 'uncategorized',
    memberCount: toInt(row.member_count),
    verifiedCount: toInt(row.verified_count)
  }))
}

/**
 * Returns prioritized action items combining expiring certs, stale profiles,
 * incomplete profiles, and pending review items.
 */
export const getTalentOpsActionItems = async (limit = 20): Promise<TalentOpsActionItem[]> => {
  const rows = await query<ActionItemRow>(
    `
      WITH active_members AS (
        SELECT member_id, display_name, headline, about_me,
               linkedin_url, portfolio_url, twitter_url, threads_url,
               behance_url, github_url, dribbble_url
        FROM greenhouse_core.members
        WHERE active = TRUE AND assignable = TRUE
      ),

      -- Expiring certs (within 30 days) → high urgency
      expiring_certs AS (
        SELECT
          'expiring_cert'::text AS action_type,
          mc.member_id,
          am.display_name AS member_display_name,
          'Certificacion "' || mc.name || '" expira el ' || TO_CHAR(mc.expiry_date, 'DD/MM/YYYY') AS description,
          'high'::text AS urgency,
          1 AS sort_order
        FROM greenhouse_core.member_certifications mc
        INNER JOIN active_members am ON am.member_id = mc.member_id
        WHERE mc.expiry_date IS NOT NULL
          AND mc.expiry_date >= CURRENT_DATE
          AND mc.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
      ),

      -- Expired certs → high urgency
      expired_certs AS (
        SELECT
          'expiring_cert'::text AS action_type,
          mc.member_id,
          am.display_name AS member_display_name,
          'Certificacion "' || mc.name || '" expiro el ' || TO_CHAR(mc.expiry_date, 'DD/MM/YYYY') AS description,
          'high'::text AS urgency,
          2 AS sort_order
        FROM greenhouse_core.member_certifications mc
        INNER JOIN active_members am ON am.member_id = mc.member_id
        WHERE mc.expiry_date IS NOT NULL
          AND mc.expiry_date < CURRENT_DATE
      ),

      -- Stale profiles (90+ days) → medium urgency
      stale_profiles AS (
        SELECT
          'stale_profile'::text AS action_type,
          am.member_id,
          am.display_name AS member_display_name,
          'Perfil sin actualizacion de skills, tools o certificaciones en 90+ dias' AS description,
          'medium'::text AS urgency,
          3 AS sort_order
        FROM active_members am
        WHERE NOT EXISTS (
          SELECT 1 FROM greenhouse_core.member_skills ms
          WHERE ms.member_id = am.member_id AND ms.updated_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_core.member_tools mt
          WHERE mt.member_id = am.member_id AND mt.updated_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM greenhouse_core.member_certifications mc
          WHERE mc.member_id = am.member_id AND mc.updated_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
        )
      ),

      -- Pending review items → medium urgency
      pending_reviews AS (
        SELECT DISTINCT ON (combined.member_id)
          'pending_review'::text AS action_type,
          combined.member_id,
          am.display_name AS member_display_name,
          'Tiene items pendientes de revision' AS description,
          'medium'::text AS urgency,
          4 AS sort_order
        FROM (
          SELECT member_id FROM greenhouse_core.member_skills WHERE verification_status = 'pending_review'
          UNION
          SELECT member_id FROM greenhouse_core.member_tools WHERE verification_status = 'pending_review'
          UNION
          SELECT member_id FROM greenhouse_core.member_certifications WHERE verification_status = 'pending_review'
        ) combined
        INNER JOIN active_members am ON am.member_id = combined.member_id
      ),

      -- Incomplete profiles (< 50%) → low urgency
      incomplete_profiles AS (
        SELECT
          'incomplete_profile'::text AS action_type,
          am.member_id,
          am.display_name AS member_display_name,
          'Perfil con completitud menor al 50%' AS description,
          'low'::text AS urgency,
          5 AS sort_order
        FROM active_members am
        WHERE (
          CASE WHEN am.headline IS NOT NULL AND am.headline <> '' THEN 1 ELSE 0 END
          + CASE WHEN am.about_me IS NOT NULL AND am.about_me <> '' THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_skills ms WHERE ms.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_tools mt WHERE mt.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_certifications mc WHERE mc.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_languages ml WHERE ml.member_id = am.member_id) THEN 1 ELSE 0 END
          + CASE WHEN (
              COALESCE(am.linkedin_url, '') <> '' OR COALESCE(am.portfolio_url, '') <> '' OR
              COALESCE(am.twitter_url, '') <> '' OR COALESCE(am.threads_url, '') <> '' OR
              COALESCE(am.behance_url, '') <> '' OR COALESCE(am.github_url, '') <> '' OR
              COALESCE(am.dribbble_url, '') <> ''
            ) THEN 1 ELSE 0 END
          + CASE WHEN EXISTS (SELECT 1 FROM greenhouse_core.member_evidence me WHERE me.member_id = am.member_id) THEN 1 ELSE 0 END
        ) < 4  -- less than 4 out of 8 dimensions = < 50%
      )

      SELECT action_type, member_id, member_display_name, description, urgency, sort_order
      FROM (
        SELECT * FROM expiring_certs
        UNION ALL
        SELECT * FROM expired_certs
        UNION ALL
        SELECT * FROM stale_profiles
        UNION ALL
        SELECT * FROM pending_reviews
        UNION ALL
        SELECT * FROM incomplete_profiles
      ) combined_actions
      ORDER BY sort_order ASC, member_display_name ASC
      LIMIT $1
    `,
    [limit]
  )

  return rows.map(row => ({
    type: row.action_type as TalentOpsActionItem['type'],
    memberId: row.member_id,
    memberDisplayName: row.member_display_name || '',
    description: row.description,
    urgency: row.urgency as TalentOpsActionItem['urgency'],
    actionUrl: `/hr/team/${encodeURIComponent(row.member_id)}/profile`
  }))
}
