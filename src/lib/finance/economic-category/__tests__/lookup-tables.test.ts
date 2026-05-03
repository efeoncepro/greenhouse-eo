import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

import { lookupKnownPayrollVendor, lookupKnownRegulator } from '../identity-lookup'

beforeEach(() => {
  queryMock.mockReset()
})

describe('TASK-768 lookupKnownRegulator', () => {
  it('matchea contra known_regulators con regex case-insensitive', async () => {
    queryMock.mockResolvedValueOnce([
      { match_id: 'reg-cl-previred', display_name: 'Previred' }
    ])

    const result = await lookupKnownRegulator('PAGO EN LINEA PREVIRED')

    expect(result).toEqual({ regulatorId: 'reg-cl-previred', displayName: 'Previred' })
    expect(queryMock.mock.calls[0][0]).toContain('greenhouse_finance.known_regulators')
    expect(queryMock.mock.calls[0][0]).toContain('~* match_regex')
  })

  it('retorna null cuando no hay match', async () => {
    queryMock.mockResolvedValueOnce([])

    expect(await lookupKnownRegulator('Adobe Creative Cloud')).toBeNull()
  })

  it('retorna null para texto vacío sin invocar query', async () => {
    expect(await lookupKnownRegulator('')).toBeNull()
    expect(queryMock).not.toHaveBeenCalled()
  })
})

describe('TASK-768 lookupKnownPayrollVendor', () => {
  it('matchea Deel correctamente', async () => {
    queryMock.mockResolvedValueOnce([
      { match_id: 'vendor-deel', display_name: 'Deel Inc.' }
    ])

    const result = await lookupKnownPayrollVendor('Deel pago a Melkin Hernandez')

    expect(result).toEqual({ vendorId: 'vendor-deel', displayName: 'Deel Inc.' })
    expect(queryMock.mock.calls[0][0]).toContain('greenhouse_finance.known_payroll_vendors')
  })

  it('retorna null para vendors no registrados', async () => {
    queryMock.mockResolvedValueOnce([])

    expect(await lookupKnownPayrollVendor('Adobe Creative Cloud')).toBeNull()
  })
})
