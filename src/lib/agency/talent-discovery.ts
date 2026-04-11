import 'server-only'

import { query } from '@/lib/db'
import { readMemberCapacityEconomicsBatch } from '@/lib/member-capacity-economics/store'

// ── Types ──────────────────────────────────────────────────────

export interface TalentDiscoveryFilters {
  q?: string
  skillCodes?: string[]
  toolCodes?: string[]
  languageCodes?: string[]
  verificationFilter?: 'all' | 'verified_only' | 'has_verified'
  availabilityMin?: number
  sortBy?: 'relevance' | 'availability' | 'verified_count'
}

export interface TalentDiscoveryResult {
  memberId: string
  displayName: string
  avatarUrl: string | null
  headline: string | null
  roleTitle: string | null
  locationCity: string | null
  locationCountry: string | null

  skillCount: number
  verifiedSkillCount: number
  toolCount: number
  certificationCount: number
  activeCertCount: number
  languageCount: number

  commercialAvailabilityHours: number | null
  utilizationPercent: number | null
  capacityHealth: string | null

  topSkills: Array<{ skillName: string; seniorityLevel: string; verified: boolean }>
  topTools: Array<{ toolName: string; iconKey: string | null; verified: boolean }>
  topLanguages: Array<{ languageName: string; proficiencyLevel: string }>

  discoveryScore: number
}

export interface TalentDiscoverySummary {
  totalMembers: number
  membersWithSkills: number
  membersWithVerifiedItems: number
  topSkillCategories: Array<{ category: string; count: number }>
  averageAvailabilityHours: number | null
}

// ── Internal row types ─────────────────────────────────────────

type MemberAggregateRow = {
  member_id: string
  display_name: string
  avatar_url: string | null
  headline: string | null
  role_title: string | null
  location_city: string | null
  location_country: string | null
  skill_count: string | number
  verified_skill_count: string | number
  tool_count: string | number
  certification_count: string | number
  active_cert_count: string | number
  language_count: string | number
  verified_tool_count: string | number
  verified_cert_count: string | number
}

type TopSkillRow = {
  member_id: string
  skill_name: string
  seniority_level: string
  verified: boolean
}

type TopToolRow = {
  member_id: string
  tool_name: string
  icon_key: string | null
  verified: boolean
}

type TopLanguageRow = {
  member_id: string
  language_name: string
  proficiency_level: string
}

type SummaryRow = {
  total_members: string | number
  members_with_skills: string | number
  members_with_verified_items: string | number
}

type SkillCategoryRow = {
  category: string
  count: string | number
}

// ── Helpers ────────────────────────────────────────────────────

const toNum = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const getCurrentPeriod = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  return {
    year: match ? Number(match[1]) : new Date().getFullYear(),
    month: match ? Number(match[2]) : new Date().getMonth() + 1
  }
}

const SENIORITY_SCORE: Record<string, number> = {
  lead: 4,
  senior: 3,
  mid: 2,
  junior: 1
}

const deriveCapacityHealth = (
  commercialHours: number | null,
  contractedHours: number | null,
  utilizationPercent: number | null
): string | null => {
  if (utilizationPercent == null) return null
  if (utilizationPercent < 30) return 'idle'
  if (utilizationPercent <= 80) return 'balanced'
  if (utilizationPercent <= 100) return 'high'

  return 'overloaded'
}

