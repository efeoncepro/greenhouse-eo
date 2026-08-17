import { HIRING_PUBLIC_SENIORITIES, type HiringPublicSeniority } from '@/types/hiring'

import { HiringValidationError } from './errors'

const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')

export const isHiringPublicSeniority = (value: unknown): value is HiringPublicSeniority =>
  typeof value === 'string' && HIRING_PUBLIC_SENIORITIES.includes(value as HiringPublicSeniority)

export const parseHiringPublicSeniority = (
  value: unknown,
  options: { nullable?: boolean; field?: string } = {}
): HiringPublicSeniority | null => {
  const field = options.field ?? 'publicSeniority'

  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    if (options.nullable) return null

    throw new HiringValidationError(
      'La vacante debe declarar un nivel público aprobado.',
      'hiring_opening_public_seniority_required',
      422,
      { field, allowed: HIRING_PUBLIC_SENIORITIES }
    )
  }

  if (!isHiringPublicSeniority(value)) {
    throw new HiringValidationError(
      'El nivel público debe usar el vocabulario para candidatos; no se permiten códigos internos ni equivalencias libres.',
      'hiring_opening_public_seniority_invalid',
      422,
      { field, allowed: HIRING_PUBLIC_SENIORITIES }
    )
  }

  return value
}

export const inferExplicitSeniorityFromPublicTitle = (title: string): HiringPublicSeniority | null => {
  const normalized = normalizeForMatch(title).replace(/[^a-z0-9-]+/g, ' ')

  // Semi-senior debe evaluarse antes que Senior porque contiene el mismo token.
  if (/\bsemi[\s-]*senior\b/.test(normalized)) return 'Semi-senior'
  if (/\b(?:junior|jr)\b/.test(normalized)) return 'Junior'
  if (/\b(?:senior|sr)\b/.test(normalized)) return 'Senior'
  if (/\blead\b/.test(normalized)) return 'Lead'

  return null
}

export const assertPublicTitleSeniorityConsistency = (
  publicTitle: string | null,
  publicSeniority: string | null
): void => {
  if (!publicTitle?.trim() || !publicSeniority?.trim()) return

  const canonical = parseHiringPublicSeniority(publicSeniority)
  const declaredInTitle = inferExplicitSeniorityFromPublicTitle(publicTitle)

  if (declaredInTitle && declaredInTitle !== canonical) {
    throw new HiringValidationError(
      'El título público y el nivel del rol se contradicen.',
      'hiring_opening_public_seniority_title_mismatch',
      422,
      { publicTitle, publicSeniority: canonical, expected: declaredInTitle }
    )
  }
}
