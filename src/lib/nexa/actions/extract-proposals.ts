import type { NexaToolInvocation } from '../nexa-contract'
import { NEXA_ACTION_PROPOSAL_CONTRACT_VERSION, type NexaActionProposal } from './types'

// Pure (no server-only): runs in the orchestrator to lift governed proposals out of the
// `propose_action` tool results onto `NexaResponse.actionProposals`. Validates the contract shape
// so a malformed `raw` can never become a renderable proposal.

export const isNexaActionProposal = (value: unknown): value is NexaActionProposal => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const candidate = value as Record<string, unknown>
  const execution = candidate.execution as Record<string, unknown> | undefined

  return (
    candidate.contractVersion === NEXA_ACTION_PROPOSAL_CONTRACT_VERSION &&
    typeof candidate.proposalId === 'string' &&
    typeof candidate.actionKey === 'string' &&
    typeof execution === 'object' &&
    execution !== null &&
    typeof execution.confirmEndpoint === 'string' &&
    typeof execution.idempotencyKey === 'string'
  )
}

export const extractNexaActionProposals = (toolInvocations: NexaToolInvocation[]): NexaActionProposal[] =>
  toolInvocations
    .filter(invocation => invocation.toolName === 'propose_action' && invocation.result.available)
    .map(invocation => (invocation.result.raw as Record<string, unknown> | undefined)?.proposal)
    .filter(isNexaActionProposal)
