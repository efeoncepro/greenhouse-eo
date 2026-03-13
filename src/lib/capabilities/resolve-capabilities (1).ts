import { CAPABILITY_REGISTRY } from '@/config/capability-registry'
import type { ResolvedCapabilityModule } from '@/types/capabilities'

type ResolveCapabilityModulesInput = {
  businessLines: string[]
  serviceModules: string[]
}

const unique = (values: string[]) => Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))

const getMatches = (required: string[] | undefined, current: string[]) => {
  if (!required || required.length === 0) {
    return []
  }

  const currentValues = new Set(unique(current))

  return unique(required).filter(value => currentValues.has(value))
}

export const resolveCapabilityModules = ({
  businessLines,
  serviceModules
}: ResolveCapabilityModulesInput): ResolvedCapabilityModule[] =>
  CAPABILITY_REGISTRY.map(module => {
    const matchedBusinessLines = getMatches(module.requiredBusinessLines, businessLines)
    const matchedServiceModules = getMatches(module.requiredServiceModules, serviceModules)

    return {
      ...module,
      matchedBusinessLines,
      matchedServiceModules
    }
  })
    .filter(module => module.matchedBusinessLines.length > 0 || module.matchedServiceModules.length > 0)
    .sort((left, right) => left.priority - right.priority)

export const getResolvedCapabilityModule = (
  moduleId: string,
  input: ResolveCapabilityModulesInput
): ResolvedCapabilityModule | null => resolveCapabilityModules(input).find(module => module.id === moduleId) || null
