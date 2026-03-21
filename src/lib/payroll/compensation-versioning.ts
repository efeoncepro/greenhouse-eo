import type { CompensationVersion } from '@/types/payroll'

export type CompensationSaveMode = 'create' | 'update'

export const getCompensationSaveMode = ({
  existingVersion,
  effectiveFrom
}: {
  existingVersion: CompensationVersion | null
  effectiveFrom: string
}): CompensationSaveMode => {
  if (existingVersion && existingVersion.effectiveFrom === effectiveFrom) {
    return 'update'
  }

  return 'create'
}
