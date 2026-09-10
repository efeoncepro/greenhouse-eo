import { describe, expect, it } from 'vitest'

import {
  ART_DIRECTOR_SENIOR_PACK,
  SEO_SPECIALIST_SENIOR_PACK,
  resolveReusableTemplateId,
  validateTask1604RoleAssessmentPacks,
} from './task-1604-role-assessment-pack'

describe('TASK-1604 critical-role assessment pack', () => {
  it('preserves the complete weighted contract and coverage invariants', () => {
    expect(() => validateTask1604RoleAssessmentPacks()).not.toThrow()
  })

  it('keeps SEO gated until individual questions receive SME activation', () => {
    expect(SEO_SPECIALIST_SENIOR_PACK.method).toBe('candidate_test')
    expect(SEO_SPECIALIST_SENIOR_PACK.materialization).toBe('after_sme_activation')
    expect(SEO_SPECIALIST_SENIOR_PACK.questions).toHaveLength(9)
    expect(SEO_SPECIALIST_SENIOR_PACK.questions.every(question => question.rubric?.version === 'bars.v1')).toBe(true)
  })

  it('reuses only one active template with the exact role and module contract', () => {
    const exact = {
      templateId: 'atpl-task-1604-exact',
      roleHint: SEO_SPECIALIST_SENIOR_PACK.template.roleHint ?? null,
      modules: SEO_SPECIALIST_SENIOR_PACK.template.modules.map(module => ({
        competencyKey: module.competencyKey,
        targetLevel: module.targetLevel ?? null,
        weight: module.weight,
      })),
    }

    expect(resolveReusableTemplateId(SEO_SPECIALIST_SENIOR_PACK.template, [exact])).toBe(exact.templateId)
    expect(() =>
      resolveReusableTemplateId(SEO_SPECIALIST_SENIOR_PACK.template, [
        { ...exact, modules: exact.modules.map((module, index) => ({ ...module, weight: index === 0 ? 29 : module.weight })) },
      ]),
    ).toThrow(/name collision/)
    expect(() => resolveReusableTemplateId(SEO_SPECIALIST_SENIOR_PACK.template, [exact, { ...exact }])).toThrow(
      /multiple active templates/,
    )
  })

  it('models senior art direction as evidence-led interviewer scoring, not a text exam', () => {
    expect(ART_DIRECTOR_SENIOR_PACK.method).toBe('interviewer_scorecard')
    expect(ART_DIRECTOR_SENIOR_PACK.questions).toHaveLength(0)
    expect(ART_DIRECTOR_SENIOR_PACK.interviewGuide).toHaveLength(6)
    expect(ART_DIRECTOR_SENIOR_PACK.materialization).toBe('interviewer_runtime_has_no_template_binding')
  })
})
