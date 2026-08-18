import type { HiringOpeningVisibility, HiringPublicWorkMode, PublicOpeningContent } from '@/types/hiring'

import { HiringValidationError } from '../errors'
import { assertPublicTitleSeniorityConsistency, parseHiringPublicSeniority } from '../public-seniority'
import { isCanonicalPublicOpeningContent } from './public-content'

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
  publicContent?: PublicOpeningContent | null
  publicRemoteEligibleCountries?: string[]
  visibility?: HiringOpeningVisibility
}

/**
 * TASK-1740/1741 — ¿esta publicación debe exigir el contrato editorial v2?
 *
 * Sólo cuando la vacante se publica POR PRIMERA VEZ. El contenido v2 es la barra de calidad
 * del contrato nuevo y toda vacante nueva la cumple; pero aplicarla también al RE-publicar
 * convertiría una regla de autoría en una interrupción de servicio: una vacante viva —con
 * postulantes en proceso— que se pausa por cualquier motivo quedaría fuera del aire hasta
 * reescribir su bloque completo, respondiendo 404 mientras tanto.
 *
 * `publishedAt` es la señal honesta de "ya estuvo al aire": sólo la escribe el publish, así
 * que una vacante nueva la tiene en null y no puede saltarse v2 por esta vía.
 */
export const requiresEditorialV2ForPublish = (publishedAt: Date | string | null | undefined): boolean =>
  publishedAt == null

/**
 * Invariante compartida por publish y update: una fila que permanece publicada
 * nunca puede degradarse a un estado que el reader público no habría aceptado.
 */
export const assertPublishableOpening = (
  opening: PublishableOpeningFields,
  { requireEditorialV2 = false }: { requireEditorialV2?: boolean } = {}
): void => {
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

  if (requireEditorialV2 && !isCanonicalPublicOpeningContent(opening.publicContent)) {
    missing.push('publicContent.version=2')
  }

  if (requireEditorialV2 && opening.publicWorkMode === 'remote' && !opening.publicRemoteEligibleCountries?.length) {
    missing.push('publicRemoteEligibleCountries')
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

  parseHiringPublicSeniority(opening.publicSeniority)
  assertPublicTitleSeniorityConsistency(opening.publicTitle, opening.publicSeniority)
}
