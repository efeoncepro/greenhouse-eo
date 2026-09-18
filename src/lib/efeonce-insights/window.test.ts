import { describe, expect, it } from 'vitest'

import { InsightsInvalidWindowError } from './errors'
import { civilMidnightToUtc, resolveInsightWindows, subtractCivilYear } from './window'

const NOW = new Date('2026-09-15T12:00:00.000Z')
const SCL = 'America/Santiago'

describe('TASK-1845 — resolución de ventanas', () => {
  it('resuelve medianoche civil en zona IANA con DST (Santiago: -04 en invierno, -03 en verano)', () => {
    // Chile vuelve a horario de verano (UTC-3) el primer domingo de septiembre de 2026 (06/09).
    expect(civilMidnightToUtc({ year: 2026, month: 8, day: 1 }, SCL).toISOString()).toBe('2026-08-01T04:00:00.000Z')
    expect(civilMidnightToUtc({ year: 2026, month: 9, day: 7 }, SCL).toISOString()).toBe('2026-09-07T03:00:00.000Z')
    expect(civilMidnightToUtc({ year: 2026, month: 1, day: 1 }, 'UTC').toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('un mes completo es wholeMonths y su período anterior es el mes anterior, no "30 días"', () => {
    const windows = resolveInsightWindows({ start: '2026-03-01', endExclusive: '2026-04-01', timeZone: SCL }, { kind: 'previous_period' }, NOW)

    expect(windows.current).toMatchObject({ days: 31, wholeMonths: true, months: ['2026-03'], endInclusive: '2026-03-31', partial: false })
    expect(windows.comparison).toMatchObject({ start: '2026-02-01', endExclusive: '2026-03-01', days: 28, wholeMonths: true })
  })

  it('un rango arbitrario compara contra el mismo largo en días inmediatamente anterior', () => {
    const windows = resolveInsightWindows({ start: '2026-08-10', endExclusive: '2026-08-20', timeZone: 'UTC' }, { kind: 'previous_period' }, NOW)

    expect(windows.current.days).toBe(10)
    expect(windows.comparison).toMatchObject({ start: '2026-07-31', endExclusive: '2026-08-10', days: 10, wholeMonths: false })
  })

  it('previous_year conserva fechas civiles y el 29 de febrero cae en 28 de febrero', () => {
    const windows = resolveInsightWindows({ start: '2024-02-01', endExclusive: '2024-03-01', timeZone: 'UTC' }, { kind: 'previous_year' }, NOW)

    expect(windows.current.days).toBe(29)
    expect(windows.comparison).toMatchObject({ start: '2023-02-01', endExclusive: '2023-03-01', days: 28 })
    expect(subtractCivilYear({ year: 2024, month: 2, day: 29 })).toEqual({ year: 2023, month: 2, day: 28 })
  })

  it('un período que aún no cerró queda etiquetado parcial', () => {
    const windows = resolveInsightWindows({ start: '2026-09-01', endExclusive: '2026-10-01', timeZone: SCL }, { kind: 'none' }, NOW)

    expect(windows.current.partial).toBe(true)
    expect(windows.comparison).toBeNull()
  })

  it('rechaza fechas inválidas, ventanas vacías, futuras, zonas inválidas y custom solapado', () => {
    expect(() => resolveInsightWindows({ start: '2026-02-30', endExclusive: '2026-03-01', timeZone: 'UTC' }, { kind: 'none' }, NOW)).toThrow(InsightsInvalidWindowError)
    expect(() => resolveInsightWindows({ start: '2026-03-01', endExclusive: '2026-03-01', timeZone: 'UTC' }, { kind: 'none' }, NOW)).toThrow(InsightsInvalidWindowError)
    expect(() => resolveInsightWindows({ start: '2027-01-01', endExclusive: '2027-02-01', timeZone: 'UTC' }, { kind: 'none' }, NOW)).toThrow(InsightsInvalidWindowError)
    expect(() => resolveInsightWindows({ start: '2026-03-01', endExclusive: '2026-04-01', timeZone: 'Marte/Olympus' }, { kind: 'none' }, NOW)).toThrow(InsightsInvalidWindowError)
    expect(() =>
      resolveInsightWindows({ start: '2026-03-01', endExclusive: '2026-04-01', timeZone: 'UTC' }, { kind: 'custom', start: '2026-03-15', endExclusive: '2026-04-15' }, NOW)
    ).toThrow(InsightsInvalidWindowError)
  })
})

describe('resolveClosedInsightPeriods (TASK-1848)', () => {
  it('mes anterior = mes calendario, respeta consolidación en la zona y ordena del más antiguo al más reciente', async () => {
    const { resolveClosedInsightPeriods } = await import('./window')

    // 3 de septiembre 12:00 UTC en Santiago: sin consolidación el último cerrado es agosto.
    expect(resolveClosedInsightPeriods({ cadence: 'monthly', timeZone: 'America/Santiago', consolidationDays: 0, count: 1, now: new Date('2026-09-03T12:00:00Z') }))
      .toEqual([{ start: '2026-08-01', endExclusive: '2026-09-01' }])

    // Con 5 días de consolidación, el 3 de septiembre agosto todavía no cuenta: el último es julio.
    expect(resolveClosedInsightPeriods({ cadence: 'monthly', timeZone: 'America/Santiago', consolidationDays: 5, count: 2, now: new Date('2026-09-03T12:00:00Z') }))
      .toEqual([{ start: '2026-06-01', endExclusive: '2026-07-01' }, { start: '2026-07-01', endExclusive: '2026-08-01' }])

    // Febrero bisiesto: el mes tiene 29 días, no 30.
    expect(resolveClosedInsightPeriods({ cadence: 'monthly', timeZone: 'UTC', consolidationDays: 0, count: 1, now: new Date('2028-03-10T00:00:00Z') }))
      .toEqual([{ start: '2028-02-01', endExclusive: '2028-03-01' }])
  })

  it('el día civil es el de la zona, no el UTC', async () => {
    const { resolveClosedInsightPeriods } = await import('./window')

    // 1 de octubre 02:00 UTC = 30 de septiembre 23:00 en Santiago (UTC-3): septiembre aún no cierra allá.
    expect(resolveClosedInsightPeriods({ cadence: 'monthly', timeZone: 'America/Santiago', consolidationDays: 0, count: 1, now: new Date('2026-10-01T02:00:00Z') }))
      .toEqual([{ start: '2026-08-01', endExclusive: '2026-09-01' }])
  })

  it('semana ISO lunes a lunes', async () => {
    const { resolveClosedInsightPeriods } = await import('./window')

    // Jueves 17 de septiembre 2026: la última semana cerrada es lun 7 → lun 14.
    expect(resolveClosedInsightPeriods({ cadence: 'weekly', timeZone: 'UTC', consolidationDays: 0, count: 1, now: new Date('2026-09-17T10:00:00Z') }))
      .toEqual([{ start: '2026-09-07', endExclusive: '2026-09-14' }])
  })
})
