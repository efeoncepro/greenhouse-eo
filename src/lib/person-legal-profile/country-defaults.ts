import 'server-only'

import type { PersonDocumentType } from './types'

/**
 * TASK-784 — Country-aware default document type.
 *
 * Greenhouse es multi-tenant internacional. Cuando un colaborador no ha
 * declarado nada todavia, la UI necesita saber QUE documento ofrecerle
 * primero. Se deriva de `members.location_country`.
 *
 * Si el pais es desconocido (null), el caller debe mostrar "Documento
 * de identidad" generico — NO asumir Chile.
 */
const DEFAULT_DOCUMENT_BY_COUNTRY: Record<string, PersonDocumentType> = {
  CL: 'CL_RUT',
  AR: 'AR_DNI',
  BR: 'BR_CPF',
  CO: 'CO_CC',
  MX: 'MX_CURP',
  PE: 'PE_DNI',
  UY: 'UY_CI',
  US: 'US_SSN'
}

export const getDefaultDocumentTypeForCountry = (
  country: string | null | undefined
): PersonDocumentType | null => {
  if (!country) return null

  return DEFAULT_DOCUMENT_BY_COUNTRY[country.toUpperCase()] ?? null
}

import { query } from '@/lib/db'

interface MemberCountryRow {
  location_country: string | null
  [key: string]: unknown
}

/**
 * Resolve `location_country` from the member row. Returns ISO alpha-2
 * uppercase, or `null` if unknown.
 */
export const resolveMemberCountry = async (memberId: string): Promise<string | null> => {
  const rows = await query<MemberCountryRow>(
    `SELECT location_country FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
    [memberId]
  )

  const raw = rows[0]?.location_country

  if (!raw) return null

  const normalized = raw.trim().toUpperCase()

  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}
