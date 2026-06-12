import { describe, expect, it } from 'vitest'

import { requiredCapabilityForKnowledgeSearchMode, resolveKnowledgeSearchMode } from './mode'

describe('knowledge search — mode resolution (TASK-1083)', () => {
  it('resolves agentic explicitly, defaults to human otherwise', () => {
    expect(resolveKnowledgeSearchMode('agentic')).toBe('agentic')
    expect(resolveKnowledgeSearchMode('human')).toBe('human')
    expect(resolveKnowledgeSearchMode(undefined)).toBe('human')
    expect(resolveKnowledgeSearchMode(null)).toBe('human')
    expect(resolveKnowledgeSearchMode('AGENTIC')).toBe('human')
    expect(resolveKnowledgeSearchMode('garbage')).toBe('human')
  })

  it('binds each mode to its capability (Delta B)', () => {
    expect(requiredCapabilityForKnowledgeSearchMode('agentic')).toBe('knowledge.agentic.retrieve')
    expect(requiredCapabilityForKnowledgeSearchMode('human')).toBe('knowledge.document.read')
  })
})
