// TASK-1019 Slice 3 — Claude structured output contract `workforce_contracting_ai_draft.v1`
// (GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1 §5.2). Pure: the JSON schema for the
// forced tool call + the TS type + a deterministic parser + a converter to the
// canonical structured content. NOT server-only.

import {
  REQUIRED_LANGUAGES,
  type ClauseRisk,
  type ContractLanguage,
  type LanguageParityStatus,
  type WorkforceContractingCaseKind,
  type WorkforceContractingSection,
  type WorkforceContractingStructuredContent
} from '../types'

export interface WorkforceContractingAiSection {
  sectionCode: string
  heading: string
  body: string
  sourceFactRefs: string[]
  clauseRisk: ClauseRisk
}

export interface WorkforceContractingAiLocalizedDraft {
  title: string
  sections: WorkforceContractingAiSection[]
}

export interface WorkforceContractingAiDraft {
  contractVersion: 'workforce_contracting_ai_draft.v1'
  documentKind: WorkforceContractingCaseKind
  jurisdictionPack: string
  requiredLanguages: ContractLanguage[]
  authoritativeLanguage: ContractLanguage
  localizedDrafts: Record<ContractLanguage, WorkforceContractingAiLocalizedDraft>
  languageParity: { status: LanguageParityStatus; notes: string[] }
  missingFacts: Array<{ factCode: string; severity: 'blocking' | 'warning'; reason: string }>
  assumptions: string[]
  reviewerNotes: string[]
  prohibitedContentDetected: boolean
}

const CLAUSE_RISK_VALUES: ClauseRisk[] = ['none', 'low', 'medium', 'high']

// JSON Schema for the forced tool call (Anthropic constrained structured output).
export const WORKFORCE_CONTRACTING_AI_DRAFT_TOOL = {
  name: 'emit_workforce_contracting_draft',
  description:
    'Emite el borrador bilingüe estructurado (es-CL + en-US) del documento de contratación, con secciones alineadas por sectionCode, paridad, supuestos y hechos faltantes. NO aprueba, NO firma, NO inventa montos/fechas/identidades.',
  inputSchema: {
    type: 'object' as const,
    required: [
      'contractVersion',
      'documentKind',
      'jurisdictionPack',
      'requiredLanguages',
      'authoritativeLanguage',
      'localizedDrafts',
      'languageParity',
      'missingFacts',
      'assumptions',
      'reviewerNotes',
      'prohibitedContentDetected'
    ],
    properties: {
      contractVersion: { type: 'string', enum: ['workforce_contracting_ai_draft.v1'] },
      documentKind: { type: 'string', enum: ['offer_letter', 'employment_contract'] },
      jurisdictionPack: { type: 'string' },
      requiredLanguages: { type: 'array', items: { type: 'string', enum: ['es-CL', 'en-US'] } },
      authoritativeLanguage: { type: 'string', enum: ['es-CL', 'en-US'] },
      localizedDrafts: {
        type: 'object',
        required: ['es-CL', 'en-US'],
        properties: {
          'es-CL': { $ref: '#/$defs/localizedDraft' },
          'en-US': { $ref: '#/$defs/localizedDraft' }
        }
      },
      languageParity: {
        type: 'object',
        required: ['status', 'notes'],
        properties: {
          status: { type: 'string', enum: ['pass', 'warning', 'fail'] },
          notes: { type: 'array', items: { type: 'string' } }
        }
      },
      missingFacts: {
        type: 'array',
        items: {
          type: 'object',
          required: ['factCode', 'severity', 'reason'],
          properties: {
            factCode: { type: 'string' },
            severity: { type: 'string', enum: ['blocking', 'warning'] },
            reason: { type: 'string' }
          }
        }
      },
      assumptions: { type: 'array', items: { type: 'string' } },
      reviewerNotes: { type: 'array', items: { type: 'string' } },
      prohibitedContentDetected: { type: 'boolean' }
    },
    $defs: {
      localizedDraft: {
        type: 'object',
        required: ['title', 'sections'],
        properties: {
          title: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              required: ['sectionCode', 'heading', 'body', 'sourceFactRefs', 'clauseRisk'],
              properties: {
                sectionCode: { type: 'string' },
                heading: { type: 'string' },
                body: { type: 'string' },
                sourceFactRefs: { type: 'array', items: { type: 'string' } },
                clauseRisk: { type: 'string', enum: CLAUSE_RISK_VALUES }
              }
            }
          }
        }
      }
    }
  }
} as const

