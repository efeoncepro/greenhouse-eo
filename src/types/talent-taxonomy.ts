/* ─── Tool Catalog & Member Tools ─── */

export const TOOL_VERIFICATION_STATUSES = ['self_declared', 'pending_review', 'verified', 'rejected'] as const
export type ToolVerificationStatus = (typeof TOOL_VERIFICATION_STATUSES)[number]

export const TOOL_CATEGORY_VALUES = [
  'design', 'development', 'analytics', 'media',
  'project_management', 'collaboration', 'content', 'other'
] as const
export type ToolCategory = (typeof TOOL_CATEGORY_VALUES)[number]

export const TOOL_PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const
export type ToolProficiencyLevel = (typeof TOOL_PROFICIENCY_LEVELS)[number]

export const TOOL_VISIBILITY_VALUES = ['internal', 'client_visible'] as const
export type ToolVisibility = (typeof TOOL_VISIBILITY_VALUES)[number]

export interface ToolCatalogItem {
  toolCode: string
  toolName: string
  toolCategory: ToolCategory
  iconKey: string | null
  description: string | null
  active: boolean
  displayOrder: number
}

export interface MemberTool {
  memberId: string
  toolCode: string
  toolName: string
  toolCategory: ToolCategory
  iconKey: string | null
  proficiencyLevel: ToolProficiencyLevel
  visibility: ToolVisibility
  notes: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  verificationStatus: ToolVerificationStatus
  rejectionReason: string | null
}

export interface UpsertMemberToolInput {
  toolCode: string
  proficiencyLevel?: ToolProficiencyLevel
  visibility?: ToolVisibility
  notes?: string | null
}

/* ─── Member Languages ─── */

export const LANGUAGE_PROFICIENCY_LEVELS = ['basic', 'conversational', 'professional', 'fluent', 'native'] as const
export type LanguageProficiencyLevel = (typeof LANGUAGE_PROFICIENCY_LEVELS)[number]

export const LANGUAGE_VISIBILITY_VALUES = ['internal', 'client_visible'] as const
export type LanguageVisibility = (typeof LANGUAGE_VISIBILITY_VALUES)[number]

export interface MemberLanguage {
  memberId: string
  languageCode: string
  languageName: string
  proficiencyLevel: LanguageProficiencyLevel
  visibility: LanguageVisibility
}

export interface UpsertMemberLanguageInput {
  languageCode: string
  languageName: string
  proficiencyLevel?: LanguageProficiencyLevel
  visibility?: LanguageVisibility
}

/* ─── Taxonomy Lane Summary ─── */

export interface TalentTaxonomyLanes {
  skills: 'member_skills'
  tools: 'member_tools'
  certifications: 'member_certifications'
  languages: 'member_languages'
  professionalLinks: 'members (columns)'
  narrative: 'members.about_me + members.headline'
}

/**
 * Legacy vs Canonical field mapping.
 *
 * CANONICAL (source of truth):
 *   - Skills: greenhouse_core.member_skills (from TASK-157)
 *   - Tools: greenhouse_core.member_tools (from TASK-315)
 *   - Certifications: greenhouse_core.member_certifications (from TASK-313)
 *   - Languages: greenhouse_core.member_languages (from TASK-315)
 *   - Links: greenhouse_core.members.{linkedin,portfolio,twitter,...}_url (from TASK-313)
 *   - Narrative: greenhouse_core.members.{about_me,headline} (from TASK-313/TASK-315)
 *
 * LEGACY (kept as fallback, do not extend):
 *   - BigQuery member_profiles.skills[] → superseded by member_skills
 *   - BigQuery member_profiles.tools[] → superseded by member_tools
 *   - BigQuery member_profiles.ai_suites[] → handled by greenhouse_ai.member_tool_licenses
 *   - greenhouse_core.members.biography → superseded by about_me
 *   - greenhouse_core.members.languages[] → superseded by member_languages
 */
export type _LegacyFieldMapping = never
