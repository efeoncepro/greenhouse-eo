import { describe, expect, it } from 'vitest'

import { validateBilingualParity } from '../jurisdiction-packs/parity'
import { GOLDEN_CL_DEPENDENT_DRAFT, GOLDEN_INTERNATIONAL_INTERNAL_DRAFT } from './eval-fixtures'
import { aiDraftToStructuredContent, parseWorkforceContractingAiDraft } from './schema'

describe('parseWorkforceContractingAiDraft', () => {
  it('accepts the golden drafts (eval baseline)', () => {
    for (const golden of [GOLDEN_CL_DEPENDENT_DRAFT, GOLDEN_INTERNATIONAL_INTERNAL_DRAFT]) {
      const result = parseWorkforceContractingAiDraft(golden)

      expect(result.ok).toBe(true)
      expect(result.errors).toHaveLength(0)
    }
  })

  it('rejects a non-object', () => {
    expect(parseWorkforceContractingAiDraft('nope').ok).toBe(false)
    expect(parseWorkforceContractingAiDraft(null).ok).toBe(false)
  })

  it('rejects a wrong contractVersion', () => {
    const bad = { ...GOLDEN_CL_DEPENDENT_DRAFT, contractVersion: 'v2' }
    const result = parseWorkforceContractingAiDraft(bad)

    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('contractVersion'))).toBe(true)
  })

  it('rejects when a language is missing or empty', () => {
    const missingEn = {
      ...GOLDEN_CL_DEPENDENT_DRAFT,
      localizedDrafts: { 'es-CL': GOLDEN_CL_DEPENDENT_DRAFT.localizedDrafts['es-CL'], 'en-US': { title: 'x', sections: [] } }
    }

    const result = parseWorkforceContractingAiDraft(missingEn)

    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('en-US'))).toBe(true)
  })

  it('rejects malformed sections', () => {
    const badSection = {
      ...GOLDEN_CL_DEPENDENT_DRAFT,
      localizedDrafts: {
        'es-CL': { title: 't', sections: [{ sectionCode: 'x' }] },
        'en-US': GOLDEN_CL_DEPENDENT_DRAFT.localizedDrafts['en-US']
      }
    }

    expect(parseWorkforceContractingAiDraft(badSection).ok).toBe(false)
  })
})

describe('aiDraftToStructuredContent', () => {
  it('produces bilingual structured content that passes parity', () => {
    const content = aiDraftToStructuredContent(GOLDEN_CL_DEPENDENT_DRAFT)

    expect(content.contractVersion).toBe('workforce_contracting_structured_content.v1')
    expect(content.localizedDrafts['es-CL'].sections.length).toBeGreaterThan(0)
    expect(content.localizedDrafts['en-US'].sections.length).toBeGreaterThan(0)
    expect(validateBilingualParity(content).status).toBe('pass')
  })
})
