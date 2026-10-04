import { describe, expect, it } from 'vitest'

import { withGraderBrandFirstIntake } from './grader-brand-first-intake'
import { preserveFormVersionFields } from './preserve-form-version-fields'

const policy = () => ({
  composition: 'multi_step_light',
  security: { captcha: { required: true, provider: 'turnstile', execution: 'submit' } },
  futurePolicy: { preserve: true },
  steps: [
    { key: 'delivery', label: 'Entrega', fieldKeys: ['firstName', 'lastName', 'email'] },
    { key: 'brand', label: 'Marca', fieldKeys: ['brandName', 'websiteUrl'] },
    { key: 'market', label: 'Mercado', fieldKeys: ['market', 'locale', 'category'] },
    { key: 'context', label: 'Contexto', fieldKeys: ['competitorsDeclared', 'industry'] },
    { key: 'refine', label: 'Confirmar', fieldKeys: ['persona', 'companySize', 'mainChallenge', 'consent'] },
  ],
})

describe('brand-first governed intake', () => {
  it('only reorders complete steps, preserving captcha and future policy data without mutating the source', () => {
    const source = policy()
    const before = structuredClone(source)
    const result = withGraderBrandFirstIntake(source)

    expect(source).toEqual(before)
    expect(result.steps).toEqual([source.steps[1], source.steps[2], source.steps[3], source.steps[0], source.steps[4]])
    expect({ ...result, steps: source.steps }).toEqual(source)
    expect(withGraderBrandFirstIntake(result)).toEqual(result)
  })

  it('fails closed on missing, duplicate, unfamiliar steps or moved sensitive fields', () => {
    expect(() => withGraderBrandFirstIntake(null)).toThrow('grader_ui_policy_missing')
    expect(() => withGraderBrandFirstIntake({ ...policy(), composition: 'static' })).toThrow('grader_composition_drift')

    for (const steps of [policy().steps.slice(1), [...policy().steps, policy().steps[0]], policy().steps.map(step => step.key === 'market' ? { ...step, key: 'other' } : step)]) {
      expect(() => withGraderBrandFirstIntake({ ...policy(), steps })).toThrow('grader_steps_drift')
    }

    const source = policy()

    source.steps[0].fieldKeys = ['firstName', 'lastName']
    expect(() => withGraderBrandFirstIntake(source)).toThrow('grader_field_groups_drift')
  })

  it('leaves delivery, validation, consent and retention policies unchanged when cloning the published version', () => {
    const row = {
      locale: 'es-CL', validation_schema_json: { emailPolicy: { corporateOnly: true } },
      copy_refs_json: { copy: { submit: 'Generar informe' } }, style_variant: 'diagnostic_premium',
      ui_policy_json: policy(), success_behavior_json: { kind: 'tokenized_report' },
      consent_policy_version: 'v1', data_classification_json: { email: 'personal' },
      destination_policy_json: { preserve: true }, analytics_policy_json: { fieldLevelAnalyticsDisabled: true },
      retention_policy_json: { days: 90 }, commercial_handoff_policy_json: { preserve: true },
    }

    const previous = preserveFormVersionFields(row)
    const next = { ...previous, uiPolicy: withGraderBrandFirstIntake(row.ui_policy_json) }

    expect({ ...next, uiPolicy: previous.uiPolicy }).toEqual(previous)
  })
})
