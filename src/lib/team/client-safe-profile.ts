import 'server-only'

import { query } from '@/lib/db'

// ── Types ────────────────────────────────────────────────────

export interface ClientSafeTalentProfile {
  memberId: string
  displayName: string
  avatarUrl: string | null
  headline: string | null
  aboutMe: string | null

  skills: Array<{
    skillName: string
    skillCategory: string
    seniorityLevel: string
  }>

  tools: Array<{
    toolName: string
    toolCategory: string
    iconKey: string | null
    proficiencyLevel: string
  }>

  certifications: Array<{
    name: string
    issuer: string
    issuedDate: string | null
    expiryDate: string | null
    validationUrl: string | null
    hasEvidence: boolean
  }>

  languages: Array<{
    languageName: string
    proficiencyLevel: string
  }>

  professionalLinks: {
    linkedinUrl: string | null
    portfolioUrl: string | null
    behanceUrl: string | null
    githubUrl: string | null
    dribbbleUrl: string | null
  }

  verifiedItemCount: number
  isVerifiedByEfeonce: boolean
}

// ── Error ────────────────────────────────────────────────────

export class ClientSafeProfileError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ClientSafeProfileError'
    this.statusCode = statusCode
  }
}

// ── Row types ────────────────────────────────────────────────

interface MemberBasicsRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  avatar_url: string | null
  headline: string | null
  about_me: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  behance_url: string | null
  github_url: string | null
  dribbble_url: string | null
}

interface SkillRow extends Record<string, unknown> {
  skill_name: string
  skill_category: string
  seniority_level: string
}

interface ToolRow extends Record<string, unknown> {
  tool_name: string
  tool_category: string
  icon_key: string | null
  proficiency_level: string
}

interface CertificationRow extends Record<string, unknown> {
  name: string
  issuer: string
  issued_date: Date | string | null
  expiry_date: Date | string | null
  validation_url: string | null
  asset_id: string | null
}

interface LanguageRow extends Record<string, unknown> {
  language_name: string
  proficiency_level: string
}

interface AssignmentCheckRow extends Record<string, unknown> {
  member_id: string
}

// ── Helpers ──────────────────────────────────────────────────

const toDateString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return null
}

// ── Core: build profile for a single verified member ─────────

