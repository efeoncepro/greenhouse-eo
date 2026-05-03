import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const lookupMemberByRutMock = vi.fn()
const lookupMemberByEmailMock = vi.fn()
const lookupMemberByDisplayNameMock = vi.fn()
const lookupSupplierByRutMock = vi.fn()
const lookupKnownPayrollVendorMock = vi.fn()
const lookupKnownRegulatorMock = vi.fn()
const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('../identity-lookup', () => ({
  extractRutsFromText: (text: string | null | undefined) => {
    if (!text) return []
    const matches = text.match(/\b\d{1,2}\.\d{3}\.\d{3}-[0-9kK]\b/g) ?? []

    return matches.map(rut => rut.toUpperCase())
  },
  lookupMemberByRut: (...args: unknown[]) => lookupMemberByRutMock(...args),
  lookupMemberByEmail: (...args: unknown[]) => lookupMemberByEmailMock(...args),
  lookupMemberByDisplayName: (...args: unknown[]) => lookupMemberByDisplayNameMock(...args),
  lookupSupplierByRut: (...args: unknown[]) => lookupSupplierByRutMock(...args),
  lookupKnownPayrollVendor: (...args: unknown[]) => lookupKnownPayrollVendorMock(...args),
  lookupKnownRegulator: (...args: unknown[]) => lookupKnownRegulatorMock(...args)
}))

import {
  resolveExpenseEconomicCategory,
  resolveIncomeEconomicCategory
} from '../resolver'

const internalMember = {
  memberId: 'member-luis',
  identityProfileId: 'profile-luis',
  displayName: 'Luis Reyes',
  employmentType: 'internal',
  primaryEmail: 'luis@efeonce.org',
  active: true,
  payrollVia: 'ecg_chile',
  deelContractId: null
}

const externalMember = {
  memberId: 'member-melkin',
  identityProfileId: 'profile-melkin',
  displayName: 'Melkin Hernandez',
  employmentType: 'contractor',
  primaryEmail: 'melkin@example.com',
  active: true,
  payrollVia: 'deel',
  deelContractId: 'deel-contract-melkin'
}

beforeEach(() => {
  vi.clearAllMocks()
  queryMock.mockReset()
  lookupMemberByRutMock.mockResolvedValue(null)
  lookupMemberByEmailMock.mockResolvedValue(null)
  lookupMemberByDisplayNameMock.mockResolvedValue(null)
  lookupSupplierByRutMock.mockResolvedValue(null)
  lookupKnownPayrollVendorMock.mockResolvedValue(null)
  lookupKnownRegulatorMock.mockResolvedValue(null)
})

