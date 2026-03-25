import type { GreenhouseProjectReviewLoad, GreenhouseProjectStatusTone } from '@/types/greenhouse-projects'

export interface GreenhouseProjectDetailProject {
  id: string
  name: string
  status: string
  statusTone: GreenhouseProjectStatusTone
  summary: string | null
  startDate: string | null
  endDate: string | null
  pageUrl: string | null
  totalTasks: number
  activeTasks: number
  completedTasks: number
  progress: number
  avgRpa: number
  openReviewItems: number
  blockedTasks: number
  reviewLoad: GreenhouseProjectReviewLoad
}

export interface GreenhouseProjectSprintContext {
  id: string
  name: string
  status: string
  startDate: string | null
  endDate: string | null
  totalTasks: number
  completedTasks: number
  progress: number
  pageUrl: string | null
}

export interface GreenhouseProjectReviewPressure {
  tasksWithOpenReviews: number
  tasksReadyForReview: number
  tasksInClientChanges: number
  tasksBlocked: number
}

export interface GreenhouseProjectDetailData {
  project: GreenhouseProjectDetailProject
  sprint: GreenhouseProjectSprintContext | null
  reviewPressure: GreenhouseProjectReviewPressure
  scope: {
    clientId: string
    projectId: string
  }
}

export interface GreenhouseProjectTaskItem {
  id: string
  name: string
  status: string
  statusTone: GreenhouseProjectStatusTone
  rpa: number
  rpaSemaphoreSource: string | null
  rpaSemaphoreDerived: 'green' | 'yellow' | 'red' | 'default'
  performanceIndicatorLabel: string | null
  performanceIndicatorCode: string | null
  deliveryCompliance: string | null
  completionLabel: string | null
  daysLate: number | null
  rescheduledDays: number | null
  isRescheduled: boolean
  clientChangeRoundLabel: string | null
  clientChangeRoundFinal: number | null
  workflowChangeRound: number | null
  frameVersions: number
  frameComments: number
  openFrameComments: number
  reviewOpen: boolean
  blocked: boolean
  originalDueDate: string | null
  executionTimeLabel: string | null
  changesTimeLabel: string | null
  reviewTimeLabel: string | null
  sprintName: string | null
  cycleTimeDays: number | null
  faseCsc: string | null
  isStuck: boolean
  assigneeName: string | null
  assigneeRole: string | null
  lastFrameComment: string | null
  lastEditedAt: string | null
  pageUrl: string | null
}

export interface GreenhouseProjectTasksData {
  items: GreenhouseProjectTaskItem[]
  meta: {
    projectId: string
    totalTasks: number
  }
}
