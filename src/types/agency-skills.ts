export const SKILL_SENIORITY_LEVELS = ['junior', 'mid', 'senior', 'lead'] as const
export type SkillSeniorityLevel = (typeof SKILL_SENIORITY_LEVELS)[number]

export const SKILL_CATEGORY_VALUES = [
  'design',
  'development',
  'strategy',
  'account',
  'media',
  'operations',
  'other'
] as const
export type SkillCategory = (typeof SKILL_CATEGORY_VALUES)[number]

export interface SkillCatalogItem {
  skillCode: string
  skillName: string
  skillCategory: SkillCategory
  description: string | null
  seniorityLevels: SkillSeniorityLevel[]
  active: boolean
  displayOrder: number | null
}

export interface MemberSkill {
  memberId: string
  skillCode: string
  skillName: string
  skillCategory: SkillCategory
  seniorityLevel: SkillSeniorityLevel
  sourceSystem: string
  notes: string | null
  verifiedBy: string | null
  verifiedAt: string | null
}

export interface ServiceSkillRequirement {
  serviceId: string
  skillCode: string
  skillName: string
  skillCategory: SkillCategory
  requiredSeniority: SkillSeniorityLevel
  requiredFte: number
  notes: string | null
}

export interface StaffingCandidate {
  memberId: string
  displayName: string
  roleTitle: string | null
  roleCategory: string | null
  assignmentId: string
  assignmentFte: number
  availableFte: number
  utilizationPercent: number | null
  placementId: string | null
  placementStatus: string | null
  seniorityLevel: SkillSeniorityLevel
  seniorityScore: number
  availabilityScore: number
  fitScore: number
}

export interface StaffingRequirementCoverage extends ServiceSkillRequirement {
  matchedMemberCount: number
  coverageFte: number
  status: 'covered' | 'partial' | 'missing'
  topCandidates: StaffingCandidate[]
}

export interface ServiceStaffingRecommendation {
  serviceId: string
  serviceName: string
  serviceLine: string
  serviceType: string
  requirements: StaffingRequirementCoverage[]
  gaps: StaffingRequirementCoverage[]
  summary: {
    totalRequirementCount: number
    coveredRequirementCount: number
    gapRequirementCount: number
    averageFitScore: number | null
  }
}

export interface SpaceSkillCoverageSummary {
  requiredSkillCount: number
  coveredSkillCount: number
  gapSkillCount: number
  serviceCountWithRequirements: number
  coveragePct: number | null
}

export interface SpaceSkillCoverage {
  spaceId: string
  summary: SpaceSkillCoverageSummary
  memberSkillsByMember: Record<string, MemberSkill[]>
  services: ServiceStaffingRecommendation[]
}

export interface UpsertMemberSkillInput {
  skillCode: string
  seniorityLevel: SkillSeniorityLevel
  notes?: string | null
  sourceSystem?: string
}

export interface UpsertServiceSkillRequirementInput {
  skillCode: string
  requiredSeniority: SkillSeniorityLevel
  requiredFte: number
  notes?: string | null
}
