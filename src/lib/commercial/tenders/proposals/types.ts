/**
 * Proposal Studio F0 — DTOs del aggregate `Proposal` (TASK-1392).
 *
 * Browser-safe a propósito (sólo tipos): un futuro consumer UI/Nexa puede importarlos sin
 * arrastrar el runtime server. El vocabulario llega CONGELADO del Slice 0: origin ∈
 * {public_tender, private_rfp, direct_sales}, terminales won/lost, deadline explícito.
 */

import type { TenderState } from '../tender-state-machine'

export type ProposalOrigin = 'public_tender' | 'private_rfp' | 'direct_sales'

export type ProposalDeadlineConfidence = 'confirmed' | 'ambiguous' | 'none_declared'

export type ProposalAudience = 'internal' | 'client_facing'

export type ProposalAssetKind =
  | 'rfp_source'
  | 'fillable_template'
  | 'diagnostic'
  | 'technical_offer'
  | 'economic_offer'
  | 'admissibility_matrix'
  | 'deck'
  | 'other_doc'

export type ProposalAssetStatus = 'draft' | 'in_review' | 'final'

export type ProposalEvidenceClassification = 'measured' | 'illustrative' | 'attested'

export type ProposalRequirementKind =
  | 'excluyente'
  | 'puntua'
  | 'economic_minimum'
  | 'format'
  | 'deadline'
  | 'penalty'
  | 'sla'

/**
 * Actor de un command. Un LLM/agente NUNCA es actor en F0: propone, y el humano que confirma es el
 * actor. Los gates humanos exigen `kind: 'member'` con `memberId` — lo enforcea el command Y la DB.
 */
export interface ProposalActor {
  kind: 'member' | 'system' | 'cli'
  memberId?: string
}

export interface ProposalRecord {
  proposalId: string
  ownerOrgId: string
  clientOrganizationId: string
  origin: ProposalOrigin
  publicOpportunityId: string | null
  quoteId: string | null
  quoteSnapshotTakenAt: string | null
  title: string
  platform: string | null
  state: TenderState
  deadline: string | null
  deadlineConfidence: ProposalDeadlineConfidence
  deadlineAssumption: string | null
  currency: string | null
  createdByMemberId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProposalInput {
  ownerOrgId: string
  clientOrganizationId: string
  origin: ProposalOrigin
  /** Obligatorio ⟺ origin='public_tender' (la promoción del radar; idempotente por UNIQUE). */
  publicOpportunityId?: string
  title: string
  platform?: string
  /** La ausencia de deadline es EXPLÍCITA: sin `deadline` ⇒ confidence 'none_declared'. */
  deadline?: string
  deadlineConfidence?: Exclude<ProposalDeadlineConfidence, 'none_declared'>
  deadlineAssumption?: string
  currency?: string
  /** Idempotencia de retry para orígenes sin oportunidad pública. */
  idempotencyKey?: string
  actor: ProposalActor
}

export interface TransitionProposalStateInput {
  ownerOrgId: string
  proposalId: string
  toState: TenderState
  actor: ProposalActor
  /** Por qué se cruza (≥5 chars — lo exige también la DB). */
  reason: string
  metadata?: Record<string, unknown>
}

export interface ProposalStateTransitionRecord {
  transitionId: string
  proposalId: string
  fromState: TenderState
  toState: TenderState
  requiresHumanGate: boolean
  actorKind: ProposalActor['kind']
  actorMemberId: string | null
  reason: string
  createdAt: string
}
