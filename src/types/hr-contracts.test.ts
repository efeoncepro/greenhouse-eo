import { describe, expect, it } from 'vitest'

import {
  CONTRACT_DERIVATIONS,
  contractAllowsRemoteAllowance,
  isCanonicalContractPayrollTuple,
  normalizeContractType,
  resolveScheduleRequired
} from './hr-contracts'

describe('hr contract taxonomy', () => {
  it('derives international_internal as international payroll operated internally', () => {
    expect(CONTRACT_DERIVATIONS.international_internal).toEqual({
      payRegime: 'international',
      payrollVia: 'internal'
    })
  })

  it('normalizes international_internal without degrading it to indefinido', () => {
    expect(normalizeContractType('international_internal')).toBe('international_internal')
  })

  it('keeps international_internal remote allowance disabled by default', () => {
    expect(contractAllowsRemoteAllowance('international_internal')).toBe(false)
    expect(resolveScheduleRequired({ contractType: 'international_internal' })).toBe(false)
  })

  it('validates canonical payroll tuples for international_internal only on internal rail', () => {
    expect(
      isCanonicalContractPayrollTuple({
        contractType: 'international_internal',
        payRegime: 'international',
        payrollVia: 'internal'
      })
    ).toBe(true)

    expect(
      isCanonicalContractPayrollTuple({
        contractType: 'international_internal',
        payRegime: 'international',
        payrollVia: 'deel'
      })
    ).toBe(false)
  })
})
