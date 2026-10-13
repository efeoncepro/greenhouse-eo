import type { RendererFieldDefinition } from './contract'

/** Structural port implemented by AXIS /input-behavior and /input-phone.
 * Injection keeps the published renderer on its existing exact dependencies until package release.
 * This interface contains editing semantics only, never a business validator or submission policy.
 */
export interface GrowthInputBehavior {
  resolve(
    text: string,
    phase?: 'input' | 'blur'
  ): {
    display: string
    value: string | null
    state: 'empty' | 'incomplete' | 'ready' | 'invalid'
  }
}
export type GrowthInputBehaviorFactory = (
  field: RendererFieldDefinition,
  country?: string
) => GrowthInputBehavior | undefined

export interface AxisGrowthBehaviors {
  email(): GrowthInputBehavior
  url(): GrowthInputBehavior
  rut(): GrowthInputBehavior
  phone(country: string): GrowthInputBehavior
}

/** Product mapping is explicit. Number/date/custom national IDs retain domain behavior.
 * Do not infer RUT from a text-field name or turn the business locale into a currency policy.
 */
export function createAxisGrowthInputFactory(axis: AxisGrowthBehaviors): GrowthInputBehaviorFactory {
  return (field, country) => {
    if (field.type === 'email') return axis.email()
    if (field.type === 'url') return axis.url()
    if (field.type === 'tel') return axis.phone((country ?? field.validatorParams?.country ?? 'CL').toUpperCase())
    if (field.type === 'national_id' && (field.validatorParams?.country ?? 'CL').toUpperCase() === 'CL')
      return axis.rut()

    return undefined
  }
}
