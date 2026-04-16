// ── Enum value arrays ──

export const CYCLE_TYPES = ['quarterly', 'semester', 'annual'] as const

export type CycleType = (typeof CYCLE_TYPES)[number]

export const CYCLE_STATUSES = ['draft', 'active', 'review', 'closed'] as const

export type CycleStatus = (typeof CYCLE_STATUSES)[number]

export const GOAL_OWNER_TYPES = ['individual', 'department', 'company'] as const

export type GoalOwnerType = (typeof GOAL_OWNER_TYPES)[number]

export const GOAL_STATUSES = ['on_track', 'at_risk', 'behind', 'completed', 'cancelled'] as const

export type GoalStatus = (typeof GOAL_STATUSES)[number]

export const KR_UNITS = ['percent', 'count', 'currency', 'score'] as const

export type KrUnit = (typeof KR_UNITS)[number]

// ── Domain model interfaces ──

export interface GoalCycle {
  cycleId: string
  cycleName: string
  cycleType: CycleType
  startDate: string
  endDate: string
  status: CycleStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface Goal {
  goalId: string
  cycleId: string
  ownerType: GoalOwnerType
  ownerMemberId: string | null
  ownerDepartmentId: string | null
  title: string
  description: string | null
  progressPercent: number
  status: GoalStatus
  parentGoalId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface GoalKeyResult {
  krId: string
  goalId: string
  title: string
  targetValue: number | null
  currentValue: number
  unit: KrUnit | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface GoalProgress {
  progressId: string
  goalId: string
  recordedBy: string
  recordedAt: string
  progressPercent: number
  notes: string | null
}

// ── Composite types ──

export interface GoalWithDetails extends Goal {
  keyResults: GoalKeyResult[]
  progress: GoalProgress[]
}

// ── API response types ──

export interface GoalCyclesResponse {
  cycles: GoalCycle[]
  summary: {
    total: number
    active: number
  }
}

export interface GoalsResponse {
  goals: Goal[]
  summary: {
    total: number
    onTrack: number
    atRisk: number
    behind: number
    completed: number
  }
}

export interface GoalDetailResponse {
  goal: GoalWithDetails
  cycle: GoalCycle
  ownerMemberName: string | null
  ownerDepartmentName: string | null
}

export interface MyGoalsResponse {
  goals: GoalWithDetails[]
  cycle: GoalCycle | null
  summary: {
    total: number
    onTrack: number
    atRisk: number
    behind: number
    completed: number
    avgProgress: number
  }
}

// ── Input types ──

export interface CreateGoalCycleInput {
  cycleName: string
  cycleType: CycleType
  startDate: string
  endDate: string
  status?: CycleStatus
}

export interface CreateGoalInput {
  cycleId: string
  ownerType: GoalOwnerType
  ownerMemberId?: string | null
  ownerDepartmentId?: string | null
  title: string
  description?: string | null
  parentGoalId?: string | null
}

export interface CreateKeyResultInput {
  goalId: string
  title: string
  targetValue?: number | null
  unit?: KrUnit | null
  sortOrder?: number
}

export interface RecordProgressInput {
  goalId: string
  progressPercent: number
  notes?: string | null
}
