import { describe, expect, it } from 'vitest'

import type { NexaToolInvocation } from '../nexa-contract'
import { extractNexaActionProposals } from './extract-proposals'
import { NEXA_ACTION_PROPOSAL_CONTRACT_VERSION, type NexaActionProposal } from './types'

const proposal: NexaActionProposal = {
  contractVersion: NEXA_ACTION_PROPOSAL_CONTRACT_VERSION,
  proposalId: 'nexa-act-1',
  actionKey: 'mark_notifications_read',
  intent: 'Marcar todas tus notificaciones como leídas',
  sensitivity: 'low',
  preview: { title: 'Marcar', summary: 'Tienes 5 sin leer.', metrics: [] },
  confirmation: { title: 't', body: 'b', confirmLabel: 'ok', cancelLabel: 'no' },
  execution: { confirmEndpoint: '/api/nexa/actions/mark_notifications_read/confirm', idempotencyKey: 'nexa-act-idem-1' },
  expiresAt: new Date().toISOString()
}

const toolInvocation = (overrides: Partial<NexaToolInvocation>): NexaToolInvocation => ({
  toolCallId: 'c1',
  toolName: 'propose_action',
  args: {},
  result: {
    available: true,
    summary: 's',
    source: 'postgres',
    scopeLabel: 'x',
    generatedAt: new Date().toISOString(),
    metrics: [],
    raw: { proposal }
  },
  ...overrides
})

describe('extractNexaActionProposals', () => {
  it('lifts a valid proposal from a propose_action result', () => {
    expect(extractNexaActionProposals([toolInvocation({})])).toEqual([proposal])
  })

  it('ignores non-propose_action tool results', () => {
    const searchKnowledge = toolInvocation({ toolName: 'search_knowledge' })

    expect(extractNexaActionProposals([searchKnowledge])).toEqual([])
  })

  it('ignores a propose_action gap (available=false)', () => {
    const gap = toolInvocation({
      result: {
        available: false,
        summary: 'no',
        source: 'none',
        scopeLabel: 'x',
        generatedAt: new Date().toISOString(),
        metrics: [],
        raw: { gap: { reason: 'unknown_action', message: 'no' } }
      }
    })

    expect(extractNexaActionProposals([gap])).toEqual([])
  })

  it('rejects a malformed raw payload (wrong contract / missing execution)', () => {
    const malformed = toolInvocation({
      result: {
        available: true,
        summary: 's',
        source: 'postgres',
        scopeLabel: 'x',
        generatedAt: new Date().toISOString(),
        metrics: [],
        raw: { proposal: { contractVersion: 'v999', proposalId: 'x', actionKey: 'y' } }
      }
    })

    expect(extractNexaActionProposals([malformed])).toEqual([])
  })
})
