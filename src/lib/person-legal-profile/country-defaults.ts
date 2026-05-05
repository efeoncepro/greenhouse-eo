import 'server-only'

import { query } from '@/lib/db'

import type { PersonDocumentType } from './types'

/**
 * TASK-784 — Country-aware document type + Entra-sourced default.
 *
 * Greenhouse trata el pais del colaborador como un atributo MULTI-SOURCE:
 *
 *   - `members.location_country` (Entra/SCIM sync) → identidad operacional
 *     (`/people` listing, ICO, staffing global). TI Microsoft 365 escribe.
 *   - `person_addresses[legal].country_code` declarado → identidad legal
 *     para documentos formales. Self/HR escribe.
 *
 * NO override silencioso entre fuentes: cuando el colaborador declara un
 * pais distinto al de Entra, el sistema NO sobrescribe Entra. Reconciliacion
 * con governance es la TASK-787 follow-up — necesita Microsoft Graph
 * write-back + capability + audit + drift signal.
 *
 * Mientras tanto, el form default usa SOLO Entra (operacional). El pais
 * declarado se persiste en la tabla `person_addresses` y se consume en
 * paths que SI requieren legal source (finiquito snapshot via
 * `readFinalSettlementSnapshot`).
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

/**
 * Devuelve el tipo de documento canonico del pais. Para paises sin mapping
 * canonico (NI, ES, CR, etc.) → `GENERIC_NATIONAL_ID`. Si `country` es null
 * → null (UI muestra "Documento de identidad" generico).
 */
export const getDefaultDocumentTypeForCountry = (
  country: string | null | undefined
): PersonDocumentType | null => {
  if (!country) return null
  const upper = country.toUpperCase()

  return DEFAULT_DOCUMENT_BY_COUNTRY[upper] ?? 'GENERIC_NATIONAL_ID'
}

/**
 * Pais de Entra/SCIM (`members.location_country`). Source of truth
 * operacional. Returns null si Entra no provee country (campo opcional
 * en Microsoft 365).
 */
export const resolveMemberCountry = async (memberId: string): Promise<string | null> => {
  const rows = await query<{ location_country: string | null; [key: string]: unknown }>(
    `SELECT location_country FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
    [memberId]
  )

  const raw = rows[0]?.location_country

  if (!raw) return null
  const normalized = raw.trim().toUpperCase()

  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}
