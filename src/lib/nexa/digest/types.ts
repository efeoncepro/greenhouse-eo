import type { EmailTemplateContext } from '@/lib/email/types'

export type WeeklyDigestSeverity = 'critical' | 'warning' | 'info'

export type WeeklyDigestNarrativePart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

export interface WeeklyDigestInsight {
  severity: WeeklyDigestSeverity
  headline: string
  narrative: WeeklyDigestNarrativePart[]
  actionLabel?: string
  actionUrl?: string
}

export interface WeeklyDigestSpaceSection {
  name: string
  href: string
  insights: WeeklyDigestInsight[]
}

export interface WeeklyDigestWindow {
  startAt: string
  endAt: string
  label: string
}

export interface WeeklyDigestBuildResult extends Record<string, unknown> {
  periodLabel: string
  totalInsights: number
  criticalCount: number
  warningCount: number
  infoCount: number
  spacesAffected: number
  spaces: WeeklyDigestSpaceSection[]
  portalUrl: string
  closingNote: string
  window: WeeklyDigestWindow
}

export interface WeeklyDigestBuildOptions {
  now?: Date
  limit?: number
}

export interface WeeklyDigestEmailContext extends EmailTemplateContext, WeeklyDigestBuildResult {
  unsubscribeUrl?: string
}
