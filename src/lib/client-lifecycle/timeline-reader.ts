import 'server-only'

import { getActiveCaseForOrganization, getCaseEvents, getChecklistItems, listCasesForOrganization } from './store'
import type { ClientLifecycleChecklistItem } from './types'

// TASK-992 Slice 3 — Account 360 lifecycle timeline reader. Derives per-facet
// completeness from the checklist items + the event timeline. Honest: returns null
// when the organization has no lifecycle case (the surface renders an empty state,
// never a crash); `status: 'degraded'` is surfaced by the caller on read failure.

export type FacetKey = 'identidad' | 'comercial' | 'operaciones' | 'finanzas' | 'acceso'
export type FacetStatus = 'complete' | 'partial' | 'pending'

export interface LifecycleFacet {
  key: FacetKey
  status: FacetStatus
  done: number
  total: number
  /** First pending item label (what's missing) — null when complete. */
  missing: string | null
}

export interface LifecycleTimelineEvent {
  id: string
  kind: 'opened' | 'item_completed' | 'evidence_attached' | 'blocker_added' | 'other'
  label: string
  actor: string
  occurredAt: string
  /** Pre-formatted server-side (deterministic, fixed tz) — no Intl at render → no SSR hydration drift. */
  displayAt: string
  detail: string | null
}

const TIMELINE_DATE_FORMAT = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

const formatTimelineDate = (iso: string): string => {
  const parsed = new Date(iso)

  if (Number.isNaN(parsed.getTime())) return iso

  return TIMELINE_DATE_FORMAT.format(parsed)
}

export interface LifecycleTimelineData {
  caseId: string
  caseStatus: string
  origin: string | null
  organizationId: string
  clientId: string | null
  facets: LifecycleFacet[]
  events: LifecycleTimelineEvent[]
  pendingFacetCount: number
}

// Maps a checklist item to one of the five Account-360 facets. Identity is captured
// at birth (org tax_id/country), so the "identidad" facet is synthesized separately.
const FACET_BY_ITEM_CODE: Record<string, FacetKey> = {
  verify_hubspot_company_synced: 'comercial',
  confirm_legal_documents: 'comercial',
  declare_engagement_kind: 'comercial',
  declare_commercial_terms: 'comercial',
  declare_engagement_phases: 'comercial',
  assign_team_members: 'operaciones',
  provision_notion_workspace: 'operaciones',
  provision_communication_channels: 'operaciones',
  provision_client_users_access: 'acceso',
  confirm_billing_setup: 'finanzas'
}

const FACET_ORDER: FacetKey[] = ['identidad', 'comercial', 'operaciones', 'finanzas', 'acceso']

const isDoneStatus = (status: string) =>
  status === 'completed' || status === 'skipped' || status === 'not_applicable'

const deriveFacetStatus = (done: number, total: number): FacetStatus => {
  if (total === 0) return 'pending'
  if (done >= total) return 'complete'
  if (done > 0) return 'partial'

  return 'pending'
}

const buildFacets = (items: ClientLifecycleChecklistItem[]): LifecycleFacet[] => {
  const grouped = new Map<FacetKey, ClientLifecycleChecklistItem[]>()

  for (const item of items) {
    const key = FACET_BY_ITEM_CODE[item.itemCode]

    if (!key) continue
    const list = grouped.get(key) ?? []

    list.push(item)
    grouped.set(key, list)
  }

  const facets: LifecycleFacet[] = []

  // Identity is captured at birth (the wizard gates tax_id + country before commit).
  facets.push({ key: 'identidad', status: 'complete', done: 1, total: 1, missing: null })

  for (const key of FACET_ORDER) {
    if (key === 'identidad') continue
    const list = (grouped.get(key) ?? []).sort((a, b) => a.displayOrder - b.displayOrder)
    const total = list.length
    const done = list.filter(item => isDoneStatus(item.status)).length
    const missingItem = list.find(item => !isDoneStatus(item.status))

    facets.push({
      key,
      status: deriveFacetStatus(done, total),
      done,
      total,
      missing: missingItem ? missingItem.itemLabel : null
    })
  }

  return facets
}

const EVENT_KIND_MAP: Record<string, LifecycleTimelineEvent['kind']> = {
  opened: 'opened',
  item_completed: 'item_completed',
  item_advanced: 'item_completed',
  item_skipped: 'item_completed',
  evidence_attached: 'evidence_attached',
  blocker_added: 'blocker_added'
}

const eventLabel = (eventKind: string, payload: Record<string, unknown>): string => {
  switch (eventKind) {
    case 'opened':
      return 'Caso de onboarding abierto'
    case 'item_completed':
      return `Ítem completado: ${String(payload.itemCode ?? '')}`.trim()
    case 'item_advanced':
      return `Ítem avanzado: ${String(payload.itemCode ?? '')}`.trim()
    case 'item_skipped':
      return `Ítem omitido: ${String(payload.itemCode ?? '')}`.trim()
    case 'item_blocked':
      return `Ítem bloqueado: ${String(payload.itemCode ?? '')}`.trim()
    case 'blocker_added':
      return `Bloqueo agregado: ${String(payload.reasonCode ?? '')}`.trim()
    case 'blocker_resolved':
      return `Bloqueo resuelto: ${String(payload.reasonCode ?? '')}`.trim()
    case 'closed':
      return 'Caso resuelto'
    default:
      return eventKind
  }
}

/** Returns the lifecycle timeline for an organization, or null when no case exists. */
export const getLifecycleTimelineForOrganization = async (
  organizationId: string
): Promise<LifecycleTimelineData | null> => {
  const activeCase =
    (await getActiveCaseForOrganization(organizationId, 'onboarding')) ??
    (await listCasesForOrganization(organizationId)).find(c => c.caseKind === 'onboarding') ??
    null

  if (!activeCase) return null

  const [items, rawEvents] = await Promise.all([
    getChecklistItems(activeCase.caseId),
    getCaseEvents(activeCase.caseId, 30)
  ])

  const facets = buildFacets(items)
  const pendingFacetCount = facets.filter(f => f.status !== 'complete').length

  const events: LifecycleTimelineEvent[] = rawEvents.map(ev => ({
    id: ev.eventId,
    kind: EVENT_KIND_MAP[ev.eventKind] ?? 'other',
    label: eventLabel(ev.eventKind, ev.payloadJson),
    actor: ev.actorUserId ?? 'Sistema',
    occurredAt: ev.occurredAt,
    displayAt: formatTimelineDate(ev.occurredAt),
    detail: typeof ev.payloadJson.detail === 'string' ? ev.payloadJson.detail : null
  }))

  return {
    caseId: activeCase.caseId,
    caseStatus: activeCase.status,
    origin: typeof activeCase.metadataJson.origin === 'string' ? activeCase.metadataJson.origin : null,
    organizationId,
    clientId: activeCase.clientId,
    facets,
    events,
    pendingFacetCount
  }
}