const buildProfileForMember = async (memberId: string): Promise<ClientSafeTalentProfile | null> => {
  // 1. Member basics — only client-safe fields
  const memberRows = await query<MemberBasicsRow>(
    `SELECT
      member_id,
      display_name,
      avatar_url,
      headline,
      about_me,
      linkedin_url,
      portfolio_url,
      behance_url,
      github_url,
      dribbble_url
    FROM greenhouse_core.members
    WHERE member_id = $1
      AND active = TRUE`,
    [memberId]
  )

  if (memberRows.length === 0) return null

  const m = memberRows[0]

  // 2. Verified, client-visible skills
  const skills = await query<SkillRow>(
    `SELECT
      sc.skill_name,
      sc.skill_category,
      ms.seniority_level
    FROM greenhouse_core.member_skills ms
    JOIN greenhouse_core.skill_catalog sc ON sc.skill_code = ms.skill_code
    WHERE ms.member_id = $1
      AND ms.visibility = 'client_visible'
      AND ms.verification_status = 'verified'
    ORDER BY sc.skill_category, sc.skill_name`,
    [memberId]
  )

  // 3. Verified, client-visible tools
  const tools = await query<ToolRow>(
    `SELECT
      tc.tool_name,
      tc.tool_category,
      tc.icon_key,
      mt.proficiency_level
    FROM greenhouse_core.member_tools mt
    JOIN greenhouse_core.tool_catalog tc ON tc.tool_code = mt.tool_code
    WHERE mt.member_id = $1
      AND mt.visibility = 'client_visible'
      AND mt.verification_status = 'verified'
    ORDER BY tc.tool_category, tc.tool_name`,
    [memberId]
  )

  // 4. Verified, client-visible, non-expired certifications
  const certifications = await query<CertificationRow>(
    `SELECT
      name,
      issuer,
      issued_date,
      expiry_date,
      validation_url,
      asset_id
    FROM greenhouse_core.member_certifications
    WHERE member_id = $1
      AND visibility = 'client_visible'
      AND verification_status = 'verified'
      AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
    ORDER BY issued_date DESC NULLS LAST`,
    [memberId]
  )

  // 5. Client-visible languages
  const languages = await query<LanguageRow>(
    `SELECT
      language_name,
      proficiency_level
    FROM greenhouse_core.member_languages
    WHERE member_id = $1
      AND visibility = 'client_visible'
    ORDER BY
      CASE proficiency_level
        WHEN 'native' THEN 1
        WHEN 'fluent' THEN 2
        WHEN 'professional' THEN 3
        WHEN 'conversational' THEN 4
        WHEN 'basic' THEN 5
        ELSE 6
      END`,
    [memberId]
  )

  // 6. Compute verification metrics
  const verifiedItemCount = skills.length + tools.length + certifications.length

  return {
    memberId: m.member_id,
    displayName: m.display_name,
    avatarUrl: m.avatar_url ?? null,
    headline: m.headline ?? null,
    aboutMe: m.about_me ?? null,

    skills: skills.map(s => ({
      skillName: s.skill_name,
      skillCategory: s.skill_category,
      seniorityLevel: s.seniority_level
    })),

    tools: tools.map(t => ({
      toolName: t.tool_name,
      toolCategory: t.tool_category,
      iconKey: t.icon_key ?? null,
      proficiencyLevel: t.proficiency_level
    })),

    certifications: certifications.map(c => ({
      name: c.name,
      issuer: c.issuer,
      issuedDate: toDateString(c.issued_date),
      expiryDate: toDateString(c.expiry_date),
      validationUrl: c.validation_url ?? null,
      hasEvidence: c.asset_id !== null
    })),

    languages: languages.map(l => ({
      languageName: l.language_name,
      proficiencyLevel: l.proficiency_level
    })),

    professionalLinks: {
      linkedinUrl: m.linkedin_url ?? null,
      portfolioUrl: m.portfolio_url ?? null,
      behanceUrl: m.behance_url ?? null,
      githubUrl: m.github_url ?? null,
      dribbbleUrl: m.dribbble_url ?? null
    },

    verifiedItemCount,
    isVerifiedByEfeonce: verifiedItemCount > 0
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Returns a client-safe talent profile for a member assigned to the given client.
 *
 * Verifies the member is actively assigned to the client before returning any data.
 * Only verified, client-visible items are included. Sensitive fields (phone, address,
 * internal notes, rejection reasons, verified_by, etc.) are never returned.
 */
export const getClientSafeProfile = async (
  memberId: string,
  clientId: string
): Promise<ClientSafeTalentProfile> => {
  // Guard: verify member is assigned to this client
  const assignments = await query<AssignmentCheckRow>(
    `SELECT member_id
    FROM greenhouse_core.client_team_assignments
    WHERE client_id = $1
      AND member_id = $2
      AND active = TRUE
    LIMIT 1`,
    [clientId, memberId]
  )

  if (assignments.length === 0) {
    throw new ClientSafeProfileError('Miembro no encontrado en el equipo del cliente.', 404)
  }

  const profile = await buildProfileForMember(memberId)

  if (!profile) {
    throw new ClientSafeProfileError('Miembro no encontrado.', 404)
  }

  return profile
}

/**
 * Returns client-safe talent profiles for all active members assigned to a client.
 *
 * Only members with at least some client-visible data are included in the response.
 */
export const getClientSafeTeamProfiles = async (
  clientId: string
): Promise<ClientSafeTalentProfile[]> => {
  // Get all active member assignments for this client
  const assignments = await query<AssignmentCheckRow>(
    `SELECT DISTINCT member_id
    FROM greenhouse_core.client_team_assignments
    WHERE client_id = $1
      AND active = TRUE
    ORDER BY member_id`,
    [clientId]
  )

  if (assignments.length === 0) {
    return []
  }

  // Build profiles in parallel
  const profilePromises = assignments.map(a => buildProfileForMember(a.member_id))
  const profiles = await Promise.all(profilePromises)

  // Filter out nulls (inactive members) and members with no client-visible data
  return profiles.filter((p): p is ClientSafeTalentProfile => {
    if (!p) return false

    const hasVisibleData =
      p.skills.length > 0 ||
      p.tools.length > 0 ||
      p.certifications.length > 0 ||
      p.languages.length > 0 ||
      p.headline !== null ||
      p.aboutMe !== null

    return hasVisibleData
  })
}
