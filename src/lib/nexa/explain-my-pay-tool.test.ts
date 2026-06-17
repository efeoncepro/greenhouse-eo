import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NexaRuntimeContext } from './nexa-contract'

// Mocks de los readers/presentación canónicos de payroll (sin DB).
const memberPayrollMock = vi.fn()
const buildReceiptPresentationMock = vi.fn()

vi.mock('@/lib/payroll/postgres-store', () => ({
  pgGetMemberPayrollEntries: (memberId: unknown) => memberPayrollMock(memberId)
}))

vi.mock('@/lib/payroll/receipt-presenter', async importActual => {
  const actual = (await importActual()) as Record<string, unknown>

  return {
    ...actual,
    buildReceiptPresentation: (entry: unknown) => buildReceiptPresentationMock(entry)
  }
})

import { executeNexaTool, getNexaToolDeclarations } from './nexa-tools'

const baseTenant: NexaRuntimeContext = {
  userId: 'user-1',
  clientId: 'client-1',
  clientName: 'Efeonce',
  tenantType: 'efeonce_internal',
  role: 'collaborator',
  roleCodes: ['collaborator'],
  routeGroups: ['my'],
  timezone: 'America/Santiago'
}

const memberTenant: NexaRuntimeContext = { ...baseTenant, memberId: 'member-self' }

const presentation = {
  regime: 'chile_dependent' as const,
  hero: { variant: 'primary' as const, label: 'Líquido a pagar', amount: '$1.200.000' },
  grossTotal: '$1.500.000',
  deductionSection: { title: 'Descuentos legales', totalLabel: 'Total', totalAmount: '$300.000', rows: [{ key: 'afp', label: 'AFP', amount: '$150.000' }] },
  haberesRows: [{ key: 'base', label: 'Sueldo base', amount: '$1.500.000' }]
}

const hasTool = (tenant: NexaRuntimeContext) =>
  getNexaToolDeclarations(tenant).some(declaration => declaration.name === 'explain_my_pay')

const run = (context: NexaRuntimeContext) =>
  executeNexaTool({ toolCallId: 't1', toolName: 'explain_my_pay', args: {}, context })

describe('explain_my_pay tool (TASK-1146)', () => {
  beforeEach(() => {
    memberPayrollMock.mockReset().mockResolvedValue([{ entryId: 'e1', memberName: 'Daniela', currency: 'CLP' }])
    buildReceiptPresentationMock.mockReset().mockReturnValue(presentation)
  })

  afterEach(() => {
    memberPayrollMock.mockReset()
    buildReceiptPresentationMock.mockReset()
  })

  it('disponible solo cuando el subject tiene memberId', () => {
    expect(hasTool(memberTenant)).toBe(true)
    expect(hasTool(baseTenant)).toBe(false)
  })

  it('explica el pago PROPIO: líquido + desglose + régimen', async () => {
    const { result } = await run(memberTenant)

    expect(result.available).toBe(true)
    expect(result.summary).toContain('$1.200.000')
    expect(result.summary.toLowerCase()).toContain('líquido')
    expect(result.summary).toContain('Chile dependiente')
  })

  it('anti-oracle: lee SIEMPRE con el memberId de sesión', async () => {
    await run({ ...memberTenant, memberId: 'member-self' })

    expect(memberPayrollMock).toHaveBeenCalledWith('member-self')
  })

  it('sin liquidación procesada → resultado unavailable honesto (no inventa)', async () => {
    memberPayrollMock.mockResolvedValue([])

    const { result } = await run(memberTenant)

    expect(result.available).toBe(false)
    expect(result.summary).toContain('Todavía no tienes')
  })

  it('Deel: refleja el footnote (Deel determina el líquido), regime-aware', async () => {
    buildReceiptPresentationMock.mockReturnValue({
      ...presentation,
      regime: 'international_deel',
      hero: { variant: 'primary', label: 'Monto bruto registrado', amount: 'US$ 4.000', footnote: 'Deel determina el líquido según el país.' },
      deductionSection: null
    })

    const { result } = await run(memberTenant)

    expect(result.summary).toContain('Deel determina el líquido')
    expect(result.summary).toContain('US$ 4.000')
  })
})
