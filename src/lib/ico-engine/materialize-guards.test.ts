import { describe, it, expect } from 'vitest'

import {
  runUpstreamFreshnessGate,
  summarizeBlockingSignals,
  DEFAULT_BLOCKING_SEVERITY,
  type FreshnessSignalFetcher
} from './materialize-guards'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

const fakeSignal = (
  signalId: string,
  severity: ReliabilitySeverity
): ReliabilitySignal => ({
  signalId,
  moduleKey: 'identity',
  kind: 'drift',
  source: 'fakeSignal',
  label: `fake ${signalId}`,
  severity,
  summary: `fake summary for ${signalId} (${severity})`,
  observedAt: '2026-05-18T00:00:00.000Z',
  evidence: []
})

const fetcherFor = (signal: ReliabilitySignal): FreshnessSignalFetcher =>
  () => Promise.resolve(signal)

const throwingFetcher: FreshnessSignalFetcher = () =>
  Promise.reject(new Error('signal lookup failed'))

describe('runUpstreamFreshnessGate', () => {
  it('retorna safe=true cuando todos los signals son ok', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [
        fetcherFor(fakeSignal('a', 'ok')),
        fetcherFor(fakeSignal('b', 'ok'))
      ]
    })

    expect(result.safe).toBe(true)
    expect(result.blockingSignals).toEqual([])
    expect(result.reason).toBeNull()
  })

  it('retorna safe=true con warning (no bloqueante por default)', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [fetcherFor(fakeSignal('a', 'warning'))]
    })

    expect(result.safe).toBe(true)
    expect(result.blockingSignals).toEqual([])
  })

  it('retorna safe=false cuando AL MENOS un signal es error', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [
        fetcherFor(fakeSignal('a', 'ok')),
        fetcherFor(fakeSignal('b', 'error'))
      ]
    })

    expect(result.safe).toBe(false)
    if (result.safe) throw new Error('discriminant')
    expect(result.blockingSignals.map(s => s.signalId)).toEqual(['b'])
    expect(result.reason).toContain('b=error')
  })

  it('retorna safe=false con multiples errors y los lista todos en reason', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [
        fetcherFor(fakeSignal('a', 'error')),
        fetcherFor(fakeSignal('b', 'error'))
      ]
    })

    expect(result.safe).toBe(false)
    if (result.safe) throw new Error('discriminant')
    expect(result.blockingSignals.map(s => s.signalId)).toEqual(['a', 'b'])
    expect(result.reason).toContain('a=error')
    expect(result.reason).toContain('b=error')
  })

  it('respeta blockingSeverity override — warning + error bloquean cuando se pide', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [
        fetcherFor(fakeSignal('a', 'warning')),
        fetcherFor(fakeSignal('b', 'ok'))
      ],
      blockingSeverity: ['warning', 'error']
    })

    expect(result.safe).toBe(false)
    if (result.safe) throw new Error('discriminant')
    expect(result.blockingSignals.map(s => s.signalId)).toEqual(['a'])
  })

  it('degrada honestamente: signal que rechaza promise se filtra a null y NO bloquea', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [throwingFetcher, fetcherFor(fakeSignal('b', 'ok'))]
    })

    expect(result.safe).toBe(true)
    expect(result.blockingSignals).toEqual([])
  })

  it('signal con severity unknown NO bloquea por default (honest degradation)', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [fetcherFor(fakeSignal('a', 'unknown'))]
    })

    expect(result.safe).toBe(true)
  })

  it('DEFAULT_BLOCKING_SEVERITY es exactamente ["error"]', () => {
    expect(DEFAULT_BLOCKING_SEVERITY).toEqual(['error'])
  })

  it('cuando todos los signals fallan, retorna safe=true (no podemos bloquear sin senal)', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [throwingFetcher, throwingFetcher]
    })

    expect(result.safe).toBe(true)
  })

  it('preserva orden estable de blockingSignals para debugging deterministico', async () => {
    const result = await runUpstreamFreshnessGate({
      requireSignals: [
        fetcherFor(fakeSignal('zzz', 'error')),
        fetcherFor(fakeSignal('aaa', 'error')),
        fetcherFor(fakeSignal('mmm', 'error'))
      ]
    })

    expect(result.safe).toBe(false)
    if (result.safe) throw new Error('discriminant')
    expect(result.blockingSignals.map(s => s.signalId)).toEqual(['zzz', 'aaa', 'mmm'])
  })
})

describe('summarizeBlockingSignals', () => {
  it('extrae shape canonical para persistir en blocking_signals JSONB', () => {
    const signals = [
      fakeSignal('a', 'error'),
      fakeSignal('b', 'warning')
    ]

    const summary = summarizeBlockingSignals(signals)

    expect(summary).toEqual([
      {
        signalId: 'a',
        severity: 'error',
        label: 'fake a',
        summary: 'fake summary for a (error)'
      },
      {
        signalId: 'b',
        severity: 'warning',
        label: 'fake b',
        summary: 'fake summary for b (warning)'
      }
    ])
  })

  it('retorna [] cuando no hay signals bloqueantes', () => {
    expect(summarizeBlockingSignals([])).toEqual([])
  })
})
