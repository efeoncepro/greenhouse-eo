/** Presentation-only refinement of the existing governed five-step intake.
 * Preserve each complete step, including future fields/copy; reject drift instead of guessing.
 */
export const GRADER_BRAND_FIRST_STEP_ORDER = ['brand', 'market', 'context', 'delivery', 'refine'] as const

export function withGraderBrandFirstIntake(uiPolicy: unknown): Record<string, unknown> {
  if (!uiPolicy || typeof uiPolicy !== 'object' || Array.isArray(uiPolicy)) {
    throw new Error('grader_ui_policy_missing')
  }

  const policy = uiPolicy as Record<string, unknown>

  if (policy.composition !== 'multi_step_light' || !Array.isArray(policy.steps)) {
    throw new Error('grader_composition_drift')
  }

  const steps = policy.steps as Array<Record<string, unknown>>
  const keys = steps.map(step => step?.key)

  if (keys.length !== 5 || new Set(keys).size !== 5 || GRADER_BRAND_FIRST_STEP_ORDER.some(key => !keys.includes(key))) {
    throw new Error('grader_steps_drift')
  }

  const brand = steps.find(step => step.key === 'brand')!
  const delivery = steps.find(step => step.key === 'delivery')!
  const refine = steps.find(step => step.key === 'refine')!

  const contains = (step: Record<string, unknown>, fields: string[]) => {
    const fieldKeys = step.fieldKeys

    return Array.isArray(fieldKeys) && fields.every(key => fieldKeys.includes(key))
  }

  if (!contains(brand, ['brandName', 'websiteUrl']) || !contains(delivery, ['firstName', 'lastName', 'email']) || !contains(refine, ['consent'])) {
    throw new Error('grader_field_groups_drift')
  }

  return { ...policy, steps: GRADER_BRAND_FIRST_STEP_ORDER.map(key => steps.find(step => step.key === key)!) }
}
