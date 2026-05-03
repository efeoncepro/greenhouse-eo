import 'server-only'

import {
  extractRutsFromText,
  lookupKnownPayrollVendor,
  lookupKnownRegulator,
  lookupMemberByDisplayName,
  lookupMemberByEmail,
  lookupMemberByRut,
  lookupSupplierByRut,
  type ResolvedMember
} from './identity-lookup'
import type {
  ExpenseEconomicCategory,
  IncomeEconomicCategory,
  ResolverConfidence
} from './types'

/**
 * TASK-768 — Resolver canónico de economic_category.
 *
 * Single source of truth para el mapping (beneficiary, document context,
 * raw description, accounting hint) → economic_category. Reglas
 * declarativas, first-match wins, evidencia auditable.
 *
 * El resolver NO escribe a DB — solo retorna la decisión + evidencia.
 * Los canonical writers (Slice 5) llaman a este resolver al INSERT-time
 * y persisten el resultado en `economic_category` + `economic_category_resolution_log`.
 */

export interface ResolveExpenseInput {
  beneficiaryName?: string | null
  beneficiaryRut?: string | null
  beneficiaryMemberId?: string | null
  beneficiaryIdentityProfileId?: string | null
  beneficiarySupplierId?: string | null
  documentType?: string | null
  sourceKind?: string | null
  rawDescription?: string | null
  accountingType?: string | null
  costCategory?: string | null
  amount?: number | null
  currency?: string | null
}

export interface ResolveIncomeInput {
  payerName?: string | null
  payerRut?: string | null
  payerClientProfileId?: string | null
  payerSupplierId?: string | null
  documentType?: string | null
  sourceKind?: string | null
  rawDescription?: string | null
  accountingType?: string | null
  amount?: number | null
  currency?: string | null
}

export interface ResolveExpenseResult {
  category: ExpenseEconomicCategory
  confidence: ResolverConfidence
  matchedRule: string
  evidence: Record<string, unknown>
}

export interface ResolveIncomeResult {
  category: IncomeEconomicCategory
  confidence: ResolverConfidence
  matchedRule: string
  evidence: Record<string, unknown>
}

/**
 * Mapping employment_type → economic_category cuando hay member match.
 */
const memberToExpenseCategory = (
  member: ResolvedMember
): { category: ExpenseEconomicCategory; reason: string } => {
  const employmentType = (member.employmentType ?? '').toLowerCase()

  if (member.payrollVia === 'deel' || member.deelContractId) {
    return { category: 'labor_cost_external', reason: 'member_via_deel' }
  }

  if (
    employmentType === 'contractor' ||
    employmentType === 'international' ||
    employmentType === 'deel_managed'
  ) {
    return { category: 'labor_cost_external', reason: `member_employment=${employmentType}` }
  }

  return { category: 'labor_cost_internal', reason: `member_employment=${employmentType || 'internal'}` }
}

const accountingTypeTransparentMap: Record<string, ExpenseEconomicCategory> = {
  tax: 'tax',
  social_security: 'regulatory_payment',
  financial_cost: 'financial_cost'
}

const accountingTypeAmbiguousFallback = (
  accountingType: string | null | undefined
): ExpenseEconomicCategory | null => {
  if (!accountingType) return null

  if (accountingType === 'supplier' || accountingType === 'miscellaneous') {
    return 'vendor_cost_saas'
  }

  if (accountingType === 'bank_fee') return 'bank_fee_real'

  return null
}

/**
 * Resolve economic_category for an expense.
 *
 * Reglas (first-match wins):
 *   1. IDENTITY_MATCH_BY_MEMBER_ID         — beneficiary ya viene resuelto a member_id
 *   2. IDENTITY_MATCH_BY_RUT               — extracted RUT → member lookup
 *   3. IDENTITY_MATCH_BY_EMAIL             — beneficiary email → member lookup
 *   4. IDENTITY_MATCH_BY_NAME              — beneficiary name → member lookup (single-match)
 *   5. KNOWN_PAYROLL_VENDOR_REGEX          — beneficiary or rawDescription → vendor lookup
 *   6. KNOWN_REGULATOR_REGEX               — beneficiary or rawDescription → regulator lookup
 *   7. SUPPLIER_LOOKUP_PARTNER             — supplier resolved + is_partner=TRUE
 *   8. ACCOUNTING_TYPE_TRANSPARENT_MAP     — accounting_type ∈ {tax, social_security, financial_cost}
 *   9. ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK  — accounting_type ∈ {supplier, bank_fee, miscellaneous}
 *  10. MANUAL_REQUIRED_FALLBACK            — emit other + enqueue manual queue
 */
