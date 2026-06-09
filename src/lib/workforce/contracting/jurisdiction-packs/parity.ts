// TASK-1019 Slice 2 — Bilingual parity validation (pure).
// Structural parity (missing language / sectionCode misalignment) is a hard fail.
// Significant-token divergence (numbers, amounts, dates that must match across
// languages because they are not translatable) is a warning-level heuristic in V0.

import {
  REQUIRED_LANGUAGES,
  type ContractLanguage,
  type WorkforceContractingLanguageParity,
  type WorkforceContractingSection,
  type WorkforceContractingStructuredContent
} from '../types'

const sectionsByCode = (
  sections: WorkforceContractingSection[] | undefined
): Map<string, WorkforceContractingSection> => {
  const map = new Map<string, WorkforceContractingSection>()

  for (const section of sections ?? []) {
    map.set(section.sectionCode, section)
  }

  return map
}

/** Non-translatable significant tokens (digit groups: amounts, dates, ids). */
const significantTokens = (body: string): Set<string> => {
  const matches = body.match(/\d[\d.,/-]*\d|\d/g) ?? []

  return new Set(matches.map(token => token.replace(/[.,]/g, '')))
}

export const validateBilingualParity = (
  content: WorkforceContractingStructuredContent
): WorkforceContractingLanguageParity => {
  const notes: string[] = []

  const presentLanguages = REQUIRED_LANGUAGES.filter(
    lang => (content?.localizedDrafts?.[lang]?.sections?.length ?? 0) > 0
  )

  const missingLanguages = REQUIRED_LANGUAGES.filter(lang => !presentLanguages.includes(lang))

  if (missingLanguages.length > 0) {
    notes.push(`Falta contenido en: ${missingLanguages.join(', ')}.`)

    return { status: 'fail', comparedSectionCodes: [], notes }
  }

  const [primary, secondary] = REQUIRED_LANGUAGES as [ContractLanguage, ContractLanguage]
  const primaryMap = sectionsByCode(content.localizedDrafts[primary].sections)
  const secondaryMap = sectionsByCode(content.localizedDrafts[secondary].sections)

  const primaryCodes = new Set(primaryMap.keys())
  const secondaryCodes = new Set(secondaryMap.keys())

  const onlyInPrimary = [...primaryCodes].filter(code => !secondaryCodes.has(code))
  const onlyInSecondary = [...secondaryCodes].filter(code => !primaryCodes.has(code))

  if (onlyInPrimary.length > 0 || onlyInSecondary.length > 0) {
    if (onlyInPrimary.length > 0) {
      notes.push(`Secciones sólo en ${primary}: ${onlyInPrimary.join(', ')}.`)
    }

    if (onlyInSecondary.length > 0) {
      notes.push(`Secciones sólo en ${secondary}: ${onlyInSecondary.join(', ')}.`)
    }

    return {
      status: 'fail',
      comparedSectionCodes: [...primaryCodes].filter(code => secondaryCodes.has(code)),
      notes
    }
  }

  // Structurally aligned — compare significant tokens per shared section.
  const sharedCodes = [...primaryCodes]
  let tokenDivergence = false

  for (const code of sharedCodes) {
    const primaryTokens = significantTokens(primaryMap.get(code)?.body ?? '')
    const secondaryTokens = significantTokens(secondaryMap.get(code)?.body ?? '')
    const missingInSecondary = [...primaryTokens].filter(token => !secondaryTokens.has(token))
    const missingInPrimary = [...secondaryTokens].filter(token => !primaryTokens.has(token))

    if (missingInSecondary.length > 0 || missingInPrimary.length > 0) {
      tokenDivergence = true
      notes.push(
        `Sección ${code}: montos/fechas/identificadores difieren entre ${primary} y ${secondary} (revisar manualmente).`
      )
    }
  }

  return {
    status: tokenDivergence ? 'warning' : 'pass',
    comparedSectionCodes: sharedCodes,
    notes
  }
}
