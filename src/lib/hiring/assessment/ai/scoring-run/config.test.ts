import { beforeEach, afterEach, describe, expect, it } from 'vitest'

import {
  getEffectiveHiringAssessmentAiRunMode,
  getHiringAssessmentAiRunPolicyVersion,
  isHiringAssessmentAiExceptionPolicyEnabled,
  isHiringAssessmentAiRunEnqueueEnabled,
} from './config'

const ENV_KEYS = [
  'HIRING_ASSESSMENT_AI_RUN_MODE',
  'HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED',
  'HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED',
  'HIRING_ASSESSMENT_AI_PROMOTION_EVIDENCE_DIGEST',
] as const

describe('TASK-1742 assessment AI governed modes', () => {
  // 🔴 El entorno se normaliza ANTES de cada test, no sólo después.
  //
  // Con sólo `afterEach`, este bloque asumía que el ambiente llegaba limpio — y no llega: correr
  // los live tests en local exige `set -a; source .env.local`, que exporta las ~85 variables del
  // archivo, entre ellas `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED=true`. Con eso, «nace disabled»
  // recibía `global_provisional` y fallaba. El test era verde o rojo según CÓMO se invocara la
  // suite, que es la peor propiedad que puede tener una aserción.
  //
  // Un test que afirma un DEFAULT tiene que garantizar su precondición, nunca heredarla.
  beforeEach(() => ENV_KEYS.forEach(key => delete process.env[key]))
  afterEach(() => ENV_KEYS.forEach(key => delete process.env[key]))

  it('nace disabled aunque no haya mode explícito', () => {
    expect(getEffectiveHiringAssessmentAiRunMode()).toBe('disabled')
    expect(isHiringAssessmentAiRunEnqueueEnabled()).toBe(false)
  })

  it('migra un enqueue legacy ON al modo provisional, nunca a batch', () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'

    expect(getEffectiveHiringAssessmentAiRunMode()).toBe('global_provisional')
    expect(isHiringAssessmentAiRunEnqueueEnabled()).toBe(true)
    expect(isHiringAssessmentAiExceptionPolicyEnabled()).toBe(false)
  })

  it('degrada calibrated_batch a provisional sin evidence digest', () => {
    process.env.HIRING_ASSESSMENT_AI_RUN_MODE = 'calibrated_batch'
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'
    process.env.HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED = 'true'

    expect(getEffectiveHiringAssessmentAiRunMode()).toBe('global_provisional')
    expect(isHiringAssessmentAiExceptionPolicyEnabled()).toBe(false)
  })

  it('ata mode y evidence digest a policyVersion cuando el gate superior sí está completo', () => {
    const evidence = 'a'.repeat(64)

    process.env.HIRING_ASSESSMENT_AI_RUN_MODE = 'exception_canary'
    process.env.HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED = 'true'
    process.env.HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED = 'true'
    process.env.HIRING_ASSESSMENT_AI_PROMOTION_EVIDENCE_DIGEST = evidence

    expect(getEffectiveHiringAssessmentAiRunMode()).toBe('exception_canary')
    expect(isHiringAssessmentAiExceptionPolicyEnabled()).toBe(true)
    expect(getHiringAssessmentAiRunPolicyVersion()).toContain(`:exception_canary:${evidence}`)
  })
})
