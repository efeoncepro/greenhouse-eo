import { describe, expect, it } from 'vitest'

import { SCIM_WORKFORCE_SIGNAL_READERS, getScimWorkforceSignals } from './scim-workforce-signals'

/**
 * Contract tests (CI-runnable, sin PG) del registry canónico SCIM + workforce.
 *
 * Reemplazan el número mágico `toHaveLength(6)` del `.live` test: el set de signals
 * NO es fijo (creció 6→… con TASK-874 / TASK-877). Estos tests derivan TODO del
 * registry SSOT `SCIM_WORKFORCE_SIGNAL_READERS`, así que agregar un signal nunca
 * rompe el test falsamente — pero un duplicado, un silent drop o un signalId mal
 * cableado SÍ rompen el build.
 *
 * Corren en CI porque cada reader degrada a `severity:'unknown'` con su signalId
 * correcto cuando PG no está configurado (no necesitan base de datos real).
 */
describe('SCIM workforce signal registry (SSOT contract)', () => {
  it('the registry is non-empty', () => {
    expect(SCIM_WORKFORCE_SIGNAL_READERS.length).toBeGreaterThan(0)
  })

  it('every declared signalId is unique (no duplicate readers)', () => {
    const ids = SCIM_WORKFORCE_SIGNAL_READERS.map(reader => reader.signalId)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every registry entry exposes a reader function', () => {
    for (const reader of SCIM_WORKFORCE_SIGNAL_READERS) {
      expect(reader.signalId).toBeTypeOf('string')
      expect(reader.signalId.length).toBeGreaterThan(0)
      expect(reader.read).toBeTypeOf('function')
    }
  })

  it("each reader returns a signal whose signalId matches its declared registry id", async () => {
    for (const reader of SCIM_WORKFORCE_SIGNAL_READERS) {
      const signal = await reader.read()

      expect(signal.signalId).toBe(reader.signalId)
      expect(signal.moduleKey).toBe('identity')
    }
  })

  it('the aggregator emits exactly the registry signals — no drift, no silent drop', async () => {
    const signals = await getScimWorkforceSignals()

    expect(signals).toHaveLength(SCIM_WORKFORCE_SIGNAL_READERS.length)

    const emitted = signals.map(s => s.signalId).sort()
    const declared = SCIM_WORKFORCE_SIGNAL_READERS.map(reader => reader.signalId).sort()

    expect(emitted).toEqual(declared)
  })
})