export interface ParseAiDraftResult {
  ok: boolean
  data?: WorkforceContractingAiDraft
  errors: string[]
}

const isSection = (value: unknown): value is WorkforceContractingAiSection => {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Record<string, unknown>

  return (
    typeof s.sectionCode === 'string' &&
    typeof s.heading === 'string' &&
    typeof s.body === 'string' &&
    Array.isArray(s.sourceFactRefs) &&
    typeof s.clauseRisk === 'string' &&
    CLAUSE_RISK_VALUES.includes(s.clauseRisk as ClauseRisk)
  )
}

const isLocalizedDraft = (value: unknown): value is WorkforceContractingAiLocalizedDraft => {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>

  return typeof d.title === 'string' && Array.isArray(d.sections) && d.sections.every(isSection)
}

/** Deterministic validation of the raw tool output against the v1 contract. */
export const parseWorkforceContractingAiDraft = (raw: unknown): ParseAiDraftResult => {
  const errors: string[] = []

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['Salida no es un objeto.'] }
  }

  const d = raw as Record<string, unknown>

  if (d.contractVersion !== 'workforce_contracting_ai_draft.v1') {
    errors.push('contractVersion inválido.')
  }

  if (d.documentKind !== 'offer_letter' && d.documentKind !== 'employment_contract') {
    errors.push('documentKind inválido.')
  }

  if (typeof d.jurisdictionPack !== 'string' || d.jurisdictionPack.length === 0) {
    errors.push('jurisdictionPack ausente.')
  }

  if (d.authoritativeLanguage !== 'es-CL' && d.authoritativeLanguage !== 'en-US') {
    errors.push('authoritativeLanguage inválido.')
  }

  const localized = d.localizedDrafts as Record<string, unknown> | undefined

  for (const lang of REQUIRED_LANGUAGES) {
    if (!localized || !isLocalizedDraft(localized[lang]) || (localized[lang] as WorkforceContractingAiLocalizedDraft).sections.length === 0) {
      errors.push(`localizedDrafts.${lang} ausente o vacío.`)
    }
  }

  if (typeof d.prohibitedContentDetected !== 'boolean') {
    errors.push('prohibitedContentDetected ausente.')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, data: raw as WorkforceContractingAiDraft, errors: [] }
}

/** Convert a validated AI draft into the canonical structured content shape. */
export const aiDraftToStructuredContent = (
  draft: WorkforceContractingAiDraft
): WorkforceContractingStructuredContent => ({
  contractVersion: 'workforce_contracting_structured_content.v1',
  documentKind: draft.documentKind,
  jurisdictionPackCode: draft.jurisdictionPack,
  authoritativeLanguage: draft.authoritativeLanguage,
  localizedDrafts: {
    'es-CL': mapLocalized(draft.localizedDrafts['es-CL']),
    'en-US': mapLocalized(draft.localizedDrafts['en-US'])
  }
})

const mapLocalized = (
  draft: WorkforceContractingAiLocalizedDraft
): { title: string; sections: WorkforceContractingSection[] } => ({
  title: draft.title,
  sections: draft.sections.map(s => ({
    sectionCode: s.sectionCode,
    heading: s.heading,
    body: s.body,
    sourceFactRefs: s.sourceFactRefs,
    clauseRisk: s.clauseRisk
  }))
})
