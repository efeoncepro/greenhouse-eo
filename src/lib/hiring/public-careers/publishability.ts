import type { HiringOpeningVisibility, HiringPublicWorkMode } from '@/types/hiring'

import { HiringValidationError } from '../errors'

export type PublishableOpeningFields = {
  publicTitle: string | null
  publicSummary: string | null
  publicDescription: string | null
  publicWorkMode: HiringPublicWorkMode | null
  publicHiringRegion: string | null
  publicCity: string | null
  publicCountry: string | null
  publicOfficeLocation: string | null
  publicArea: string | null
  publicSkillTags: string[]
  publicSeniority: string | null
  visibility?: HiringOpeningVisibility
}

/**
 * Invariante compartida por publish y update: una fila que permanece publicada
 * nunca puede degradarse a un estado que el reader público no habría aceptado.
 */
export const assertPublishableOpening = (opening: PublishableOpeningFields): void => {
  const missing: string[] = []

  if (!opening.publicTitle?.trim()) missing.push('publicTitle')
  if (!opening.publicSummary?.trim()) missing.push('publicSummary')
  if (!opening.publicDescription?.trim()) missing.push('publicDescription')
  if (!opening.publicArea?.trim()) missing.push('publicArea')
  if (!opening.publicSeniority?.trim()) missing.push('publicSeniority')
  if (!opening.publicWorkMode?.trim()) missing.push('publicWorkMode')
  if (!opening.publicSkillTags.length) missing.push('publicSkillTags')

  if (opening.publicWorkMode === 'remote' && !opening.publicHiringRegion?.trim()) {
    missing.push('publicHiringRegion')
  }

  if (
    (opening.publicWorkMode === 'hybrid' || opening.publicWorkMode === 'onsite') &&
    !opening.publicOfficeLocation?.trim() &&
    (!opening.publicCity?.trim() || !opening.publicCountry?.trim())
  ) {
    missing.push('publicOfficeLocation|publicCity+publicCountry')
  }

  if (opening.visibility !== undefined && opening.visibility !== 'public_listed') {
    missing.push('visibility=public_listed')
  }

  if (missing.length) {
    throw new HiringValidationError(
      'No se puede publicar ni mantener publicado un opening sin campos públicos estructurados completos.',
      'hiring_opening_missing_public_structured_fields',
      422,
      { missing }
    )
  }
}
