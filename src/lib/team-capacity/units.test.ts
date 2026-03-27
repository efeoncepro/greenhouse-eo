import { describe, expect, it } from 'vitest'

import {
  buildCapacityEnvelope,
  clampFte,
  fteToHours,
  getCommercialAvailabilityHours,
  getOperationalAvailabilityHours,
  hoursToFte
} from '@/lib/team-capacity/units'

describe('team-capacity/units', () => {
  it('converts fte to hours and back', () => {
    expect(fteToHours(1)).toBe(160)
    expect(fteToHours(0.5)).toBe(80)
    expect(hoursToFte(160)).toBe(1)
    expect(hoursToFte(80)).toBe(0.5)
  })

  it('clamps fte to the contractual max', () => {
    expect(clampFte(1.8)).toBe(1)
    expect(clampFte(0.75)).toBe(0.8)
  })

  it('builds separate commercial and operational envelopes', () => {
    const envelope = buildCapacityEnvelope({
      contractedFte: 1,
      assignedHours: 120,
      usedHours: 90
    })

    expect(envelope.contractedHours).toBe(160)
    expect(envelope.commercialAvailabilityHours).toBe(40)
    expect(envelope.operationalAvailabilityHours).toBe(70)
    expect(envelope.overassignedCommercially).toBe(false)
    expect(envelope.overloadedOperationally).toBe(false)
  })

  it('detects commercial overassignment separately from operational load', () => {
    const envelope = buildCapacityEnvelope({
      contractedFte: 1,
      assignedHours: 200,
      usedHours: null
    })

    expect(envelope.overassignedCommercially).toBe(true)
    expect(envelope.commercialAvailabilityHours).toBe(0)
    expect(envelope.operationalAvailabilityHours).toBeNull()
    expect(envelope.overloadedOperationally).toBeNull()
  })

  it('computes commercial and operational availability helpers', () => {
    expect(getCommercialAvailabilityHours({ contractedHours: 160, assignedHours: 100 })).toBe(60)
    expect(getOperationalAvailabilityHours({ contractedHours: 160, usedHours: 120 })).toBe(40)
    expect(getOperationalAvailabilityHours({ contractedHours: 160, usedHours: null })).toBeNull()
  })
})
