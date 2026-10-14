import { describe, expect, it } from 'vitest'

import { readVisitorMeasurementRequest } from '../visitor-request'

describe('visitor-facing measurement request snapshot', () => {
  it('takes the visitor IP from the first forwarded hop and the request UA', () => {
    expect(readVisitorMeasurementRequest(new Headers({ 'x-forwarded-for': '198.51.100.1, 192.0.2.1', 'user-agent': 'Fixture Browser' })))
      .toEqual({ ip: '198.51.100.1', userAgent: 'Fixture Browser' })
  })
  it.each([['[2001:db8::1]:443', '2001:db8::1'], ['198.51.100.1:443', '198.51.100.1'], ['2001:db8::1', '2001:db8::1']])('normalizes IP transport format %s', (raw, ip) => {
    expect(readVisitorMeasurementRequest(new Headers({ 'x-forwarded-for': raw })).ip).toBe(ip)
  })
  it('falls back to real-IP and never invents worker data', () => {
    expect(readVisitorMeasurementRequest(new Headers({ 'x-forwarded-for': 'unknown', 'x-real-ip': '198.51.100.1' }))).toEqual({ ip: '198.51.100.1', userAgent: null })
    expect(readVisitorMeasurementRequest(new Headers())).toEqual({ ip: null, userAgent: null })
  })
})
