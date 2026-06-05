import { describe, expect, it } from 'vitest'

import type { ContractTuple } from '../jurisdiction-packs/types'
import {
  buildContractingDraftingPrompt,
  buildContractingInputPacket,
  buildContractingSystemPrompt,
  sanitizeFacts
} from './input-packet'

const TUPLE: ContractTuple = { contractType: 'indefinido', payRegime: 'chile', payrollVia: 'internal' }

describe('sanitizeFacts (allowlist anti-leak)', () => {
  it('drops non-allowed sensitive keys and keeps document-necessary facts', () => {
    const { sanitized, dropped } = sanitizeFacts({
      full_name: 'Camila Torres',
      national_id: '19876543-2',
      gross_amount: '1950000',
      currency: 'CLP',
      // forbidden by arch §11 — must be dropped:
      bank_account: 'CL12-3456-7890',
      anthropic_api_key: 'sk-ant-secret',
      salary_history: [{ month: '2026-04', net: 1800000 }],
      other_person_payroll: 'do not send'
    })

    expect(sanitized.full_name).toBe('Camila Torres')
    expect(sanitized.gross_amount).toBe('1950000')
    expect(sanitized.bank_account).toBeUndefined()
    expect(sanitized.anthropic_api_key).toBeUndefined()
    expect(sanitized.salary_history).toBeUndefined()
    expect(dropped).toEqual(
      expect.arrayContaining(['bank_account', 'anthropic_api_key', 'salary_history', 'other_person_payroll'])
    )
  })

  it('drops empty allowed values', () => {
    const { sanitized } = sanitizeFacts({ full_name: '', benefits: [], currency: 'CLP' })

    expect(sanitized.full_name).toBeUndefined()
    expect(sanitized.benefits).toBeUndefined()
    expect(sanitized.currency).toBe('CLP')
  })
})

describe('input packet + prompt contract (no secrets reach the prompt)', () => {
  it('builds a packet with only allowed facts and a leak-free prompt', () => {
    const { packet, providedFactCodes, droppedFactCodes } = buildContractingInputPacket({
      facts: {
        full_name: 'Camila Torres',
        gross_amount: '1950000',
        currency: 'CLP',
        bank_account: 'CL12-3456-7890',
        anthropic_api_key: 'sk-ant-supersecret'
      },
      documentKind: 'employment_contract',
      jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
      contractTuple: TUPLE
    })

    expect(providedFactCodes).toEqual(expect.arrayContaining(['full_name', 'gross_amount', 'currency']))
    expect(droppedFactCodes).toEqual(expect.arrayContaining(['bank_account', 'anthropic_api_key']))

    const prompt = buildContractingDraftingPrompt(packet)

    expect(prompt).not.toContain('sk-ant-supersecret')
    expect(prompt).not.toContain('CL12-3456-7890')
    expect(prompt).toContain('CL_CHILE_DEPENDENT_V1')
    expect(prompt).toContain('Camila Torres')
  })

  it('system prompt declares the advisory-only guardrails', () => {
    const system = buildContractingSystemPrompt()

    expect(system).toContain('es-CL')
    expect(system).toContain('en-US')
    expect(system.toLowerCase()).toContain('no apruebas')
    expect(system.toLowerCase()).toContain('inventes')
  })
})
