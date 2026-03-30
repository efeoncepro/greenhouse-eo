import { describe, expect, it } from 'vitest'

import {
  isInternalCommercialAssignment,
  isInternalCommercialClientId,
  isInternalCommercialClientName
} from '@/lib/team-capacity/internal-assignments'

describe('internal commercial assignment rules', () => {
  it('identifies internal client ids', () => {
    expect(isInternalCommercialClientId('space-efeonce')).toBe(true)
    expect(isInternalCommercialClientId(' client_internal ')).toBe(true)
    expect(isInternalCommercialClientId('client-sky')).toBe(false)
  })

  it('identifies internal client names', () => {
    expect(isInternalCommercialClientName('Efeonce')).toBe(true)
    expect(isInternalCommercialClientName(' efeonce internal ')).toBe(true)
    expect(isInternalCommercialClientName('Sky Airline')).toBe(false)
  })

  it('treats assignments as internal when either id or name is internal', () => {
    expect(isInternalCommercialAssignment({ clientId: 'space-efeonce', clientName: 'Efeonce' })).toBe(true)
    expect(isInternalCommercialAssignment({ clientId: 'client-sky', clientName: 'Sky Airline' })).toBe(false)
  })
})
