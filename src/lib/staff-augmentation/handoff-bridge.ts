import 'server-only'

// TASK-356 — Bridge explícito Hiring → Staff Augmentation.
//
// Expone la INTENCIÓN de handoff (handoffs `staff_augmentation` aprobados) al owner de
// Staff Aug. El placement NUNCA se crea por side effect: el owner revisa la intención y
// llama `createStaffAugPlacement` (store.ts) explícitamente; después completa el handoff
// vía POST /api/hiring/handoffs/[id]/complete con downstream_ref = placement id.
//
// Gateado por HIRING_HANDOFF_BRIDGES_ENABLED (default OFF) — `enabled: false` explícito,
// nunca un [] indistinguible de "sin intents".

import { isHiringHandoffBridgesEnabled } from '@/lib/hiring/handoff/config'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface StaffAugHandoffIntent {
  handoffId: string
  applicationId: string
  openingId: string
  openingTitle: string
  spaceId: string | null
  organizationId: string | null
  identityProfileId: string
  personDisplayName: string | null
  tentativeStartDate: string | null
  approvedSince: string
  downstreamRef: string | null
}

export interface StaffAugHandoffIntentsResult {
  enabled: boolean
  intents: StaffAugHandoffIntent[]
}

interface IntentRow extends Record<string, unknown> {
  hiring_handoff_id: string
  hiring_application_id: string
  opening_id: string
  internal_title: string
  space_id: string | null
  organization_id: string | null
  identity_profile_id: string
  person_display_name: string | null
  tentative_start_date: string | Date | null
  state_changed_at: string | Date
  downstream_ref: string | null
}

const toIso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toDateOnly = (value: string | Date | null): string | null => {
  if (value == null) return null

  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
}

export const listStaffAugmentationHandoffIntents = async (options?: {
  limit?: number
}): Promise<StaffAugHandoffIntentsResult> => {
  if (!isHiringHandoffBridgesEnabled()) {
    return { enabled: false, intents: [] }
  }

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200)

  const rows = await runGreenhousePostgresQuery<IntentRow>(
    `SELECT h.hiring_handoff_id, h.hiring_application_id, h.opening_id, o.internal_title,
            o.space_id, o.organization_id, h.identity_profile_id,
            ip.full_name AS person_display_name, h.tentative_start_date,
            h.state_changed_at, h.downstream_ref
       FROM greenhouse_hiring.hiring_handoff h
       JOIN greenhouse_hiring.hiring_opening o ON o.opening_id = h.opening_id
       LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = h.identity_profile_id
      WHERE h.selected_destination = 'staff_augmentation'
        AND h.state IN ('approved', 'in_setup')
      ORDER BY h.state_changed_at ASC
      LIMIT $1`,
    [limit],
  )

  return {
    enabled: true,
    intents: rows.map((row) => ({
      handoffId: row.hiring_handoff_id,
      applicationId: row.hiring_application_id,
      openingId: row.opening_id,
      openingTitle: row.internal_title,
      spaceId: row.space_id,
      organizationId: row.organization_id,
      identityProfileId: row.identity_profile_id,
      personDisplayName: row.person_display_name,
      tentativeStartDate: toDateOnly(row.tentative_start_date),
      approvedSince: toIso(row.state_changed_at),
      downstreamRef: row.downstream_ref,
    })),
  }
}
