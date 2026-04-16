// ── Enum value arrays ──

export const EVAL_CYCLE_STATUSES = ['draft', 'self_eval', 'peer_eval', 'manager_review', 'calibration', 'closed'] as const

export type EvalCycleStatus = (typeof EVAL_CYCLE_STATUSES)[number]

export const EVAL_TYPES = ['self', 'peer', 'manager', 'direct_report'] as const

export type EvalType = (typeof EVAL_TYPES)[number]

export const ASSIGNMENT_STATUSES = ['pending', 'in_progress', 'submitted', 'skipped'] as const

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const COMPETENCY_CATEGORIES = ['core', 'technical', 'leadership', 'delivery'] as const

export type CompetencyCategory = (typeof COMPETENCY_CATEGORIES)[number]

export const RATING_SCALE = [1, 2, 3, 4, 5] as const

export type Rating = (typeof RATING_SCALE)[number]

export const CYCLE_TYPES = ['quarterly', 'semester', 'annual'] as const

export type EvalCycleType = (typeof CYCLE_TYPES)[number]

// ── Domain model interfaces ──

export interface EvalCompetency {
  competencyId: string
  competencyName: string
  description: string | null
  category: CompetencyCategory
  applicableLevels: string[]
  active: boolean
  sortOrder: number
  createdAt: string
}

export interface EvalCycle {
  evalCycleId: string
  cycleName: string
  cycleType: EvalCycleType
  startDate: string
  endDate: string
  selfEvalDeadline: string | null
  peerEvalDeadline: string | null
  managerDeadline: string | null
  status: EvalCycleStatus
  competencyIds: string[]
  minTenureDays: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface EvalAssignment {
  assignmentId: string
  evalCycleId: string
  evaluateeId: string
  evaluatorId: string
  evalType: EvalType
  status: AssignmentStatus
  submittedAt: string | null
  createdAt: string
}

export interface EvalResponse {
  responseId: string
  assignmentId: string
  competencyId: string
  rating: Rating
  comments: string | null
  createdAt: string
}

export interface EvalSummary {
  summaryId: string
  evalCycleId: string
  memberId: string
  overallRating: number | null
  selfRating: number | null
  peerRating: number | null
  managerRating: number | null
  icoRpaAvg: number | null
  icoOtdPercent: number | null
  goalCompletionPct: number | null
  strengths: string | null
  developmentAreas: string | null
  hrNotes: string | null
  finalizedBy: string | null
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Composite types ──

export interface EvalAssignmentWithResponses extends EvalAssignment {
  responses: EvalResponse[]
  evaluateeName: string | null
  evaluatorName: string | null
}

export interface EvalSummaryWithDetails extends EvalSummary {
  memberName: string | null
  assignments: EvalAssignment[]
  cycle: EvalCycle | null
}

// ── API response types ──

export interface EvalCyclesResponse {
  cycles: EvalCycle[]
  summary: {
    total: number
    active: number
    closed: number
  }
}

export interface EvalAssignmentsResponse {
  assignments: EvalAssignmentWithResponses[]
  summary: {
    total: number
    pending: number
    submitted: number
    skipped: number
  }
}

export interface EvalSummariesResponse {
  summaries: EvalSummaryWithDetails[]
  summary: {
    total: number
    finalized: number
    avgOverallRating: number | null
  }
}

export interface MyEvalPendingResponse {
  pending: EvalAssignmentWithResponses[]
  completed: EvalAssignmentWithResponses[]
  summaries: EvalSummary[]
  activeCycle: EvalCycle | null
}

// ── Input types ──

export interface CreateEvalCycleInput {
  cycleName: string
  cycleType: EvalCycleType
  startDate: string
  endDate: string
  selfEvalDeadline?: string | null
  peerEvalDeadline?: string | null
  managerDeadline?: string | null
  competencyIds?: string[]
  minTenureDays?: number
}

export interface SubmitResponseInput {
  assignmentId: string
  responses: {
    competencyId: string
    rating: Rating
    comments?: string | null
  }[]
}

export interface FinalizeEvalSummaryInput {
  evalCycleId: string
  memberId: string
  overallRating?: number | null
  strengths?: string | null
  developmentAreas?: string | null
  hrNotes?: string | null
}
