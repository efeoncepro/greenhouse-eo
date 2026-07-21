import { describe, expect, it } from 'vitest'

import {
  formatMeetingDate,
  formatMeetingTimeRangeWithOffset,
  formatMeetingTimeWithOffset,
  formatMeetingTimezoneLabel,
} from '../renderer'

describe('meeting timezone presentation', () => {
  it('preserva la fecha civil en zonas UTC+14', () => {
    expect(formatMeetingDate('2026-07-22', 'Pacific/Kiritimati', 'long')).toContain('22 de julio')
    expect(formatMeetingDate('2026-07-22', 'Pacific/Kiritimati', 'long')).not.toContain('23 de julio')
  })

  it('convierte instantes UTC a la fecha local del visitante', () => {
    expect(formatMeetingDate('2026-07-22T01:00:00.000Z', 'America/Los_Angeles', 'long')).toContain('21 de julio')
    expect(formatMeetingDate('2026-07-22T01:00:00.000Z', 'Pacific/Kiritimati', 'long')).toContain('22 de julio')
  })

  it('desambigua las dos 01:30 del cambio DST con offsets diferentes', () => {
    const first = formatMeetingTimeWithOffset('2026-11-01T05:30:00.000Z', 'America/New_York')
    const second = formatMeetingTimeWithOffset('2026-11-01T06:30:00.000Z', 'America/New_York')

    expect(first).toContain('01:30')
    expect(second).toContain('01:30')
    expect(first).not.toBe(second)
  })

  it('usa el nombre IANA localizado sin inferir ciudades ni offsets con signo invertido', () => {
    const label = formatMeetingTimezoneLabel('Etc/GMT+4', new Date('2026-07-21T12:00:00.000Z'))

    expect(label).toContain('Tu zona horaria')
    expect(label).not.toContain('GMT+4 (GMT-4)')
  })

  it('presenta el rango confirmado con un único offset inequívoco', () => {
    expect(formatMeetingTimeRangeWithOffset(
      '2026-07-22T13:15:00.000Z',
      '2026-07-22T13:45:00.000Z',
      'America/Santiago',
    )).toBe('09:15–09:45 GMT-4')
  })
})
