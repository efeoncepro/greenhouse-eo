import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type {
  ClientLifecycleItemStatus,
  ClientLifecycleOwnerRole,
  ClientLifecycleTriggerSource
} from './types'

// TASK-1013 Slice 1 — Onboarding cases inbox reader. Server-only projection that
// makes the in-flight onboarding lifecycle cases discoverable (the deal-trigger,
// TASK-1010, opens `draft` cases that today have no surface). Composes its own SQL
// (in-flight onboarding cases JOIN organizations for the name + one batched query
// for the checklist of every listed case via `case_id = ANY`) so there is no N+1.
//
// HONEST by construction: it returns ONLY fields that exist in the runtime. There
// is no human case code, no SLA progress %, no owner name and no deal name in the
// case row — the mockup invented those. We surface the short caseId, the real
// `target_completion_date` + overdue (computed `CURRENT_DATE - date` = integer days,
// per the date-arithmetic gate), the real checklist status, and the `hubspotDealId`
// captured by the deal-trigger. Anything unknown degrades to `null` and the view
// renders "—"/"Sistema", never a fabricated value.

// In-flight onboarding statuses (the reader excludes completed/cancelled).
export type OnboardingInboxStatus = 'draft' | 'in_progress' | 'blocked'

export interface OnboardingInboxStepVm {
  itemCode: string
  label: string
  status: ClientLifecycleItemStatus
  ownerRole: ClientLifecycleOwnerRole
  required: boolean
  blocksCompletion: boolean
}

export interface OnboardingInboxCaseVm {
  caseId: string
  /** First 8 chars of the caseId, upper-cased. Honest — NOT a fabricated ONB-#### code. */
  shortCode: string
  organizationId: string
  organizationName: string
  status: OnboardingInboxStatus
  origin: ClientLifecycleTriggerSource
  triggeredByUserId: string | null
  hubspotDealId: string | null
  reason: string | null
  createdAtIso: string
  /** Server-side formatted (fixed tz) — no Intl at render → no SSR hydration drift. */
  createdAtLabel: string
  targetCompletionDate: string | null
  targetLabel: string | null
  overdue: boolean
  /** "N días vencido" when overdue, else null. */
  overdueLabel: string | null
  /** Canonical timeline route — by organizationId, NOT caseId. */
  timelineHref: string
  steps: OnboardingInboxStepVm[]
  completedSteps: number
  totalSteps: number
}

export interface OnboardingInboxSummary {
  openCases: number
  inProgress: number
  blocked: number
  overdue: number
}

export interface OnboardingInboxData {
  cases: OnboardingInboxCaseVm[]
  summary: OnboardingInboxSummary
}

const INBOX_DATE_FORMAT = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

const formatInboxDate = (iso: string | null): string | null => {
  if (!iso) return null
  const parsed = new Date(iso)

  if (Number.isNaN(parsed.getTime())) return iso

  return INBOX_DATE_FORMAT.format(parsed)
}

const toIso = (value: unknown): string => {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const toDateOnly = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value).slice(0, 10)
}

// Mirror of timeline-reader.isDoneStatus: a checklist item counts as "done" for the
// progress bar when it is completed, skipped, or not applicable.
const isDoneStatus = (status: ClientLifecycleItemStatus): boolean =>
  status === 'completed' || status === 'skipped' || status === 'not_applicable'

type InboxCaseRow = {
  case_id: string
  organization_id: string
  organization_name: string | null
  status: 'draft' | 'in_progress' | 'blocked'
  trigger_source: ClientLifecycleTriggerSource
  triggered_by_user_id: string | null
  reason: string | null
  metadata_json: Record<string, unknown> | null
  target_completion_date: unknown
  created_at: unknown
  overdue: boolean
  overdue_days: number | null
}

type InboxItemRow = {
  case_id: string
  item_code: string
  item_label: string
  status: ClientLifecycleItemStatus
  owner_role: ClientLifecycleOwnerRole
  required: boolean
  blocks_completion: boolean
  display_order: number
}