const computeDiscoveryScore = ({
  skillCount,
  toolCount,
  certCount,
  languageCount,
  headline,
  verifiedSkillCount,
  verifiedToolCount,
  verifiedCertCount,
  totalVerifiable,
  commercialHours,
  contractedHours,
  activeCertCount,
  seniorityBonus
}: {
  skillCount: number
  toolCount: number
  certCount: number
  languageCount: number
  headline: string | null
  verifiedSkillCount: number
  verifiedToolCount: number
  verifiedCertCount: number
  totalVerifiable: number
  commercialHours: number | null
  contractedHours: number | null
  activeCertCount: number
  seniorityBonus: boolean
}): number => {
  // Profile completeness (0-20)
  let completeness = 0

  if (skillCount > 0) completeness += 5
  if (toolCount > 0) completeness += 4
  if (certCount > 0) completeness += 4
  if (languageCount > 0) completeness += 4
  if (headline && headline.trim().length > 0) completeness += 3

  // Verification (0-30)
  const totalVerified = verifiedSkillCount + verifiedToolCount + verifiedCertCount
  const verificationRatio = totalVerifiable > 0 ? totalVerified / totalVerifiable : 0
  const verification = Math.round(verificationRatio * 30)

  // Availability (0-25)
  let availability = 0

  if (commercialHours != null && contractedHours != null && contractedHours > 0) {
    const ratio = Math.min(1, commercialHours / contractedHours)

    availability = Math.round(ratio * 25)
  }

  // Certification freshness (0-15)
  const certFreshness = certCount > 0 ? Math.round((activeCertCount / certCount) * 15) : 0

  // Skill depth (0-10)
  const depth = seniorityBonus ? 10 : 0

  return Math.min(100, completeness + verification + availability + certFreshness + depth)
}

export class TalentDiscoveryError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'TalentDiscoveryError'
    this.statusCode = statusCode
  }
}

// ── Main search function ───────────────────────────────────────

