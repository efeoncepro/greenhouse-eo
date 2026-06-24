/**
 * TASK-1227 — Growth AI Visibility · Golden eval runner (Slice 5).
 *
 * Corre el normalizer determinista sobre el golden-set curado de TASK-1228 y
 * compara los campos DETERMINISTAS (presencia por dominio, citationDomains) contra
 * el `expectedFinding`. Los campos que dependen de prosa (`ambiguous`, sentiment,
 * drift) se marcan `llm_required` (fuera del alcance determinista) en vez de
 * contar como divergencia. Es la baseline de no-regresión del motor. PURO.
 */

import { type GrowthAiVisibilityProviderObservation } from '../contracts'
import { sha256Hex } from '../observation'
import { normalizeObservation } from '../normalization/normalizer'

export interface GoldenEvalCase {
  id: string
  input: {
    promptId: string
    provider: string
    subjectBrand: string
    subjectDomain?: string
    evidenceExcerpt: string
  }
  expectedFinding: {
    brandMentioned: string
    citationDomains: string[]
    competitorsMentioned?: string[]
  }
}

export interface EvalCaseResult {
  id: string
  status: 'match' | 'mismatch' | 'llm_required'
  brandMentionedExpected: string
  brandMentionedActual: string
  citationDomainsMatch: boolean
}

export interface GoldenEvalReport {
  total: number
  deterministicMatches: number
  deterministicMismatches: number
  llmRequired: number
  results: EvalCaseResult[]
}

const buildObservationFromGolden = (golden: GoldenEvalCase): GrowthAiVisibilityProviderObservation => ({
  observationId: `golden-${golden.id}`,
  runId: 'golden',
  promptId: golden.input.promptId,
  provider: golden.input.provider as GrowthAiVisibilityProviderObservation['provider'],
  model: 'golden',
  status: 'succeeded',
  // El `evidenceExcerpt` del golden es una DESCRIPCIÓN humana (con negaciones como
  // "Efeonce NO aparece") → usarla para name-match daría falsos positivos. El eval
  // determinista se apoya SOLO en la señal estructurada (dominios de citation); la
  // presencia por prosa/ambigüedad se difiere al path LLM.
  answerTextHash: null,
  answerExcerpt: null,
  citations: golden.expectedFinding.citationDomains.map(domain => ({
    url: `https://${domain}/`,
    domain
  })),
  usage: {},
  latencyMs: 0,
  providerRequestHash: sha256Hex(golden.id),
  rawEvidencePointer: null,
  errorCode: null,
  providerPolicyVersion: 'policy.v1',
  promptPackVersion: 'prompt-pack.v1',
  createdAt: '2026-06-24T00:00:00.000Z'
})

const sameSet = (a: string[], b: string[]): boolean => {
  const setA = new Set(a)
  const setB = new Set(b)

  return setA.size === setB.size && [...setA].every(item => setB.has(item))
}

/** Corre el eval determinista sobre el golden-set. PURO. */
export const runGoldenEval = (cases: GoldenEvalCase[]): GoldenEvalReport => {
  const results: EvalCaseResult[] = cases.map(golden => {
    const observation = buildObservationFromGolden(golden)

    const finding = normalizeObservation(observation, {
      subjectBrand: golden.input.subjectBrand,
      subjectDomain: golden.input.subjectDomain ?? null,
      competitorsDeclared: golden.expectedFinding.competitorsMentioned ?? []
    })

    const citationDomainsMatch = sameSet(finding.citationDomains, golden.expectedFinding.citationDomains)
    const subjectDomain = golden.input.subjectDomain ?? null
    const domainConfirmsPresence = subjectDomain ? golden.expectedFinding.citationDomains.includes(subjectDomain) : false

    // Fuera del alcance determinista (se difiere al path LLM):
    //  - 'ambiguous' (colisión de entidad, señal de prosa);
    //  - presencia esperada ('yes') SIN dominio del sujeto en citations → el
    //    determinista no puede confirmarla solo por estructura.
    if (
      golden.expectedFinding.brandMentioned === 'ambiguous' ||
      (golden.expectedFinding.brandMentioned === 'yes' && !domainConfirmsPresence)
    ) {
      return {
        id: golden.id,
        status: 'llm_required',
        brandMentionedExpected: golden.expectedFinding.brandMentioned,
        brandMentionedActual: finding.brandMentioned,
        citationDomainsMatch
      }
    }

    return {
      id: golden.id,
      status: finding.brandMentioned === golden.expectedFinding.brandMentioned ? 'match' : 'mismatch',
      brandMentionedExpected: golden.expectedFinding.brandMentioned,
      brandMentionedActual: finding.brandMentioned,
      citationDomainsMatch
    }
  })

  return {
    total: results.length,
    deterministicMatches: results.filter(r => r.status === 'match').length,
    deterministicMismatches: results.filter(r => r.status === 'mismatch').length,
    llmRequired: results.filter(r => r.status === 'llm_required').length,
    results
  }
}
