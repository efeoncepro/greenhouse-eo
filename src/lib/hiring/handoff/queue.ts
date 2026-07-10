import 'server-only'

// TASK-356 — Cola read-model `internal_hire_ready_for_onboarding`, consumida por TASK-770
// (HRIS/People): handoffs `internal_hire` aprobados y no completados, sobre el MISMO
// identity_profile_id del candidato (nunca persona paralela). 770 crea/promueve el `member`
// en pending_intake y completa el handoff con downstream_ref — este reader NUNCA muta nada.
//
// Gateado por HIRING_HANDOFF_BRIDGES_ENABLED (default OFF): retorna { enabled: false }
// explícito — nunca un [] indistinguible de "cola vacía" (anti muerto-en-silencio).

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isHiringHandoffBridgesEnabled } from './config'

export interface InternalHireQueueItem {
  handoffId: string
  applicationId: string
  openingId: string
  openingTitle: string
  spaceId: string | null
  organizationId: string | null
  identityProfileId: string
  candidateFacetId: string
  personDisplayName: string | null
  tentativeStartDate: string | null
  expectedLegalEntity: string | null
  approvedSince: string
  downstreamRef: string | null
}

export interface InternalHireQueueResult {
  enabled: boolean
  items: InternalHireQueueItem[]
}

interface QueueRow extends Record<string, unknown> {
  hiring_handoff_id: string
  hiring_application_id: string
  opening_id: string
  internal_title: string
  space_id: string | null
  organization_id: string | null
  identity_profile_id: string
  candidate_facet_id: string
  person_display_name: string | null
  tentative_start_date: string | Date | null
  expected_legal_entity: string | null
  state_changed_at: string | Date
  downstream_ref: string | null
}

const toIso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toDateOnly = (value: string | Date | null): string | null => {
  if (value == null) return null

  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
}

/**
 * Handoffs `internal_hire` en `approved`/`in_setup` (aún sin completar). El scope
 * space/organization se hereda vía hiring_opening (hiring_application no tiene columnas
 * de scope — contrato TASK-353).
 */
export const listInternalHireReadyForOnboarding = async (options?: {
  limit?: number
}): Promise<InternalHireQueueResult> => {
  if (!isHiringHandoffBridgesEnabled()) {
    return { enabled: false, items: [] }
  }

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200)

  const rows = await runGreenhousePostgresQuery<QueueRow>(
    `SELECT h.hiring_handoff_id, h.hiring_application_id, h.opening_id, o.internal_title,
            o.space_id, o.organization_id, h.identity_profile_id, h.candidate_facet_id,
            ip.full_name AS person_display_name, h.tentative_start_date,
            h.expected_legal_entity, h.state_changed_at, h.downstream_ref
       FROM greenhouse_hiring.hiring_handoff h
       JOIN greenhouse_hiring.hiring_opening o ON o.opening_id = h.opening_id
       LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = h.identity_profile_id
      WHERE h.selected_destination = 'internal_hire'
        AND h.state IN ('approved', 'in_setup')
      ORDER BY h.state_changed_at ASC
      LIMIT $1`,
    [limit],
  )

  return {
    enabled: true,
    items: rows.map((row) => ({
      handoffId: row.hiring_handoff_id,
      applicationId: row.hiring_application_id,
      openingId: row.opening_id,
      openingTitle: row.internal_title,
      spaceId: row.space_id,
      organizationId: row.organization_id,
      identityProfileId: row.identity_profile_id,
      candidateFacetId: row.candidate_facet_id,
      personDisplayName: row.person_display_name,
      tentativeStartDate: toDateOnly(row.tentative_start_date),
      expectedLegalEntity: row.expected_legal_entity,
      approvedSince: toIso(row.state_changed_at),
      downstreamRef: row.downstream_ref,
    })),
  }
}