const overdueLabel = (overdue: boolean, days: number | null): string | null => {
  if (!overdue || days == null || days <= 0) return null

  return `${days} ${days === 1 ? 'día' : 'días'} vencido`
}

/**
 * Returns every in-flight onboarding case (draft / in_progress / blocked) enriched
 * with the organization name + its real checklist, plus a summary for the KPI row.
 * Ordered newest-first (the deal-trigger drafts surface at the top). Bounded to 100
 * cases — in-flight onboarding is small by nature; pagination is a follow-up if it
 * ever grows past that.
 */
export const getOnboardingCasesInbox = async (): Promise<OnboardingInboxData> => {
  const caseRows = await runGreenhousePostgresQuery<InboxCaseRow>(
    `SELECT c.case_id,
            c.organization_id,
            o.organization_name,
            c.status,
            c.trigger_source,
            c.triggered_by_user_id,
            c.reason,
            c.metadata_json,
            c.target_completion_date,
            c.created_at,
            (c.target_completion_date IS NOT NULL AND c.target_completion_date < CURRENT_DATE) AS overdue,
            (CURRENT_DATE - c.target_completion_date) AS overdue_days
     FROM greenhouse_core.client_lifecycle_cases c
     LEFT JOIN greenhouse_core.organizations o ON o.organization_id = c.organization_id
     WHERE c.case_kind = 'onboarding'
       AND c.status NOT IN ('completed', 'cancelled')
     ORDER BY c.created_at DESC
     LIMIT 100`,
    []
  )

  const caseIds = caseRows.map(row => row.case_id)

  const itemRows = caseIds.length
    ? await runGreenhousePostgresQuery<InboxItemRow>(
        `SELECT case_id, item_code, item_label, status, owner_role, required, blocks_completion, display_order
         FROM greenhouse_core.client_lifecycle_checklist_items
         WHERE case_id = ANY($1)
         ORDER BY case_id, display_order ASC`,
        [caseIds]
      )
    : []

  const stepsByCase = new Map<string, OnboardingInboxStepVm[]>()

  for (const row of itemRows) {
    const list = stepsByCase.get(row.case_id) ?? []

    list.push({
      itemCode: row.item_code,
      label: row.item_label,
      status: row.status,
      ownerRole: row.owner_role,
      required: row.required,
      blocksCompletion: row.blocks_completion
    })
    stepsByCase.set(row.case_id, list)
  }

  let inProgress = 0
  let blocked = 0
  let overdue = 0

  const cases: OnboardingInboxCaseVm[] = caseRows.map(row => {
    const steps = stepsByCase.get(row.case_id) ?? []
    const completedSteps = steps.filter(step => isDoneStatus(step.status)).length
    const createdAtIso = toIso(row.created_at)
    const isOverdue = Boolean(row.overdue)

    if (row.status === 'in_progress') inProgress += 1
    if (row.status === 'blocked') blocked += 1
    if (isOverdue) overdue += 1

    const dealId =
      typeof row.metadata_json?.hubspotDealId === 'string' ? row.metadata_json.hubspotDealId : null

    return {
      caseId: row.case_id,
      shortCode: row.case_id.slice(0, 8).toUpperCase(),
      organizationId: row.organization_id,
      organizationName: row.organization_name?.trim() || 'Organización sin nombre',
      status: row.status,
      origin: row.trigger_source,
      triggeredByUserId: row.triggered_by_user_id,
      hubspotDealId: dealId,
      reason: row.reason,
      createdAtIso,
      createdAtLabel: formatInboxDate(createdAtIso) ?? '—',
      targetCompletionDate: toDateOnly(row.target_completion_date),
      targetLabel: formatInboxDate(toDateOnly(row.target_completion_date)),
      overdue: isOverdue,
      overdueLabel: overdueLabel(isOverdue, row.overdue_days),
      timelineHref: `/agency/clients/${row.organization_id}/lifecycle`,
      steps,
      completedSteps,
      totalSteps: steps.length
    }
  })

  return {
    cases,
    summary: {
      openCases: cases.length,
      inProgress,
      blocked,
      overdue
    }
  }
}
