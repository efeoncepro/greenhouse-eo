export type GreenhouseProjectStatusTone = 'success' | 'warning' | 'error' | 'info' | 'default'
export type GreenhouseProjectReviewLoad = 'Low' | 'Medium' | 'High'

export interface GreenhouseProjectListItem {
  id: string
  name: string
  status: string
  statusTone: GreenhouseProjectStatusTone
  totalTasks: number
  activeTasks: number
  completedTasks: number
  progress: number
  avgRpa: number
  openReviewItems: number
  reviewLoad: GreenhouseProjectReviewLoad
  startDate: string | null
  endDate: string | null
  pageUrl: string | null
}

export interface GreenhouseProjectsData {
  items: GreenhouseProjectListItem[]
  scope: {
    clientId: string
    projectCount: number
    projectIds: string[]
  }
}