export const resolveExpenseEconomicCategory = async (
  input: ResolveExpenseInput
): Promise<ResolveExpenseResult> => {
  const evidence: Record<string, unknown> = {}

  // Rule 1 — beneficiary ya viene como member_id explícito
  if (input.beneficiaryMemberId) {
    evidence.input_member_id = input.beneficiaryMemberId
    const rows = await query_member_by_id(input.beneficiaryMemberId)

    if (rows) {
      const { category, reason } = memberToExpenseCategory(rows)

      return {
        category,
        confidence: 'high',
        matchedRule: 'IDENTITY_MATCH_BY_MEMBER_ID',
        evidence: { ...evidence, reason, member_id: rows.memberId }
      }
    }
  }

  // Rule 2 — RUT explícito o extraído de description
  const explicitRut = (input.beneficiaryRut ?? '').trim().toUpperCase()
  const extractedRuts = extractRutsFromText(input.rawDescription)
  const candidateRut = explicitRut || extractedRuts[0] || null

  if (candidateRut) {
    evidence.candidate_rut = candidateRut
    const member = await lookupMemberByRut(candidateRut)

    if (member) {
      const { category, reason } = memberToExpenseCategory(member)

      return {
        category,
        confidence: 'high',
        matchedRule: 'IDENTITY_MATCH_BY_RUT',
        evidence: { ...evidence, reason, member_id: member.memberId }
      }
    }

    const supplier = await lookupSupplierByRut(candidateRut)

    if (supplier) {
      evidence.supplier_id = supplier.supplierId

      // Partner suppliers (factoring counterparties) → financial_settlement
      if (supplier.isPartner) {
        return {
          category: 'financial_settlement',
          confidence: 'high',
          matchedRule: 'SUPPLIER_LOOKUP_PARTNER',
          evidence
        }
      }
    }
  }

  // Rule 3 — email match
  const beneficiaryName = input.beneficiaryName?.trim() ?? ''
  const emailFromName = beneficiaryName.includes('@') ? beneficiaryName : null

  if (emailFromName) {
    const member = await lookupMemberByEmail(emailFromName)

    if (member) {
      const { category, reason } = memberToExpenseCategory(member)

      return {
        category,
        confidence: 'high',
        matchedRule: 'IDENTITY_MATCH_BY_EMAIL',
        evidence: { ...evidence, reason, member_id: member.memberId, email: emailFromName }
      }
    }
  }

  // Rule 5 — known payroll vendor (Deel, Remote, Velocity Global, Oyster, ...)
  const textForRegex = `${beneficiaryName} ${input.rawDescription ?? ''}`.trim()

  if (textForRegex) {
    const vendor = await lookupKnownPayrollVendor(textForRegex)

    if (vendor) {
      return {
        category: 'labor_cost_external',
        confidence: 'high',
        matchedRule: 'KNOWN_PAYROLL_VENDOR_REGEX',
        evidence: { ...evidence, vendor_id: vendor.vendorId, vendor_name: vendor.displayName }
      }
    }

    // Rule 6 — known regulator (Previred, AFP, Mutual, SII, FONASA, Isapre)
    const regulator = await lookupKnownRegulator(textForRegex)

    if (regulator) {
      return {
        category: 'regulatory_payment',
        confidence: 'high',
        matchedRule: 'KNOWN_REGULATOR_REGEX',
        evidence: {
          ...evidence,
          regulator_id: regulator.regulatorId,
          regulator_name: regulator.displayName
        }
      }
    }
  }

  // Rule 4 — name match (fallback identity, single-match)
  if (beneficiaryName && !emailFromName && beneficiaryName.length >= 3) {
    const member = await lookupMemberByDisplayName(beneficiaryName)

    if (member) {
      const { category, reason } = memberToExpenseCategory(member)

      return {
        category,
        confidence: 'medium',
        matchedRule: 'IDENTITY_MATCH_BY_NAME',
        evidence: { ...evidence, reason, member_id: member.memberId, matched_name: member.displayName }
      }
    }
  }

  // Rule 8 — accounting_type transparent map (tax, social_security, financial_cost)
  const transparent = input.accountingType
    ? accountingTypeTransparentMap[input.accountingType]
    : undefined

  if (transparent) {
    return {
      category: transparent,
      confidence: 'high',
      matchedRule: 'ACCOUNTING_TYPE_TRANSPARENT_MAP',
      evidence: { ...evidence, accounting_type: input.accountingType }
    }
  }

  // Rule 9 — accounting_type ambiguous fallback (supplier, bank_fee, miscellaneous)
  const ambiguous = accountingTypeAmbiguousFallback(input.accountingType)

  if (ambiguous) {
    return {
      category: ambiguous,
      confidence: 'low',
      matchedRule: 'ACCOUNTING_TYPE_AMBIGUOUS_FALLBACK',
      evidence: { ...evidence, accounting_type: input.accountingType, enqueue_manual: true }
    }
  }

  // Rule 10 — last resort
  return {
    category: 'other',
    confidence: 'manual_required',
    matchedRule: 'MANUAL_REQUIRED_FALLBACK',
    evidence: { ...evidence, enqueue_manual: true }
  }
}

