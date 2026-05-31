import { describe, expect, it } from 'vitest'

import { SCIM_WORKFORCE_SIGNAL_READERS, getScimWorkforceSignals } from './scim-workforce-signals'

/**
 * Live PG tests para los signal readers SCIM + workforce intake.
 *
 * El CONTRATO (set de signals, unicidad, signalId declarado === retornado, no
 * silent drop) se verifica en CI sin PG en `scim-workforce-signals.test.ts`
 * derivando del registry SSOT `SCIM_WORKFORCE_SIGNAL_READERS` — sin número mágico.
 *
 * Acá solo verificamos lo que REQUIERE PG real: que cada reader ejecute contra
 * staging sin error y que el steady-state de severidad sea sano. La cantidad y los
 * IDs esperados se derivan del registry (no se hardcodean).
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('getScimWorkforceSignals — live PG', () => {
  it('emits exactly the registry signals against real PG', async () => {
    const signals = await getScimWorkforceSignals()

    expect(signals).toHaveLength(SCIM_WORKFORCE_SIGNAL_READERS.length)

    const emitted = signals.map(s => s.signalId).sort()
    const declared = SCIM_WORKFORCE_SIGNAL_READERS.map(reader => reader.signalId).sort()

    expect(emitted).toEqual(declared)
  })

  it('every signal has the canonical fields populated', async () => {
    const signals = await getScimWorkforceSignals()

    for (const signal of signals) {
      expect(signal.signalId).toBeTypeOf('string')
      expect(signal.moduleKey).toBe('identity')
      expect(['drift', 'data_quality', 'incident', 'subsystem', 'lag', 'dead_letter']).toContain(signal.kind)
      expect(['ok', 'warning', 'error', 'unknown']).toContain(signal.severity)
      expect(signal.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(signal.summary).toBeTypeOf('string')
      expect(signal.summary.length).toBeGreaterThan(0)
      expect(Array.isArray(signal.evidence)).toBe(true)
    }
  })

  it('no reader degrades to severity=unknown against healthy PG (queries execute cleanly)', async () => {
    const signals = await getScimWorkforceSignals()
    const unknown = signals.filter(s => s.severity === 'unknown')

    // severity='unknown' contra PG sano = la query del reader falló (schema drift,
    // columna renombrada, etc.). Es exactamente lo que este live test debe atrapar.
    if (unknown.length > 0) {
      console.log('[scim-workforce live] readers degraded to unknown (query failed):', unknown.map(s => s.signalId))
    }

    expect(unknown).toHaveLength(0)
  })

  it('steady-state: error signals are documented, not silent (Felipe/Maria backfill gap allowed)', async () => {
    const signals = await getScimWorkforceSignals()
    const errorSignals = signals.filter(s => s.severity === 'error')

    if (errorSignals.length > 0) {
      const errorIds = errorSignals.map(s => `${s.signalId}=${s.severity}`)

      console.log('[scim-workforce live] error signals (expected if Felipe/Maria pending backfill):', errorIds)
    }

    expect(signals.length).toBeGreaterThan(0)
  })
})
