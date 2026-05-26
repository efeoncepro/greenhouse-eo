import { describe, expect, it } from 'vitest'

import {
  AI_OBSERVER_DISABLED_REASON,
  deriveAiObserverRunOutcome,
  generateAiObserverRunId
} from './ai-observer-run-tracker'

describe('deriveAiObserverRunOutcome (TASK-937 heartbeat status mapping)', () => {
  const base = {
    finishReason: null,
    observationsEvaluated: 5,
    observationsPersisted: 1,
    observationsSkipped: 4
  }

  it('maps kill-switch OFF to cancelled (NOT failed)', () => {
    const out = deriveAiObserverRunOutcome({ ...base, skippedReason: AI_OBSERVER_DISABLED_REASON })

    expect(out.status).toBe('cancelled')
    expect(out.notes).toBe('disabled:kill-switch-off')
  })

  it('maps JSON parse failure to failed with finishReason in notes', () => {
    const out = deriveAiObserverRunOutcome({
      ...base,
      skippedReason: 'Gemini response was not valid JSON after schema retry (unbalanced_or_truncated_json)',
      finishReason: 'MAX_TOKENS'
    })

    expect(out.status).toBe('failed')
    expect(out.notes).toContain('parse_failed:MAX_TOKENS')
  })

  it('maps empty response to failed with empty_response marker', () => {
    const out = deriveAiObserverRunOutcome({
      ...base,
      skippedReason: 'Gemini returned empty response',
      finishReason: 'MAX_TOKENS'
    })

    expect(out.status).toBe('failed')
    expect(out.notes).toContain('empty_response:MAX_TOKENS')
  })

  it('maps a successful persist sweep to succeeded', () => {
    const out = deriveAiObserverRunOutcome({ ...base, skippedReason: null })

    expect(out.status).toBe('succeeded')
    expect(out.notes).toContain('persisted=1')
    expect(out.notes).toContain('evaluated=5')
  })

  it('maps a dedup-only sweep (persisted=0) to succeeded, not failed', () => {
    const out = deriveAiObserverRunOutcome({
      ...base,
      skippedReason: null,
      observationsPersisted: 0,
      observationsSkipped: 5
    })

    expect(out.status).toBe('succeeded')
    expect(out.notes).toContain('persisted=0')
  })

  it('uses unknown when a parse-fail has no finishReason', () => {
    const out = deriveAiObserverRunOutcome({
      ...base,
      skippedReason: 'Gemini response was not valid JSON after schema retry (unknown)',
      finishReason: null
    })

    expect(out.status).toBe('failed')
    expect(out.notes).toContain('parse_failed:unknown')
  })

  it('caps notes at 500 chars (source_sync_runs.notes safety)', () => {
    const out = deriveAiObserverRunOutcome({
      ...base,
      skippedReason: `Gemini response was not valid JSON after schema retry (${'x'.repeat(2000)})`,
      finishReason: 'MAX_TOKENS'
    })

    expect(out.notes.length).toBeLessThanOrEqual(500)
  })
})

describe('generateAiObserverRunId', () => {
  it('produces a prefixed, unique id', () => {
    const a = generateAiObserverRunId()
    const b = generateAiObserverRunId()

    expect(a).toMatch(/^ai-observer-/)
    expect(a).not.toBe(b)
  })
})
