import { describe, expect, it } from 'vitest'

import { BRAND_BUSINESS_MODELS } from '../brand-intelligence/contracts'
import coverageMatrix from '../evals/archetype-coverage-eval.v1.json'
import {
  type ArchetypeCoverageExpectation,
  runArchetypeCoverageEval
} from '../evals/archetype-coverage-eval'
import { runGoldenEval, type GoldenEvalCase } from '../evals/eval-runner'
import goldenSet from '../evals/golden-set.v1.json'

const EXPECTATIONS = coverageMatrix.expectations as ArchetypeCoverageExpectation[]

/**
 * TASK-1292 (EPIC-021) — Capa A: cobertura del generador por arquetipo (DETERMINISTA).
 * Red de no-regresión que habilita reabilitar el cross-sell (TASK-1291) con confianza.
 */
describe('TASK-1292 — archetype coverage eval (Capa A, determinista)', () => {
  it('todos los arquetipos cumplen su contrato de cobertura (matriz verde el día 1)', () => {
    const report = runArchetypeCoverageEval(EXPECTATIONS)

    // Diagnóstico legible si rompe: qué arquetipo y por qué.
    const failures = report.results
      .filter(result => result.status === 'fail')
      .map(result => ({
        model: result.businessModel,
        missingStages: result.missingStages,
        fanOutShortfall: result.fanOutTypesShortfall,
        agencyLeak: result.agencyLeakPromptIds,
        missingCategoryToken: result.missingCategoryToken,
        packVersion: result.packVersion
      }))

    expect(failures).toEqual([])
    expect(report.failed).toBe(0)
    expect(report.passed).toBe(report.total)
  })

  it('la matriz cubre TODOS los business models del enum (ningún arquetipo sin protección)', () => {
    const covered = new Set(EXPECTATIONS.map(expectation => expectation.businessModel))

    for (const model of BRAND_BUSINESS_MODELS) {
      expect(covered.has(model), `falta cobertura para ${model}`).toBe(true)
    }

    // Y no hay expectativas para modelos inexistentes (matriz ≡ enum).
    expect(covered.size).toBe(BRAND_BUSINESS_MODELS.length)
  })

  it('es archetype-aware: public_institution NO exige purchase_intent; marketplace NO exige local', () => {
    const publicInst = EXPECTATIONS.find(e => e.businessModel === 'public_institution')
    const marketplace = EXPECTATIONS.find(e => e.businessModel === 'marketplace')

    expect(publicInst?.minStages).not.toContain('purchase_intent')
    expect(publicInst?.minStages).not.toContain('enterprise')
    expect(marketplace?.minStages).not.toContain('purchase_intent')
    expect(marketplace?.minStages).not.toContain('local')
  })

  it('solo el arquetipo agencia permite framing de agencia (noAgencyLeak=false)', () => {
    for (const expectation of EXPECTATIONS) {
      if (expectation.businessModel === 'b2b_service_provider') {
        expect(expectation.noAgencyLeak).toBe(false)
      } else {
        expect(expectation.noAgencyLeak, `${expectation.businessModel} debe bloquear framing de agencia`).toBe(true)
      }
    }
  })

  // Teeth: la eval NO es tautológica — si la matriz exige una etapa que el pack no
  // cubre, el caso falla. (consumer_b2c no tiene la etapa 'problem_aware'.)
  it('detecta una etapa exigida ausente (la eval tiene dientes)', () => {
    const broken: ArchetypeCoverageExpectation = {
      businessModel: 'consumer_b2c',
      expectedPackVersion: 'archetype-consumer_b2c.v1',
      minStages: ['awareness', 'problem_aware'],
      minDistinctFanOutTypes: 3,
      noAgencyLeak: true,
      requiresCategoryToken: true
    }

    const report = runArchetypeCoverageEval([broken])

    expect(report.failed).toBe(1)
    expect(report.results[0]?.missingStages).toContain('problem_aware')
  })

  // Teeth: detecta un swap accidental de pack (versión inesperada).
  it('detecta un pack inesperado para el arquetipo (packVersion mismatch)', () => {
    const swapped: ArchetypeCoverageExpectation = {
      businessModel: 'consumer_b2c',
      expectedPackVersion: 'prompt-pack.v1',
      minStages: ['awareness'],
      minDistinctFanOutTypes: 3,
      noAgencyLeak: true,
      requiresCategoryToken: true
    }

    const report = runArchetypeCoverageEval([swapped])

    expect(report.failed).toBe(1)
    expect(report.results[0]?.packVersionMatches).toBe(false)
  })
})

/**
 * Anclaje de no-regresión del SCORER (ortogonal a la cobertura): el golden-set
 * determinista del scorer/normalizer (TASK-1227/1228) NO cambia. La identidad
 * referencial del pack agencia (=== PACK_V1) se ancla en archetype-baseline-packs.test.ts.
 */
describe('TASK-1292 — anclaje scorer (golden-set v1 intacto)', () => {
  it('runGoldenEval sobre golden-set.v1 sin divergencias deterministas', () => {
    const report = runGoldenEval(goldenSet.cases as unknown as GoldenEvalCase[])

    expect(report.deterministicMismatches).toBe(0)
  })
})
