// TASK-1019 Slice 3 — AI drafting eval baseline (golden fixtures per jurisdiction pack).
// Pure. Used as a regression baseline (parse + parity must pass) AND as the canned
// `generate` output in adapter tests, so no real provider call is ever made.

import type { ContractLanguage } from '../types'
import type { WorkforceContractingAiDraft } from './schema'

const bilingual = (
  sections: Array<{ code: string; es: string; en: string }>
): WorkforceContractingAiDraft['localizedDrafts'] => {
  const mk = (lang: ContractLanguage) => ({
    title: lang === 'es-CL' ? 'Contrato de Trabajo' : 'Employment Contract',
    sections: sections.map(s => ({
      sectionCode: s.code,
      heading: s.code,
      body: lang === 'es-CL' ? s.es : s.en,
      sourceFactRefs: [s.code],
      clauseRisk: 'none' as const
    }))
  })

  return { 'es-CL': mk('es-CL'), 'en-US': mk('en-US') }
}

export const GOLDEN_CL_DEPENDENT_DRAFT: WorkforceContractingAiDraft = {
  contractVersion: 'workforce_contracting_ai_draft.v1',
  documentKind: 'employment_contract',
  jurisdictionPack: 'CL_CHILE_DEPENDENT_V1',
  requiredLanguages: ['es-CL', 'en-US'],
  authoritativeLanguage: 'es-CL',
  localizedDrafts: bilingual([
    { code: 'place_and_date', es: 'Santiago, 2 de junio de 2026.', en: 'Santiago, June 2, 2026.' },
    { code: 'parties_identification', es: 'Entre Efeonce Group SpA y la trabajadora.', en: 'Between Efeonce Group SpA and the employee.' },
    { code: 'services_nature_and_location', es: 'Servicios de UX en Santiago.', en: 'UX services in Santiago.' },
    { code: 'remuneration', es: 'Remuneración bruta de 1950000 CLP mensuales.', en: 'Gross monthly salary of 1950000 CLP.' },
    { code: 'working_hours', es: 'Jornada de 44 horas semanales.', en: '44 hours per week.' },
    { code: 'contract_term', es: 'Contrato indefinido.', en: 'Indefinite-term contract.' },
    { code: 'additional_pacts_and_benefits', es: 'Sin pactos adicionales.', en: 'No additional pacts.' }
  ]),
  languageParity: { status: 'pass', notes: [] },
  missingFacts: [],
  assumptions: ['Lugar principal: Santiago.'],
  reviewerNotes: ['Confirmar lugar principal antes del PDF.'],
  prohibitedContentDetected: false
}

export const GOLDEN_INTERNATIONAL_INTERNAL_DRAFT: WorkforceContractingAiDraft = {
  contractVersion: 'workforce_contracting_ai_draft.v1',
  documentKind: 'employment_contract',
  jurisdictionPack: 'INTERNATIONAL_INTERNAL_REMOTE_V1',
  requiredLanguages: ['es-CL', 'en-US'],
  authoritativeLanguage: 'es-CL',
  localizedDrafts: bilingual([
    { code: 'parties_identification', es: 'Entre Efeonce Group SpA y la persona.', en: 'Between Efeonce Group SpA and the individual.' },
    { code: 'services_nature_and_location', es: 'Servicios remotos desde Alemania.', en: 'Remote services from Germany.' },
    { code: 'remuneration', es: 'Honorario bruto de 6700 EUR mensuales.', en: 'Gross monthly fee of 6700 EUR.' },
    { code: 'contract_term', es: 'Plazo indefinido.', en: 'Indefinite term.' },
    { code: 'remote_work_setup', es: 'Trabajo 100% remoto.', en: '100% remote work.' },
    { code: 'governing_law_and_jurisdiction', es: 'Ley chilena.', en: 'Chilean law.' }
  ]),
  languageParity: { status: 'pass', notes: [] },
  missingFacts: [],
  assumptions: [],
  reviewerNotes: ['Requiere legalReviewReference vigente.'],
  prohibitedContentDetected: false
}

export const GOLDEN_DRAFTS_BY_PACK: Record<string, WorkforceContractingAiDraft> = {
  CL_CHILE_DEPENDENT_V1: GOLDEN_CL_DEPENDENT_DRAFT,
  INTERNATIONAL_INTERNAL_REMOTE_V1: GOLDEN_INTERNATIONAL_INTERNAL_DRAFT
}
