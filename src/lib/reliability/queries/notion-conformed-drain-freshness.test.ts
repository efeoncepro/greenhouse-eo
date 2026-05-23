import { describe, expect, it } from 'vitest'

import { evaluateNotionConformedDrainRows } from './notion-conformed-drain-freshness'

const NOW = new Date('2026-05-23T12:00:00Z')
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000)

describe('evaluateNotionConformedDrainRows', () => {
  it('ok when last run succeeded within the window', () => {
    const result = evaluateNotionConformedDrainRows(
      [
        {
          latest_status: 'succeeded',
          latest_started_at: minutesAgo(60),
          latest_finished_at: minutesAgo(59),
          latest_notes: 'ok',
          latest_success_finished_at: minutesAgo(59)
        }
      ],
      NOW
    )

    expect(result.severity).toBe('ok')
  })

  it('warning when latest failed but a success exists within the window (recoverable next cycle)', () => {
    const result = evaluateNotionConformedDrainRows(
      [
        {
          latest_status: 'failed',
          latest_started_at: minutesAgo(30),
          latest_finished_at: minutesAgo(29),
          latest_notes: 'transient',
          latest_success_finished_at: minutesAgo(120)
        }
      ],
      NOW
    )

    expect(result.severity).toBe('warning')
  })

  it('error when no successful drain inside the window (sustained staleness)', () => {
    const result = evaluateNotionConformedDrainRows(
      [
        {
          latest_status: 'failed',
          latest_started_at: minutesAgo(60),
          latest_finished_at: minutesAgo(59),
          latest_notes: 'down',
          // Last success 40h ago — beyond the 30h window.
          latest_success_finished_at: minutesAgo(40 * 60)
        }
      ],
      NOW
    )

    expect(result.severity).toBe('error')
  })

  it('error when the drain has never run', () => {
    const result = evaluateNotionConformedDrainRows([], NOW)

    expect(result.severity).toBe('error')
    expect(result.summary).toContain('ninguna corrida')
  })

  it('always emits the canonical SQL evidence', () => {
    const result = evaluateNotionConformedDrainRows([], NOW)
    const sqlEvidence = result.evidence.find(e => e.kind === 'sql')

    expect(sqlEvidence?.value).toContain("source_object_type='bq_pg_drain'")
  })
})