/**
 * Resolve economic_category for income.
 *
 * Reglas (first-match wins):
 *   1. ACCOUNTING_TYPE_FACTORING       — accounting_type='factoring' or sourceKind contiene 'factoring'
 *   2. ACCOUNTING_TYPE_REIMBURSEMENT   — accounting_type='client_reimbursement'
 *   3. SOURCE_KIND_NUBOX_SERVICE       — sourceKind='nubox' + accountingType='service' (default)
 *   4. PARTNER_OFFSET                  — payer es supplier marked as partner
 *   5. ACCOUNTING_TYPE_TRANSPARENT_MAP — accounting_type ∈ {tax_refund, financial_income, internal_transfer}
 *   6. SOURCE_KIND_SERVICE_DEFAULT     — service_revenue como default razonable
 *   7. MANUAL_REQUIRED_FALLBACK        — emit other + enqueue manual queue
 */
export const resolveIncomeEconomicCategory = async (
  input: ResolveIncomeInput
): Promise<ResolveIncomeResult> => {
  const evidence: Record<string, unknown> = {}
  const accountingType = (input.accountingType ?? '').toLowerCase()
  const sourceKind = (input.sourceKind ?? '').toLowerCase()

  if (accountingType === 'factoring' || sourceKind.includes('factoring')) {
    return {
      category: 'factoring_proceeds',
      confidence: 'high',
      matchedRule: 'ACCOUNTING_TYPE_FACTORING',
      evidence: { ...evidence, accounting_type: accountingType, source_kind: sourceKind }
    }
  }

  if (accountingType === 'client_reimbursement' || accountingType === 'reimbursement') {
    return {
      category: 'client_reimbursement',
      confidence: 'high',
      matchedRule: 'ACCOUNTING_TYPE_REIMBURSEMENT',
      evidence: { ...evidence, accounting_type: accountingType }
    }
  }

  if (accountingType === 'tax_refund' || accountingType === 'iva_refund') {
    return {
      category: 'tax_refund',
      confidence: 'high',
      matchedRule: 'ACCOUNTING_TYPE_TRANSPARENT_MAP',
      evidence: { ...evidence, accounting_type: accountingType }
    }
  }

  if (accountingType === 'financial_income' || accountingType === 'interest') {
    return {
      category: 'financial_income',
      confidence: 'high',
      matchedRule: 'ACCOUNTING_TYPE_TRANSPARENT_MAP',
      evidence: { ...evidence, accounting_type: accountingType }
    }
  }

  if (accountingType === 'internal_transfer' || sourceKind === 'internal_transfer') {
    return {
      category: 'internal_transfer_in',
      confidence: 'high',
      matchedRule: 'ACCOUNTING_TYPE_TRANSPARENT_MAP',
      evidence: { ...evidence, accounting_type: accountingType }
    }
  }

  // Partner offset detection — payer mapped to a partner supplier
  if (input.payerSupplierId) {
    evidence.payer_supplier_id = input.payerSupplierId
  }

  // Default razonable: service_revenue (mayoría de income es service-revenue por contrato)
  if (
    accountingType === 'invoice' ||
    accountingType === 'service' ||
    accountingType === 'service_fee' ||
    accountingType === 'quote' ||
    !accountingType
  ) {
    return {
      category: 'service_revenue',
      confidence: accountingType ? 'high' : 'medium',
      matchedRule: 'SOURCE_KIND_SERVICE_DEFAULT',
      evidence: { ...evidence, accounting_type: accountingType || 'unspecified' }
    }
  }

  return {
    category: 'other',
    confidence: 'manual_required',
    matchedRule: 'MANUAL_REQUIRED_FALLBACK',
    evidence: { ...evidence, accounting_type: accountingType, enqueue_manual: true }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Internal — member lookup by id (read-only adapter)
// ────────────────────────────────────────────────────────────────────────────

interface MemberByIdRow {
  member_id: string
  identity_profile_id: string
  display_name: string
  employment_type: string | null
  primary_email: string | null
  active: boolean
  payroll_via: string | null
  deel_contract_id: string | null
  [key: string]: unknown
}

const query_member_by_id = async (memberId: string): Promise<ResolvedMember | null> => {
  const { query } = await import('@/lib/db')

  const rows = await query<MemberByIdRow>(
    `SELECT m.member_id, m.identity_profile_id, m.display_name, m.employment_type,
            m.primary_email, m.active, m.payroll_via, m.deel_contract_id
       FROM greenhouse_core.members m
      WHERE m.member_id = $1
        AND m.active = TRUE
      LIMIT 1`,
    [memberId]
  )

  if (!rows[0]) return null

  return {
    memberId: rows[0].member_id,
    identityProfileId: rows[0].identity_profile_id,
    displayName: rows[0].display_name,
    employmentType: rows[0].employment_type,
    primaryEmail: rows[0].primary_email,
    active: rows[0].active,
    payrollVia: rows[0].payroll_via,
    deelContractId: rows[0].deel_contract_id
  }
}