describe('TASK-768 resolveExpenseEconomicCategory', () => {
  it('Rule 1: beneficiaryMemberId resuelto a member interno → labor_cost_internal', async () => {
    queryMock.mockResolvedValueOnce([
      {
        member_id: internalMember.memberId,
        identity_profile_id: internalMember.identityProfileId,
        display_name: internalMember.displayName,
        employment_type: 'internal',
        primary_email: internalMember.primaryEmail,
        active: true,
        payroll_via: 'ecg_chile',
        deel_contract_id: null
      }
    ])

    const result = await resolveExpenseEconomicCategory({ beneficiaryMemberId: 'member-luis' })

    expect(result.category).toBe('labor_cost_internal')
    expect(result.confidence).toBe('high')
    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_MEMBER_ID')
  })

  it('Rule 1: member con employment_type=contractor → labor_cost_external', async () => {
    queryMock.mockResolvedValueOnce([
      {
        member_id: externalMember.memberId,
        identity_profile_id: externalMember.identityProfileId,
        display_name: externalMember.displayName,
        employment_type: 'contractor',
        primary_email: externalMember.primaryEmail,
        active: true,
        payroll_via: 'deel',
        deel_contract_id: externalMember.deelContractId
      }
    ])

    const result = await resolveExpenseEconomicCategory({ beneficiaryMemberId: 'member-melkin' })

    expect(result.category).toBe('labor_cost_external')
    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_MEMBER_ID')
  })

  it('Rule 2: RUT explícito → member interno → labor_cost_internal', async () => {
    lookupMemberByRutMock.mockResolvedValueOnce(internalMember)

    const result = await resolveExpenseEconomicCategory({ beneficiaryRut: '15.123.456-7' })

    expect(result.category).toBe('labor_cost_internal')
    expect(result.confidence).toBe('high')
    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_RUT')
    expect(lookupMemberByRutMock).toHaveBeenCalledWith('15.123.456-7')
  })

  it('Rule 2: RUT extraído de description (caso real Humberly $300k abril)', async () => {
    lookupMemberByRutMock.mockResolvedValueOnce({
      ...externalMember,
      memberId: 'member-humberly',
      displayName: 'Humberly Henriquez',
      employmentType: 'internal',
      payrollVia: 'ecg_chile',
      deelContractId: null
    })

    const result = await resolveExpenseEconomicCategory({
      rawDescription: 'Transf.Internet a 27.836.817-3'
    })

    expect(result.category).toBe('labor_cost_internal')
    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_RUT')
    expect(result.evidence.candidate_rut).toBe('27.836.817-3')
  })

  it('Rule 2: RUT match supplier marked as partner → financial_settlement', async () => {
    lookupSupplierByRutMock.mockResolvedValueOnce({
      supplierId: 'sup-factoring',
      tradeName: 'Bici Factoring',
      legalName: 'Bici Factoring SpA',
      taxId: '76.123.456-1',
      isPartner: true
    })

    const result = await resolveExpenseEconomicCategory({ beneficiaryRut: '76.123.456-1' })

    expect(result.category).toBe('financial_settlement')
    expect(result.matchedRule).toBe('SUPPLIER_LOOKUP_PARTNER')
  })

  it('Rule 3: email match → member externo → labor_cost_external', async () => {
    lookupMemberByEmailMock.mockResolvedValueOnce(externalMember)

    const result = await resolveExpenseEconomicCategory({
      beneficiaryName: 'melkin@example.com'
    })

    expect(result.category).toBe('labor_cost_external')
    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_EMAIL')
  })

  it('Rule 5: known payroll vendor regex (Deel pago a Melkin)', async () => {
    lookupKnownPayrollVendorMock.mockResolvedValueOnce({
      vendorId: 'vendor-deel',
      displayName: 'Deel Inc.'
    })

    const result = await resolveExpenseEconomicCategory({
      beneficiaryName: 'Deel Inc.',
      rawDescription: 'Deel pago a Melkin Hernandez'
    })

    expect(result.category).toBe('labor_cost_external')
    expect(result.confidence).toBe('high')
    expect(result.matchedRule).toBe('KNOWN_PAYROLL_VENDOR_REGEX')
    expect(result.evidence.vendor_id).toBe('vendor-deel')
  })

  it('Rule 6: known regulator regex (Previred caso real)', async () => {
    lookupKnownRegulatorMock.mockResolvedValueOnce({
      regulatorId: 'reg-cl-previred',
      displayName: 'Previred'
    })

    const result = await resolveExpenseEconomicCategory({
      rawDescription: 'PAGO EN LINEA PREVIRED'
    })

    expect(result.category).toBe('regulatory_payment')
    expect(result.matchedRule).toBe('KNOWN_REGULATOR_REGEX')
  })

  it('Rule 6: SII match (caso real PAGO EN LINEA S.I.I.)', async () => {
    lookupKnownRegulatorMock.mockResolvedValueOnce({
      regulatorId: 'reg-cl-sii',
      displayName: 'Servicio de Impuestos Internos'
    })

    const result = await resolveExpenseEconomicCategory({
      rawDescription: 'PAGO EN LINEA S.I.I.'
    })

    expect(result.category).toBe('regulatory_payment')
    expect(result.matchedRule).toBe('KNOWN_REGULATOR_REGEX')
  })

  it('Rule 4: name fuzzy match (single result)', async () => {
    lookupMemberByDisplayNameMock.mockResolvedValueOnce(internalMember)

    const result = await resolveExpenseEconomicCategory({
      beneficiaryName: 'Luis Reyes'
    })

    expect(result.category).toBe('labor_cost_internal')
    expect(result.confidence).toBe('medium')
    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_NAME')
  })

  it('Rule 8: accounting_type=tax → tax (transparent map)', async () => {
    const result = await resolveExpenseEconomicCategory({ accountingType: 'tax' })

    expect(result.category).toBe('tax')
    expect(result.confidence).toBe('high')
    expect(result.matchedRule).toBe('ACCOUNTING_TYPE_TRANSPARENT_MAP')
  })

  it('Rule 8: accounting_type=social_security → regulatory_payment', async () => {
    const result = await resolveExpenseEconomicCategory({
      accountingType: 'social_security'
    })

    expect(result.category).toBe('regulatory_payment')
    expect(result.matchedRule).toBe('ACCOUNTING_TYPE_TRANSPARENT_MAP')
  })

  it('Rule 8: accounting_type=financial_cost → financial_cost', async () => {
    const result = await resolveExpenseEconomicCategory({
      accountingType: 'financial_cost'
    })

    expect(result.category).toBe('financial_cost')
    expect(result.matchedRule).toBe('ACCOUNTING_TYPE_TRANSPARENT_MAP')
  })

  it('Rule 9: accounting_type=supplier (sin match identity) → vendor_cost_saas low confidence', async () => {
    const result = await resolveExpenseEconomicCategory({
      beneficiaryName: 'Adobe',
      accountingType: 'supplier'
    })

    expect(result.category).toBe('vendor_cost_saas')
    expect(result.confidence).toBe('low')
    expect(result.matchedRule).toBe('ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK')
    expect(result.evidence.enqueue_manual).toBe(true)
  })

  it('Rule 9: accounting_type=bank_fee → bank_fee_real', async () => {
    const result = await resolveExpenseEconomicCategory({ accountingType: 'bank_fee' })

    expect(result.category).toBe('bank_fee_real')
    expect(result.matchedRule).toBe('ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK')
  })

  it('Rule 10: nada matchea → other con manual_required', async () => {
    const result = await resolveExpenseEconomicCategory({})

    expect(result.category).toBe('other')
    expect(result.confidence).toBe('manual_required')
    expect(result.matchedRule).toBe('MANUAL_REQUIRED_FALLBACK')
  })

  it('regex extracts RUT con DV K minúscula y normaliza a mayúscula', async () => {
    lookupMemberByRutMock.mockImplementation(async (rut: string) => {
      if (rut === '20.557.199-K') return internalMember
      return null
    })

    const result = await resolveExpenseEconomicCategory({
      rawDescription: 'Transf.Internet a 20.557.199-k'
    })

    expect(result.matchedRule).toBe('IDENTITY_MATCH_BY_RUT')
    expect(result.evidence.candidate_rut).toBe('20.557.199-K')
  })

  it('rate orden first-match: identity gana sobre vendor regex', async () => {
    lookupMemberByRutMock.mockResolvedValueOnce(externalMember)
    // vendor mock no debería invocarse cuando identity rule gana

    await resolveExpenseEconomicCategory({
      beneficiaryRut: '15.123.456-7',
      rawDescription: 'Deel pago' // tendría que matchear vendor regex pero RUT gana primero
    })

    expect(lookupMemberByRutMock).toHaveBeenCalled()
    expect(lookupKnownPayrollVendorMock).not.toHaveBeenCalled()
  })
})