export const searchTalent = async (
  filters: TalentDiscoveryFilters
): Promise<{ items: TalentDiscoveryResult[]; summary: TalentDiscoverySummary }> => {
  const {
    q,
    skillCodes,
    toolCodes,
    languageCodes,
    verificationFilter = 'all',
    availabilityMin,
    sortBy = 'relevance'
  } = filters

  // ── Build dynamic WHERE clauses and params ──

  let filterClause = ''
  const params: unknown[] = []
  let paramIndex = 1

  if (q && q.trim().length > 0) {
    const term = `%${q.trim()}%`

    filterClause += ` AND (
      m.display_name ILIKE $${paramIndex}
      OR m.headline ILIKE $${paramIndex}
      OR m.role_title ILIKE $${paramIndex}
    )`
    params.push(term)
    paramIndex++
  }

  let skillJoin = ''

  if (skillCodes && skillCodes.length > 0) {
    skillJoin = `
      INNER JOIN greenhouse_core.member_skills ms_filter
        ON ms_filter.member_id = m.member_id
        AND ms_filter.skill_code = ANY($${paramIndex}::text[])
    `
    params.push(skillCodes)
    paramIndex++
  }

  let toolJoin = ''

  if (toolCodes && toolCodes.length > 0) {
    toolJoin = `
      INNER JOIN greenhouse_core.member_tools mt_filter
        ON mt_filter.member_id = m.member_id
        AND mt_filter.tool_code = ANY($${paramIndex}::text[])
    `
    params.push(toolCodes)
    paramIndex++
  }

  let languageJoin = ''

  if (languageCodes && languageCodes.length > 0) {
    languageJoin = `
      INNER JOIN greenhouse_core.member_languages ml_filter
        ON ml_filter.member_id = m.member_id
        AND ml_filter.language_code = ANY($${paramIndex}::text[])
    `
    params.push(languageCodes)
    paramIndex++
  }

  if (verificationFilter === 'verified_only' || verificationFilter === 'has_verified') {
    filterClause += `
      AND (
        EXISTS (
          SELECT 1 FROM greenhouse_core.member_skills ms_v
          WHERE ms_v.member_id = m.member_id AND ms_v.verification_status = 'verified'
        )
        OR EXISTS (
          SELECT 1 FROM greenhouse_core.member_tools mt_v
          WHERE mt_v.member_id = m.member_id AND mt_v.verification_status = 'verified'
        )
        OR EXISTS (
          SELECT 1 FROM greenhouse_core.member_certifications mc_v
          WHERE mc_v.member_id = m.member_id AND mc_v.verification_status = 'verified'
        )
      )
    `
  }

  // ── Main aggregate query ──

  const memberRows = await query<MemberAggregateRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.avatar_url,
        m.headline,
        m.role_title,
        m.location_city,
        m.location_country,
        COALESCE(sk.skill_count, 0) AS skill_count,
        COALESCE(sk.verified_skill_count, 0) AS verified_skill_count,
        COALESCE(tl.tool_count, 0) AS tool_count,
        COALESCE(tl.verified_tool_count, 0) AS verified_tool_count,
        COALESCE(ct.certification_count, 0) AS certification_count,
        COALESCE(ct.active_cert_count, 0) AS active_cert_count,
        COALESCE(ct.verified_cert_count, 0) AS verified_cert_count,
        COALESCE(lg.language_count, 0) AS language_count
      FROM greenhouse_core.members m
      ${skillJoin}
      ${toolJoin}
      ${languageJoin}
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS skill_count,
          COUNT(*) FILTER (WHERE ms.verification_status = 'verified') AS verified_skill_count
        FROM greenhouse_core.member_skills ms
        WHERE ms.member_id = m.member_id
      ) sk ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS tool_count,
          COUNT(*) FILTER (WHERE mt.verification_status = 'verified') AS verified_tool_count
        FROM greenhouse_core.member_tools mt
        WHERE mt.member_id = m.member_id
      ) tl ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) AS certification_count,
          COUNT(*) FILTER (
            WHERE mc.verification_status = 'verified'
          ) AS verified_cert_count,
          COUNT(*) FILTER (
            WHERE mc.verification_status = 'verified'
              AND (mc.expiry_date IS NULL OR mc.expiry_date >= CURRENT_DATE)
          ) AS active_cert_count
        FROM greenhouse_core.member_certifications mc
        WHERE mc.member_id = m.member_id
      ) ct ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS language_count
        FROM greenhouse_core.member_languages ml
        WHERE ml.member_id = m.member_id
      ) lg ON TRUE
      WHERE m.active = TRUE
        AND m.assignable = TRUE
        ${filterClause}
      ORDER BY m.display_name ASC
    `,
    params
  )

  if (memberRows.length === 0) {
    const summaryResult = await getTalentDiscoverySummary()

    return { items: [], summary: summaryResult }
  }

  const memberIds = memberRows.map(row => row.member_id)

  // ── Fetch capacity economics batch ──

  const { year, month } = getCurrentPeriod()

  const capacityMap = await readMemberCapacityEconomicsBatch({
    memberIds,
    year,
    month
  }).catch(() => new Map())

  // ── Fetch top items per member (skills, tools, languages) ──

  const [topSkillRows, topToolRows, topLanguageRows] = await Promise.all([
    query<TopSkillRow>(
      `
        SELECT ranked.*
        FROM (
          SELECT
            ms.member_id,
            sc.skill_name,
            ms.seniority_level,
            (ms.verification_status = 'verified') AS verified,
            ROW_NUMBER() OVER (
              PARTITION BY ms.member_id
              ORDER BY
                CASE WHEN ms.verification_status = 'verified' THEN 0 ELSE 1 END,
                CASE ms.seniority_level
                  WHEN 'lead' THEN 0
                  WHEN 'senior' THEN 1
                  WHEN 'mid' THEN 2
                  WHEN 'junior' THEN 3
                  ELSE 4
                END,
                sc.display_order NULLS LAST,
                sc.skill_name
            ) AS rn
          FROM greenhouse_core.member_skills ms
          INNER JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = ms.skill_code
          WHERE ms.member_id = ANY($1::text[])
        ) ranked
        WHERE ranked.rn <= 5
      `,
      [memberIds]
    ),
    query<TopToolRow>(
      `
        SELECT ranked.*
        FROM (
          SELECT
            mt.member_id,
            tc.tool_name,
            tc.icon_key,
            (mt.verification_status = 'verified') AS verified,
            ROW_NUMBER() OVER (
              PARTITION BY mt.member_id
              ORDER BY
                CASE WHEN mt.verification_status = 'verified' THEN 0 ELSE 1 END,
                CASE mt.proficiency_level
                  WHEN 'expert' THEN 0
                  WHEN 'advanced' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'beginner' THEN 3
                  ELSE 4
                END,
                tc.display_order NULLS LAST,
                tc.tool_name
            ) AS rn
          FROM greenhouse_core.member_tools mt
          INNER JOIN greenhouse_core.tool_catalog tc ON tc.tool_code = mt.tool_code
          WHERE mt.member_id = ANY($1::text[])
        ) ranked
        WHERE ranked.rn <= 5
      `,
      [memberIds]
    ),
    query<TopLanguageRow>(
      `
        SELECT ranked.*
        FROM (
          SELECT
            ml.member_id,
            ml.language_name,
            ml.proficiency_level,
            ROW_NUMBER() OVER (
              PARTITION BY ml.member_id
              ORDER BY
                CASE ml.proficiency_level
                  WHEN 'native' THEN 0
                  WHEN 'fluent' THEN 1
                  WHEN 'professional' THEN 2
                  WHEN 'conversational' THEN 3
                  WHEN 'basic' THEN 4
                  ELSE 5
                END,
                ml.language_name
            ) AS rn
          FROM greenhouse_core.member_languages ml
          WHERE ml.member_id = ANY($1::text[])
        ) ranked
        WHERE ranked.rn <= 5
      `,
      [memberIds]
    )
  ])

  // ── Index top items by member ──

  const topSkillsByMember = new Map<string, TopSkillRow[]>()

  for (const row of topSkillRows) {
    const list = topSkillsByMember.get(row.member_id) || []

    list.push(row)
    topSkillsByMember.set(row.member_id, list)
  }

  const topToolsByMember = new Map<string, TopToolRow[]>()

  for (const row of topToolRows) {
    const list = topToolsByMember.get(row.member_id) || []

    list.push(row)
    topToolsByMember.set(row.member_id, list)
  }

  const topLanguagesByMember = new Map<string, TopLanguageRow[]>()

  for (const row of topLanguageRows) {
    const list = topLanguagesByMember.get(row.member_id) || []

    list.push(row)
    topLanguagesByMember.set(row.member_id, list)
  }

  // ── Assemble results ──

  let results: TalentDiscoveryResult[] = memberRows.map(row => {
    const memberId = row.member_id
    const skillCount = toNum(row.skill_count)
    const verifiedSkillCount = toNum(row.verified_skill_count)
    const toolCount = toNum(row.tool_count)
    const verifiedToolCount = toNum(row.verified_tool_count)
    const certificationCount = toNum(row.certification_count)
    const activeCertCount = toNum(row.active_cert_count)
    const verifiedCertCount = toNum(row.verified_cert_count)
    const languageCount = toNum(row.language_count)

    const capacity = capacityMap.get(memberId)
    const contractedHours = capacity?.contractedHours ?? null
    const commercialAvailabilityHours = capacity?.commercialAvailabilityHours ?? null
    const utilizationPercent = capacity?.usagePercent ?? null

    const memberTopSkills = topSkillsByMember.get(memberId) || []

    const hasSeniorOrLead = memberTopSkills.some(
      s => SENIORITY_SCORE[s.seniority_level] != null && SENIORITY_SCORE[s.seniority_level] >= 3
    )

    const totalVerifiable = skillCount + toolCount + certificationCount

    const discoveryScore = computeDiscoveryScore({
      skillCount,
      toolCount,
      certCount: certificationCount,
      languageCount,
      headline: row.headline,
      verifiedSkillCount,
      verifiedToolCount,
      verifiedCertCount,
      totalVerifiable,
      commercialHours: commercialAvailabilityHours,
      contractedHours,
      activeCertCount,
      seniorityBonus: hasSeniorOrLead
    })

    return {
      memberId,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      headline: row.headline,
      roleTitle: row.role_title,
      locationCity: row.location_city,
      locationCountry: row.location_country,
      skillCount,
      verifiedSkillCount,
      toolCount,
      certificationCount,
      activeCertCount,
      languageCount,
      commercialAvailabilityHours,
      utilizationPercent,
      capacityHealth: deriveCapacityHealth(commercialAvailabilityHours, contractedHours, utilizationPercent),
      topSkills: memberTopSkills.map(s => ({
        skillName: s.skill_name,
        seniorityLevel: s.seniority_level,
        verified: s.verified
      })),
      topTools: (topToolsByMember.get(memberId) || []).map(t => ({
        toolName: t.tool_name,
        iconKey: t.icon_key,
        verified: t.verified
      })),
      topLanguages: (topLanguagesByMember.get(memberId) || []).map(l => ({
        languageName: l.language_name,
        proficiencyLevel: l.proficiency_level
      })),
      discoveryScore
    }
  })

  // ── Apply availability filter (post-query, since capacity data comes from a separate store) ──

  if (availabilityMin != null && availabilityMin > 0) {
    results = results.filter(
      r => r.commercialAvailabilityHours != null && r.commercialAvailabilityHours >= availabilityMin
    )
  }

  // ── Sort ──

  if (sortBy === 'availability') {
    results.sort((a, b) => (b.commercialAvailabilityHours ?? -1) - (a.commercialAvailabilityHours ?? -1))
  } else if (sortBy === 'verified_count') {
    results.sort((a, b) => b.verifiedSkillCount - a.verifiedSkillCount || b.discoveryScore - a.discoveryScore)
  } else {
    // relevance — sort by discoveryScore descending
    results.sort((a, b) => b.discoveryScore - a.discoveryScore || a.displayName.localeCompare(b.displayName))
  }

  // ── Build summary inline ──

  const summaryResult = await getTalentDiscoverySummary()

  return { items: results, summary: summaryResult }
}

// ── Summary function ───────────────────────────────────────────

export const getTalentDiscoverySummary = async (): Promise<TalentDiscoverySummary> => {
  const [summaryRows, categoryRows, availabilityRows] = await Promise.all([
    query<SummaryRow>(
      `
        SELECT
          COUNT(*) AS total_members,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM greenhouse_core.member_skills ms WHERE ms.member_id = m.member_id
            )
          ) AS members_with_skills,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1 FROM greenhouse_core.member_skills ms
              WHERE ms.member_id = m.member_id AND ms.verification_status = 'verified'
            )
            OR EXISTS (
              SELECT 1 FROM greenhouse_core.member_tools mt
              WHERE mt.member_id = m.member_id AND mt.verification_status = 'verified'
            )
            OR EXISTS (
              SELECT 1 FROM greenhouse_core.member_certifications mc
              WHERE mc.member_id = m.member_id AND mc.verification_status = 'verified'
            )
          ) AS members_with_verified_items
        FROM greenhouse_core.members m
        WHERE m.active = TRUE AND m.assignable = TRUE
      `
    ),
    query<SkillCategoryRow>(
      `
        SELECT
          sc.skill_category AS category,
          COUNT(DISTINCT ms.member_id) AS count
        FROM greenhouse_core.member_skills ms
        INNER JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = ms.skill_code
        INNER JOIN greenhouse_core.members m
          ON m.member_id = ms.member_id AND m.active = TRUE AND m.assignable = TRUE
        GROUP BY sc.skill_category
        ORDER BY count DESC
        LIMIT 10
      `
    ),
    query<{ avg_hours: string | number | null }>(
      `
        SELECT AVG(mce.commercial_availability_hours) AS avg_hours
        FROM greenhouse_serving.member_capacity_economics mce
        INNER JOIN greenhouse_core.members m
          ON m.member_id = mce.member_id AND m.active = TRUE AND m.assignable = TRUE
        WHERE mce.period_year = $1 AND mce.period_month = $2
      `,
      [getCurrentPeriod().year, getCurrentPeriod().month]
    )
  ])

  const summaryRow = summaryRows[0]
  const avgRow = availabilityRows[0]

  return {
    totalMembers: toNum(summaryRow?.total_members),
    membersWithSkills: toNum(summaryRow?.members_with_skills),
    membersWithVerifiedItems: toNum(summaryRow?.members_with_verified_items),
    topSkillCategories: categoryRows.map(row => ({
      category: row.category,
      count: toNum(row.count)
    })),
    averageAvailabilityHours: avgRow?.avg_hours != null
      ? Math.round(toNum(avgRow.avg_hours) * 100) / 100
      : null
  }
}
