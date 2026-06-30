/**
 * TASK-1292 (EPIC-021) — Growth AI Visibility · Archetype coverage eval (Capa A).
 *
 * Eval DETERMINISTA de cobertura del generador de prompts por arquetipo. Para
 * cada `business_model`, el pack que resuelve `resolveArchetypeBaselinePack`
 * debe cubrir las etapas de buyer-intent mínimas exigibles (matriz archetype-aware
 * en `archetype-coverage-eval.v1.json`), no usar framing de agencia (salvo el
 * arquetipo agencia) y abarcar amplitud de Query Fan-Out.
 *
 * Es el SSOT de "¿cada arquetipo cubre su contrato JTBD?" — consumido por el CI
 * test Y por el reliability signal `archetype_coverage_gap` (mismo patrón que
 * `runGoldenEval` ← `prompt_pack_eval_regression`). PURO: sin LLM, sin provider,
 * sin red, sin PG. NO mide presencia real en el LLM (eso es la Capa B: smoke
 * real allowlisted, evidencia, NO gate de CI).
 *
 * Complementa (no duplica) `archetype-baseline-packs.test.ts` (TASK-1290), que
 * ancla identidad referencial del pack agencia, unicidad de ids y vocabulario de
 * tags. Acá se gobierna la COBERTURA por arquetipo como fixture declarativo.
 */

import { resolveArchetypeBaselinePack } from '../prompt-packs/archetypes/baseline-packs'

/**
 * Detecta framing de "comprador de agencia" (la causa raíz de ISSUE-110: un pack
 * no-agencia que pregunta "¿qué agencias/proveedores de X?"). Word-boundary para
 * no castigar substrings legítimos.
 */
const AGENCY_LEAK_PATTERN = /\bagencias?\b|\bproveedor(?:es)?\b/i

/** Token de categoría canónica interpolado (framing category-noun, no hardcodeado). */
const CATEGORY_TOKEN = '{{category}}'

export interface ArchetypeCoverageExpectation {
  businessModel: string
  expectedPackVersion: string
  minStages: string[]
  minDistinctFanOutTypes: number
  noAgencyLeak: boolean
  requiresCategoryToken: boolean
}

export interface ArchetypeCoverageCaseResult {
  businessModel: string
  status: 'pass' | 'fail'
  /** Etapas exigidas por la matriz que el pack NO cubre. */
  missingStages: string[]
  /** Tipos de Query Fan-Out distintos cubiertos vs el mínimo exigido. */
  distinctFanOutTypes: number
  fanOutTypesShortfall: number
  /** ids de prompt con framing de agencia en un pack que NO debería tenerlo. */
  agencyLeakPromptIds: string[]
  /** Versión real del pack vs la esperada (detecta swaps accidentales de pack). */
  packVersion: string
  packVersionMatches: boolean
  /** El pack carece de un prompt de descubrimiento con {{category}} (framing roto). */
  missingCategoryToken: boolean
}

export interface ArchetypeCoverageReport {
  total: number
  passed: number
  failed: number
  results: ArchetypeCoverageCaseResult[]
}

/** Evalúa una expectativa contra el pack resuelto. PURO. */
const evaluateExpectation = (expectation: ArchetypeCoverageExpectation): ArchetypeCoverageCaseResult => {
  const pack = resolveArchetypeBaselinePack(expectation.businessModel)

  const stagesPresent = new Set(pack.prompts.map(prompt => prompt.intentStage))
  const missingStages = expectation.minStages.filter(stage => !stagesPresent.has(stage as never))

  const distinctFanOutTypes = new Set(pack.prompts.map(prompt => prompt.fanOutType)).size
  const fanOutTypesShortfall = Math.max(0, expectation.minDistinctFanOutTypes - distinctFanOutTypes)

  const agencyLeakPromptIds = expectation.noAgencyLeak
    ? pack.prompts.filter(prompt => AGENCY_LEAK_PATTERN.test(prompt.text)).map(prompt => prompt.id)
    : []

  // El framing category-noun se ancla en los prompts de descubrimiento (sin marca
  // nombrada): al menos uno debe interpolar {{category}} (la label canónica), en
  // vez de hardcodear un sustantivo de sector.
  const missingCategoryToken =
    expectation.requiresCategoryToken &&
    !pack.prompts.some(prompt => !prompt.namesBrand && prompt.text.includes(CATEGORY_TOKEN))

  const packVersionMatches = pack.version === expectation.expectedPackVersion

  const status: 'pass' | 'fail' =
    missingStages.length === 0 &&
    fanOutTypesShortfall === 0 &&
    agencyLeakPromptIds.length === 0 &&
    !missingCategoryToken &&
    packVersionMatches
      ? 'pass'
      : 'fail'

  return {
    businessModel: expectation.businessModel,
    status,
    missingStages,
    distinctFanOutTypes,
    fanOutTypesShortfall,
    agencyLeakPromptIds,
    packVersion: pack.version,
    packVersionMatches,
    missingCategoryToken
  }
}

/** Corre la eval de cobertura sobre la matriz de expectativas. PURO. */
export const runArchetypeCoverageEval = (
  expectations: ArchetypeCoverageExpectation[]
): ArchetypeCoverageReport => {
  const results = expectations.map(evaluateExpectation)

  return {
    total: results.length,
    passed: results.filter(result => result.status === 'pass').length,
    failed: results.filter(result => result.status === 'fail').length,
    results
  }
}
