export interface ModuleCard {
  id: string
  title: string
  subtitle: string
  icon: string
  route: string
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error'
  isNew?: boolean
}

export interface PendingTask {
  id: string
  title: string
  description: string
  type: 'project' | 'finance' | 'hr' | 'other'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  ctaLabel?: string
  ctaRoute?: string
}

export interface NexaMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  suggestions?: string[]
  timestamp: string
}

export interface HomeSnapshot {
  user: {
    firstName: string
    lastName: string | null
    role: string
  }
  greeting: {
    title: string
    subtitle: string
  }
  modules: ModuleCard[]
  tasks: PendingTask[]
  financeStatus?: {
    periodLabel: string
    closureStatus: string | null
    readinessPct: number | null
    latestMarginPct: number | null
    latestMarginPeriodLabel: string | null
    latestPeriodClosed: boolean
  } | null
  nexaIntro: string
  computedAt: string
}
