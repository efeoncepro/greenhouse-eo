import { describe, expect, it } from 'vitest'

import type {
  ContractLanguage,
  WorkforceContractingSection,
  WorkforceContractingStructuredContent
} from '../types'
import { validateBilingualParity } from './parity'
import type { ContractTuple } from './types'
import { validateContractingReadiness } from './validate'

const CL_CLAUSES = [
  'place_and_date',
  'parties_identification',
  'services_nature_and_location',
  'remuneration',
  'working_hours',
  'contract_term',
  'additional_pacts_and_benefits'
]

const CL_FACTS = [
  'full_name',
  'national_id',
  'nationality',
  'birth_date',
  'hire_date',
  'address',
  'gross_amount',
  'currency',
  'pay_period',
  'pay_method'
]

const section = (code: string, body: string): WorkforceContractingSection => ({
  sectionCode: code,
  heading: code,
  body,
  sourceFactRefs: [],
  clauseRisk: 'none'
})

const buildContent = (
  clauses: string[],
  overrides: Partial<Record<ContractLanguage, string[]>> = {},
  bodies: Partial<Record<string, { es: string; en: string }>> = {}
): WorkforceContractingStructuredContent => {
  const mk = (lang: ContractLanguage, codes: string[]) => ({
    title: `Contrato (${lang})`,
    sections: codes.map(code =>
      section(code, lang === 'es-CL' ? bodies[code]?.es ?? `cuerpo ${code}` : bodies[code]?.en ?? `body ${code}`)
    )
  })

  return {
    contractVersion: 'workforce_contracting_structured_content.v1',
    documentKind: 'employment_contract',
    jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
    authoritativeLanguage: 'es-CL',
    localizedDrafts: {
      'es-CL': mk('es-CL', overrides['es-CL'] ?? clauses),
      'en-US': mk('en-US', overrides['en-US'] ?? clauses)
    }
  }
}

const CL_TUPLE: ContractTuple = { contractType: 'indefinido', payRegime: 'chile', payrollVia: 'internal' }

describe('validateContractingReadiness', () => {
  it('passes the happy path (Chile dependent, all facts + clauses + parity)', () => {
    const result = validateContractingReadiness({
      jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
      documentKind: 'employment_contract',
      contractTuple: CL_TUPLE,
      structuredContent: buildContent(CL_CLAUSES),
      providedFactCodes: CL_FACTS
    })

    expect(result.blockers).toHaveLength(0)
    expect(result.readyForReview).toBe(true)
    expect(result.readyForPdf).toBe(true)
    expect(result.languageParity.status).toBe('pass')
  })

  it('blocks on missing required facts', () => {
    const result = validateContractingReadiness({
      jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
      documentKind: 'employment_contract',
      contractTuple: CL_TUPLE,
      structuredContent: buildContent(CL_CLAUSES),
      providedFactCodes: ['full_name'] // missing the rest
    })

    expect(result.readyForReview).toBe(false)
    expect(result.blockers.some(b => b.code === 'missing_fact:national_id')).toBe(true)
    expect(result.blockers.some(b => b.code === 'missing_fact:gross_amount')).toBe(true)
  })

  it('blocks on unsupported tuple', () => {
    const result = validateContractingReadiness({
      jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
      documentKind: 'employment_contract',
      contractTuple: { contractType: 'contractor', payRegime: 'international', payrollVia: 'deel' },
      structuredContent: buildContent(CL_CLAUSES),
      providedFactCodes: CL_FACTS
    })

    expect(result.blockers.some(b => b.code === 'unsupported_tuple')).toBe(true)
  })

  it('blocks when a required clause is missing in one language', () => {
    const result = validateContractingReadiness({
      jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
      documentKind: 'employment_contract',
      contractTuple: CL_TUPLE,
      structuredContent: buildContent(CL_CLAUSES, { 'en-US': CL_CLAUSES.filter(c => c !== 'remuneration') }),
      providedFactCodes: CL_FACTS
    })

    expect(result.blockers.some(b => b.code === 'missing_clause:remuneration')).toBe(true)
    expect(result.languageParity.status).toBe('fail')
  })

  it('blocks international_internal without legalReviewReference (TASK-894)', () => {
    const content = buildContent([
      'parties_identification',
      'services_nature_and_location',
      'remuneration',
      'contract_term',
      'remote_work_setup',
      'governing_law_and_jurisdiction'
    ])

    content.jurisdictionPackCode = 'INTERNATIONAL_INTERNAL_REMOTE_V1'

    const result = validateContractingReadiness({
      jurisdictionPackCode: 'INTERNATIONAL_INTERNAL_REMOTE_V1',
      documentKind: 'employment_contract',
      contractTuple: { contractType: 'international_internal', payRegime: 'international', payrollVia: 'internal' },
      structuredContent: content,
      providedFactCodes: ['full_name', 'national_id', 'nationality', 'country_of_residence', 'address', 'gross_amount', 'currency', 'pay_period', 'pay_method'],
      legalReviewReference: 'short' // < 10 chars
    })

    expect(result.blockers.some(b => b.code === 'legal_review_reference_required')).toBe(true)

    const ok = validateContractingReadiness({
      jurisdictionPackCode: 'INTERNATIONAL_INTERNAL_REMOTE_V1',
      documentKind: 'employment_contract',
      contractTuple: { contractType: 'international_internal', payRegime: 'international', payrollVia: 'internal' },
      structuredContent: content,
      providedFactCodes: ['full_name', 'national_id', 'nationality', 'country_of_residence', 'address', 'gross_amount', 'currency', 'pay_period', 'pay_method'],
      legalReviewReference: 'LEGAL-REVIEW-2026-0042'
    })

    expect(ok.blockers.some(b => b.code === 'legal_review_reference_required')).toBe(false)
  })

  it('fail-closes on unknown jurisdiction pack', () => {
    const result = validateContractingReadiness({
      jurisdictionPackCode: 'NOPE_V9',
      documentKind: 'offer_letter',
      contractTuple: CL_TUPLE,
      structuredContent: buildContent(CL_CLAUSES),
      providedFactCodes: CL_FACTS
    })

    expect(result.readyForReview).toBe(false)
    expect(result.blockers[0]?.code).toBe('unsupported_jurisdiction_pack')
  })

  it('warns on amount/date token divergence across languages', () => {
    const content = buildContent(CL_CLAUSES, {}, {
      remuneration: { es: 'Remuneración bruta de 2.850.000 CLP mensuales.', en: 'Gross monthly salary of 2,950,000 CLP.' }
    })

    const result = validateContractingReadiness({
      jurisdictionPackCode: 'CL_CHILE_DEPENDENT_V1',
      documentKind: 'employment_contract',
      contractTuple: CL_TUPLE,
      structuredContent: content,
      providedFactCodes: CL_FACTS
    })

    expect(result.languageParity.status).toBe('warning')
    expect(result.warnings.some(w => w.code === 'bilingual_parity_warning')).toBe(true)
    // Warning does not block review.
    expect(result.readyForReview).toBe(true)
  })
})

describe('validateBilingualParity', () => {
  it('fails when a language is missing', () => {
    const content = buildContent(CL_CLAUSES, { 'en-US': [] })

    expect(validateBilingualParity(content).status).toBe('fail')
  })

  it('passes when aligned with matching tokens', () => {
    const content = buildContent(['remuneration'], {}, {
      remuneration: { es: '2.850.000 CLP', en: '2,850,000 CLP' }
    })

    expect(validateBilingualParity(content).status).toBe('pass')
  })
})
