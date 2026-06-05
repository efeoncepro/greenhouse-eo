// TASK-1019 Slice 2 — Deterministic jurisdiction-pack validator (pure, fail-closed).
// Returns structured blockers/warnings + bilingual parity. NEVER throws on validation
// outcomes; throwing is reserved for programmer errors.

import { normalizeLegalReviewReference } from '@/types/hr-contracts'

import {
  REQUIRED_LANGUAGES,
  type ContractLanguage,
  type WorkforceContractingSection,
  type WorkforceContractingStructuredContent,
  type WorkforceContractingValidationBlocker,
  type WorkforceContractingValidationResult,
  type WorkforceContractingValidationWarning
} from '../types'
import { validateBilingualParity } from './parity'
import { getJurisdictionPack } from './registry'
import type { ContractTuple, JurisdictionPack, ValidateContractingInput } from './types'

const PACK_SOURCE = 'GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1#4'

const tupleEquals = (a: ContractTuple, b: ContractTuple) =>
  a.contractType === b.contractType && a.payRegime === b.payRegime && a.payrollVia === b.payrollVia

const sectionCodesFor = (
  content: WorkforceContractingStructuredContent,
  lang: ContractLanguage
): Set<string> =>
  new Set((content?.localizedDrafts?.[lang]?.sections ?? []).map((s: WorkforceContractingSection) => s.sectionCode))

const failClosedResult = (
  packCode: string,
  blockers: WorkforceContractingValidationBlocker[]
): WorkforceContractingValidationResult => ({
  jurisdictionPackCode: packCode,
  requiredLanguages: [...REQUIRED_LANGUAGES],
  authoritativeLanguage: 'es-CL',
  readyForReview: false,
  readyForPdf: false,
  languageParity: { status: 'fail', comparedSectionCodes: [], notes: ['Validación incompleta.'] },
  blockers,
  warnings: []
})

export const validateContractingReadiness = (
  input: ValidateContractingInput
): WorkforceContractingValidationResult => {
  const pack: JurisdictionPack | undefined = getJurisdictionPack(input.jurisdictionPackCode)

  if (!pack) {
    return failClosedResult(input.jurisdictionPackCode, [
      {
        code: 'unsupported_jurisdiction_pack',
        severity: 'blocking',
        message: `Jurisdiction pack desconocido: ${input.jurisdictionPackCode}.`,
        sourceRef: PACK_SOURCE
      }
    ])
  }

  const blockers: WorkforceContractingValidationBlocker[] = []
  const warnings: WorkforceContractingValidationWarning[] = []

  // 1. Document kind supported.
  if (!pack.documentKinds.includes(input.documentKind)) {
    blockers.push({
      code: 'unsupported_document_kind',
      severity: 'blocking',
      message: `El pack ${pack.code} no soporta ${input.documentKind}.`,
      sourceRef: PACK_SOURCE
    })
  }

  // 2. Contract tuple supported.
  if (!pack.supportedTuples.some(tuple => tupleEquals(tuple, input.contractTuple))) {
    blockers.push({
      code: 'unsupported_tuple',
      severity: 'blocking',
      message: `Tupla (${input.contractTuple.contractType}, ${input.contractTuple.payRegime}, ${input.contractTuple.payrollVia}) no soportada por ${pack.code}.`,
      sourceRef: PACK_SOURCE
    })
  }

  // 3. Required facts present.
  const provided = new Set(input.providedFactCodes)

  for (const fact of [...pack.requiredPersonFacts, ...pack.requiredCompensationFacts]) {
    if (!provided.has(fact)) {
      blockers.push({
        code: `missing_fact:${fact}`,
        severity: 'blocking',
        message: `Falta el dato requerido: ${fact}.`,
        sourceRef: PACK_SOURCE
      })
    }
  }

  // 4. legalReviewReference (TASK-894 invariant, fail-closed).
  if (pack.requiresLegalReviewReference) {
    const normalized = normalizeLegalReviewReference(input.legalReviewReference)

    if (!normalized || normalized.length < 10) {
      blockers.push({
        code: 'legal_review_reference_required',
        severity: 'blocking',
        message: 'Este pack requiere legalReviewReference (>= 10 caracteres) antes de aprobar.',
        sourceRef: 'TASK-894'
      })
    }
  }

  // 5. Required clauses present in BOTH languages.
  const esCodes = sectionCodesFor(input.structuredContent, 'es-CL')
  const enCodes = sectionCodesFor(input.structuredContent, 'en-US')

  for (const clause of pack.requiredClauses) {
    const inEs = esCodes.has(clause)
    const inEn = enCodes.has(clause)

    if (!inEs || !inEn) {
      const missingLangs = [!inEs ? 'es-CL' : null, !inEn ? 'en-US' : null].filter(Boolean)

      blockers.push({
        code: `missing_clause:${clause}`,
        severity: 'blocking',
        message: `Falta la cláusula obligatoria '${clause}' en: ${missingLangs.join(', ')}.`,
        sourceRef: PACK_SOURCE
      })
    }
  }

  // 6. Prohibited clauses absent.
  for (const clause of pack.prohibitedClauses) {
    if (esCodes.has(clause) || enCodes.has(clause)) {
      blockers.push({
        code: `prohibited_clause:${clause}`,
        severity: 'blocking',
        message: `La cláusula '${clause}' está prohibida por ${pack.code}.`,
        sourceRef: PACK_SOURCE
      })
    }
  }

  // 7. Authoritative language matches the pack.
  if (input.structuredContent.authoritativeLanguage !== pack.authoritativeLanguage) {
    blockers.push({
      code: 'authoritative_language_mismatch',
      severity: 'blocking',
      message: `El idioma autoritativo debe ser ${pack.authoritativeLanguage} para ${pack.code}.`,
      sourceRef: PACK_SOURCE
    })
  }

  // 8. Bilingual parity.
  const languageParity = validateBilingualParity(input.structuredContent)

  if (languageParity.status === 'fail') {
    blockers.push({
      code: 'bilingual_parity_failed',
      severity: 'blocking',
      message: 'Divergencia estructural material entre español e inglés.',
      sourceRef: PACK_SOURCE
    })
  } else if (languageParity.status === 'warning') {
    warnings.push({
      code: 'bilingual_parity_warning',
      severity: 'warning',
      message: 'Posible divergencia de montos/fechas entre idiomas; revisar antes del PDF.',
      sourceRef: PACK_SOURCE
    })
  }

  const readyForReview = blockers.length === 0
  const readyForPdf = readyForReview && languageParity.status !== 'fail'

  return {
    jurisdictionPackCode: pack.code,
    requiredLanguages: [...pack.requiredLanguages],
    authoritativeLanguage: pack.authoritativeLanguage,
    readyForReview,
    readyForPdf,
    languageParity,
    blockers,
    warnings
  }
}
