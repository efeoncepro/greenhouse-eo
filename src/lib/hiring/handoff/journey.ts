import 'server-only'

// TASK-356 — Journey longitudinal hiring-aware de una Person:
// candidate_facet → applications → handoff → member (si HRIS/770 ya lo aceptó).
// Reader canónico consumible por Person 360 / People (un primitive, muchos consumers);
// el wiring como facet 360 visible es follow-up (770 / Person 360 owners).
//
// Anti silent-catch: los errores se propagan (observeAndRethrow-style) — NUNCA
// `.catch(() => [])` en un reader canónico del 360 (UI_FEATURE_AGENT_INVARIANTS).

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { HiringFulfillmentMode } from '@/types/hiring'

import type { HiringHandoffBlockedReason, HiringHandoffState } from './types'

export interface HiringJourneyApplication {
  applicationId: string
  publicId: string
  openingId: string
  openingTitle: string
  stage: string
  decision: string | null
  decisionAt: string | null
  selectedDestination: string | null
  createdAt: string
}

export interface HiringJourneyHandoff {
  handoffId: string
  applicationId: string
  selectedDestination: HiringFulfillmentMode
  state: HiringHandoffState
  blockedReason: HiringHandoffBlockedReason | null
  tentativeStartDate: string | null
  downstreamRef: string | null
  stateChangedAt: string
}

export interface HiringJourneyForPerson {
  identityProfileId: string
  candidateFacetId: string | null
  candidateSource: string | null
  candidateStatus: string | null

  /** member vinculado a la faceta de candidato (si HRIS ya creó/promovió la faceta member). */
  memberId: string | null
  applications: HiringJourneyApplication[]
  handoffs: HiringJourneyHandoff[]
}

interface FacetRow extends Record<string, unknown> {
  candidate_facet_id: string
  source: string
  status: string
  member_id: string | null
}

interface ApplicationRow extends Record<string, unknown> {
  application_id: string
  public_id: string
  opening_id: string
  internal_title: string
  stage: string
  decision: string | null
  decision_at: string | Date | null
  selected_destination: string | null
  created_at: string | Date
}

interface HandoffRow extends Record<string, unknown> {
  hiring_handoff_id: string
  hiring_application_id: string
  selected_destination: string
  state: string
  blocked_reason: string | null
  tentative_start_date: string | Date | null
  downstream_ref: string | null
  state_changed_at: string | Date
}

const toIso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()

const toIsoOrNull = (value: string | Date | null): string | null => (value == null ? null : toIso(value))

const toDateOnly = (value: string | Date | null): string | null => {
  if (value == null) return null

  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10)
}

export const getHiringJourneyForPerson = async (
  identityProfileId: string,
): Promise<HiringJourneyForPerson | null> => {
  const profileId = identityProfileId.trim()

  if (!profileId) return null

  const facetRows = await runGreenhousePostgresQuery<FacetRow>(
    `SELECT candidate_facet_id, source, status, member_id
       FROM greenhouse_hiring.candidate_facet
      WHERE identity_profile_id = $1
      LIMIT 1`,
    [profileId],
  )

  const facet = facetRows[0] ?? null

  if (!facet) return null

  const [applications, handoffs] = await Promise.all([
    runGreenhousePostgresQuery<ApplicationRow>(
      `SELECT a.application_id, a.public_id, a.opening_id, o.internal_title, a.stage,
              a.decision, a.decision_at, a.selected_destination, a.created_at
         FROM greenhouse_hiring.hiring_application a
         JOIN greenhouse_hiring.hiring_opening o ON o.opening_id = a.opening_id
        WHERE a.identity_profile_id = $1
        ORDER BY a.created_at DESC
        LIMIT 50`,
      [profileId],
    ),
    runGreenhousePostgresQuery<HandoffRow>(
      `SELECT hiring_handoff_id, hiring_application_id, selected_destination, state,
              blocked_reason, tentative_start_date, downstream_ref, state_changed_at
         FROM greenhouse_hiring.hiring_handoff
        WHERE identity_profile_id = $1
        ORDER BY state_changed_at DESC
        LIMIT 50`,
      [profileId],
    ),
  ])

  return {
    identityProfileId: profileId,
    candidateFacetId: facet.candidate_facet_id,
    candidateSource: facet.source,
    candidateStatus: facet.status,
    memberId: facet.member_id,
    applications: applications.map((row) => ({
      applicationId: row.application_id,
      publicId: row.public_id,
      openingId: row.opening_id,
      openingTitle: row.internal_title,
      stage: row.stage,
      decision: row.decision,
      decisionAt: toIsoOrNull(row.decision_at),
      selectedDestination: row.selected_destination,
      createdAt: toIso(row.created_at),
    })),
    handoffs: handoffs.map((row) => ({
      handoffId: row.hiring_handoff_id,
      applicationId: row.hiring_application_id,
      selectedDestination: row.selected_destination as HiringFulfillmentMode,
      state: row.state as HiringHandoffState,
      blockedReason: (row.blocked_reason as HiringHandoffBlockedReason | null) ?? null,
      tentativeStartDate: toDateOnly(row.tentative_start_date),
      downstreamRef: row.downstream_ref,
      stateChangedAt: toIso(row.state_changed_at),
    })),
  }
}