describe('TASK-768 resolveIncomeEconomicCategory', () => {
  it('Rule 1: accounting_type=factoring → factoring_proceeds', async () => {
    const result = await resolveIncomeEconomicCategory({ accountingType: 'factoring' })

    expect(result.category).toBe('factoring_proceeds')
    expect(result.matchedRule).toBe('ACCOUNTING_TYPE_FACTORING')
  })

  it('Rule 1: sourceKind contiene "factoring" → factoring_proceeds', async () => {
    const result = await resolveIncomeEconomicCategory({ sourceKind: 'factoring_advance' })

    expect(result.category).toBe('factoring_proceeds')
  })

  it('Rule 2: accounting_type=client_reimbursement → client_reimbursement', async () => {
    const result = await resolveIncomeEconomicCategory({
      accountingType: 'client_reimbursement'
    })

    expect(result.category).toBe('client_reimbursement')
  })

  it('Rule 5: accounting_type=tax_refund → tax_refund', async () => {
    const result = await resolveIncomeEconomicCategory({ accountingType: 'tax_refund' })

    expect(result.category).toBe('tax_refund')
  })

  it('Rule 5: accounting_type=internal_transfer → internal_transfer_in', async () => {
    const result = await resolveIncomeEconomicCategory({
      accountingType: 'internal_transfer'
    })

    expect(result.category).toBe('internal_transfer_in')
  })

  it('Rule 6: accounting_type=invoice (default) → service_revenue high confidence', async () => {
    const result = await resolveIncomeEconomicCategory({ accountingType: 'invoice' })

    expect(result.category).toBe('service_revenue')
    expect(result.confidence).toBe('high')
    expect(result.matchedRule).toBe('SOURCE_KIND_SERVICE_DEFAULT')
  })

  it('Rule 6: sin accounting_type → service_revenue medium confidence', async () => {
    const result = await resolveIncomeEconomicCategory({})

    expect(result.category).toBe('service_revenue')
    expect(result.confidence).toBe('medium')
  })

  it('Rule 7: accounting_type=unknown_value → other manual_required', async () => {
    const result = await resolveIncomeEconomicCategory({
      accountingType: 'mystery_unsupported_type'
    })

    expect(result.category).toBe('other')
    expect(result.confidence).toBe('manual_required')
  })
})
