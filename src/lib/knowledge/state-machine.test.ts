import { describe, expect, it } from 'vitest'

import { KnowledgePublicationTransitionError } from './errors'
import {
  KNOWLEDGE_PUBLICATION_TRANSITIONS,
  assertValidKnowledgePublicationTransition,
  deriveKnowledgeChunkFreshness,
  isKnowledgeAgentRetrievable,
  isKnowledgeQuarantined,
  isValidKnowledgePublicationTransition
} from './state-machine'
import { KNOWLEDGE_PUBLICATION_STATUSES } from './constants'

describe('knowledge publication state machine', () => {
  it('allows same-status no-op (re-publish keeps published)', () => {
    expect(isValidKnowledgePublicationTransition('published', 'published')).toBe(true)
  })

  it('allows canonical lifecycle transitions', () => {
    expect(isValidKnowledgePublicationTransition('draft', 'review')).toBe(true)
    expect(isValidKnowledgePublicationTransition('review', 'published')).toBe(true)
    expect(isValidKnowledgePublicationTransition('published', 'stale')).toBe(true)
    expect(isValidKnowledgePublicationTransition('stale', 'published')).toBe(true)
    expect(isValidKnowledgePublicationTransition('published', 'deprecated')).toBe(true)
    expect(isValidKnowledgePublicationTransition('deprecated', 'published')).toBe(true)
  })

  it('quarantined is reachable from every non-quarantined status', () => {
    for (const status of KNOWLEDGE_PUBLICATION_STATUSES) {
      if (status === 'quarantined') continue
      expect(isValidKnowledgePublicationTransition(status, 'quarantined')).toBe(true)
    }
  })

  it('quarantined can be remediated back to draft/review/published', () => {
    expect(isValidKnowledgePublicationTransition('quarantined', 'draft')).toBe(true)
    expect(isValidKnowledgePublicationTransition('quarantined', 'review')).toBe(true)
    expect(isValidKnowledgePublicationTransition('quarantined', 'published')).toBe(true)
  })

  it('rejects illegal transitions', () => {
    expect(isValidKnowledgePublicationTransition('draft', 'stale')).toBe(false)
    expect(isValidKnowledgePublicationTransition('draft', 'deprecated')).toBe(false)
    expect(isValidKnowledgePublicationTransition('deprecated', 'stale')).toBe(false)
    expect(isValidKnowledgePublicationTransition('quarantined', 'deprecated')).toBe(false)
  })

  it('assert throws KnowledgePublicationTransitionError on illegal transition', () => {
    expect(() => assertValidKnowledgePublicationTransition('draft', 'stale')).toThrow(
      KnowledgePublicationTransitionError
    )
  })

  it('every status has an entry in the transition matrix', () => {
    for (const status of KNOWLEDGE_PUBLICATION_STATUSES) {
      expect(KNOWLEDGE_PUBLICATION_TRANSITIONS[status]).toBeDefined()
    }
  })
})

describe('agentic policy is orthogonal to lifecycle', () => {
  it('agent_excluded never retrievable even when published', () => {
    expect(isKnowledgeAgentRetrievable('published', 'agent_excluded')).toBe(false)
  })

  it('agent_allowed retrievable when published or stale', () => {
    expect(isKnowledgeAgentRetrievable('published', 'agent_allowed')).toBe(true)
    expect(isKnowledgeAgentRetrievable('stale', 'agent_allowed')).toBe(true)
  })

  it('deprecated and draft are not default-retrievable', () => {
    expect(isKnowledgeAgentRetrievable('deprecated', 'agent_allowed')).toBe(false)
    expect(isKnowledgeAgentRetrievable('draft', 'agent_allowed')).toBe(false)
    expect(isKnowledgeAgentRetrievable('quarantined', 'agent_allowed')).toBe(false)
  })

  it('isKnowledgeQuarantined only true for quarantined', () => {
    expect(isKnowledgeQuarantined('quarantined')).toBe(true)
    expect(isKnowledgeQuarantined('published')).toBe(false)
  })
})

describe('deriveKnowledgeChunkFreshness', () => {
  it('maps lifecycle to chunk freshness', () => {
    expect(deriveKnowledgeChunkFreshness('published')).toBe('current')
    expect(deriveKnowledgeChunkFreshness('stale')).toBe('stale')
    expect(deriveKnowledgeChunkFreshness('deprecated')).toBe('deprecated')
    expect(deriveKnowledgeChunkFreshness('draft')).toBe('unknown')
    expect(deriveKnowledgeChunkFreshness('review')).toBe('unknown')
    expect(deriveKnowledgeChunkFreshness('quarantined')).toBe('unknown')
  })
})
