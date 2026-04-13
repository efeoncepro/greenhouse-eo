import { describe, expect, it } from 'vitest'

import {
  StructuredContextValidationError,
  validateStructuredContextDocument
} from './validation'

describe('structured context validation', () => {
  it('accepts a valid event replay context document', () => {
    const result = validateStructuredContextDocument('event.replay_context', {
      runId: 'reactive-1',
      status: 'succeeded',
      sourceSystem: 'reactive_worker',
      eventsProcessed: 10,
      eventsFailed: 0,
      projectionsTriggered: 3,
      durationMs: 1200
    })

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.contentHash).toHaveLength(64)
  })

  it('rejects documents with secret-like keys', () => {
    const result = validateStructuredContextDocument('agent.result_summary', {
      summary: 'done',
      refreshToken: 'should-not-live-here'
    })

    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('llaves sensibles')
  })

  it('applies strict validator rules for agent execution plans', () => {
    const result = validateStructuredContextDocument('agent.execution_plan', {
      title: 'Plan',
      steps: [
        { id: '1', label: 'Descubrir', status: 'completed' },
        { id: '2', label: 'Implementar', status: 'in_progress' }
      ]
    })

    expect(result.ok).toBe(true)
  })

  it('rejects malformed audit reports', () => {
    const result = validateStructuredContextDocument('agent.audit_report', {
      summary: '',
      findings: [{ severity: 'weird', message: '' }]
    })

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('agent.audit_report.summary debe ser string no vacío.')
    expect(result.errors.some(error => error.includes('severity'))).toBe(true)
  })

  it('exposes a typed validation error shape', () => {
    const error = new StructuredContextValidationError(['uno', 'dos'])

    expect(error.name).toBe('StructuredContextValidationError')
    expect(error.errors).toEqual(['uno', 'dos'])
  })
})
