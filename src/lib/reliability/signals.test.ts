import { describe, expect, it } from 'vitest'

import { buildSubsystemSignals } from '@/lib/reliability/signals'

describe('buildSubsystemSignals', () => {
  it('prefers semantic subsystem summaries and propagates metrics as evidence', () => {
    const signals = buildSubsystemSignals([
      {
        name: 'Finance Data Quality',
        status: 'degraded',
        processed: 4,
        failed: 3,
        lastRun: '2026-04-25T23:12:54.192Z',
        summary: '3 buckets con issue activo: 1 drift de ledger, 2 costos directos sin cliente.',
        metrics: [
          { key: 'payment_ledger_integrity', label: 'Drift de ledger', value: 1, status: 'warning' },
          { key: 'direct_cost_without_client', label: 'Costo directo sin cliente', value: 2, status: 'warning' }
        ]
      }
    ])

    expect(signals).toHaveLength(1)
    expect(signals[0]).toMatchObject({
      moduleKey: 'finance',
      kind: 'subsystem',
      summary: '3 buckets con issue activo: 1 drift de ledger, 2 costos directos sin cliente.'
    })
    expect(signals[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'metric',
          label: 'Drift de ledger',
          value: '1 (warning)'
        }),
        expect.objectContaining({
          kind: 'metric',
          label: 'Costo directo sin cliente',
          value: '2 (warning)'
        })
      ])
    )
  })

  it('falls back to processed/failed wording for subsystems without semantic summary', () => {
    const signals = buildSubsystemSignals([
      {
        name: 'Proyecciones',
        status: 'degraded',
        processed: 12,
        failed: 1,
        lastRun: '2026-04-25T23:10:01.031Z'
      }
    ])

    expect(signals[0]?.summary).toContain('12 procesados')
    expect(signals[0]?.summary).toContain('1 con falla')
  })

  it('maps Commercial Health subsystem to the commercial reliability module', () => {
    const signals = buildSubsystemSignals([
      {
        name: 'Commercial Health',
        status: 'degraded',
        processed: 6,
        failed: 2,
        lastRun: '2026-05-07T20:00:00.000Z',
        summary: '2 señales Commercial Health con issue activo.',
        metrics: [
          { key: 'engagement_zombie', label: 'Zombie', value: 1, status: 'error' },
          { key: 'engagement_stale_progress', label: 'Progress stale', value: 1, status: 'warning' }
        ]
      }
    ])

    expect(signals).toHaveLength(1)
    expect(signals[0]).toMatchObject({
      signalId: 'subsystem.commercial_health',
      moduleKey: 'commercial',
      kind: 'subsystem',
      severity: 'warning'
    })
  })
})
