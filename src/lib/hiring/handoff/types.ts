// TASK-356 — HiringHandoff: boundary object explícito y auditable entre la decisión de
// reclutamiento (355) y el runtime downstream (770/HRIS/Staff Aug). Enums 1:1 con los
// CHECK de greenhouse_hiring.hiring_handoff. Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md.
//
// Boundary duro (bidireccional): este dominio NUNCA escribe members/assignments/placements/
// payroll_*/compensation_versions/final_settlements/contractor_engagements/providers/expenses.
// El handoff entrega una solicitud aprobable; el runtime lo cierra el owner downstream.

import type { HiringFulfillmentMode } from '@/types/hiring'

export const HIRING_HANDOFF_STATES = [
  'pending',
  'approved',
  'in_setup',
  'completed',
  'blocked',
  'cancelled',
] as const
export type HiringHandoffState = (typeof HIRING_HANDOFF_STATES)[number]

// Código estable + detalle interno. El consumer (770) localiza desde el código vía
// src/lib/copy/hiring.ts — NUNCA prosa cruda al cliente (contrato canónico de error).
export const HIRING_HANDOFF_BLOCKED_REASONS = [
  'destination_not_supported',
  'missing_legal_entity',
  'missing_start_date',
  'ambiguous_identity',
  'decision_superseded_after_approval',
  'decision_revoked',
  'prerequisites_open',
] as const
export type HiringHandoffBlockedReason = (typeof HIRING_HANDOFF_BLOCKED_REASONS)[number]

// Destinos con owner downstream en V1: internal_hire (→TASK-770 vía cola HRIS) y
// staff_augmentation (owner llama createStaffAugPlacement explícito). Los demás
// (`contractor` → EPIC-013, `partner`, `internal_reassignment`) nacen
// `blocked:destination_not_supported` — nunca `pending` mudo.
export const HIRING_HANDOFF_SUPPORTED_DESTINATIONS = [
  'internal_hire',
  'staff_augmentation',
] as const satisfies readonly HiringFulfillmentMode[]

export const isSupportedHandoffDestination = (
  destination: HiringFulfillmentMode,
): boolean => (HIRING_HANDOFF_SUPPORTED_DESTINATIONS as readonly string[]).includes(destination)

// Acciones del command gobernado (capability hiring.handoff.approve).
export const HIRING_HANDOFF_COMMAND_ACTIONS = ['approve', 'setup', 'complete', 'cancel'] as const
export type HiringHandoffCommandAction = (typeof HIRING_HANDOFF_COMMAND_ACTIONS)[number]

export interface HiringHandoff {
  handoffId: string
  applicationId: string
  openingId: string
  decisionId: string
  identityProfileId: string
  candidateFacetId: string
  selectedDestination: HiringFulfillmentMode
  state: HiringHandoffState

  /** Snapshot informativo — propuesta NO vinculante, NUNCA clasificación de contrato. */
  expectedLegalEntity: string | null
  tentativeStartDate: string | null
  prerequisitesSnapshot: Record<string, unknown>

  /** Evidencia del owner downstream; requerido para `completed`. */
  downstreamRef: string | null
  blockedReason: HiringHandoffBlockedReason | null

  /** Detalle interno (no client-facing). */
  blockedDetail: string | null
  stateChangedAt: string
  createdAt: string
  updatedAt: string
}

export interface TransitionHiringHandoffInput {
  handoffId: string
  action: HiringHandoffCommandAction
  actorUserId: string | null
  reasonCode?: string
  reasonDetail?: string
  downstreamRef?: string
}

export interface TransitionHiringHandoffResult {
  handoff: HiringHandoff
  idempotentReplay: boolean
}

export type MaterializeHandoffOutcome =
  | { kind: 'created'; handoff: HiringHandoff }
  | { kind: 'superseded'; handoff: HiringHandoff }
  | { kind: 'blocked'; handoff: HiringHandoff }
  | { kind: 'revoked'; handoff: HiringHandoff }
  | { kind: 'noop'; reason: string }
