import 'server-only'

import { query } from '@/lib/db'

import type { PersonDocumentType } from './types'

/**
 * TASK-784 — Country-aware document type resolution + cascade country
 * resolver para el colaborador.
 *
 * Greenhouse es multi-tenant internacional. Estas funciones evitan
 * cualquier asuncion Chile-only:
 *
 * 1. `getDefaultDocumentTypeForCountry`: mapea ISO alpha-2 al tipo de
 *    documento canonico del pais. Si el pais no tiene mapping especifico,
 *    devuelve `GENERIC_NATIONAL_ID` (degradacion graceful, no Chile-only).
 *
 * 2. `resolvePersonCountry`: cascade resolver con prioridad:
 *      a) Direccion legal verified declarada por el colaborador
 *      b) Direccion legal pending declarada
 *      c) Cualquier documento de identidad verified
 *      d) Cualquier address declarada
 *      e) Cualquier documento declarado
 *      f) `members.location_country` (Entra/SCIM fallback)
 *      g) null
 *
 *    El colaborador es la fuente de verdad PRIMERA: si declaro su address
 *    en NI (Nicaragua), eso supera al location_country de Entra.
 */

/**
 * Mapping canonico pais → tipo de documento de identidad nacional.
 * Si el pais no aparece aqui, el caller debe degradar a
 * `GENERIC_NATIONAL_ID` o pedir al usuario que elija explicitamente.
 *
 * NUNCA hardcodear "CL_RUT" como fallback — eso asume Chile y rompe la
 * neutralidad internacional de Greenhouse.
 */
const DEFAULT_DOCUMENT_BY_COUNTRY: Record<string, PersonDocumentType> = {
  // Chile
  CL: 'CL_RUT',

  // Argentina (DNI es lo mas comun para personas naturales)
  AR: 'AR_DNI',

  // Brasil
  BR: 'BR_CPF',

  // Colombia
  CO: 'CO_CC',

  // Mexico (CURP es el ID universal en Mexico)
  MX: 'MX_CURP',

  // Peru
  PE: 'PE_DNI',

  // Uruguay
  UY: 'UY_CI',

  // Estados Unidos
  US: 'US_SSN'
}

/**
 * Devuelve el tipo de documento canonico del pais. Si el pais no esta
 * mapeado (Nicaragua, Espana, etc.), devuelve `GENERIC_NATIONAL_ID` para
 * que la UI muestre "Documento nacional" generico — neutral, no
 * Chile-asumido.
 *
 * Si `country` es null/empty, devuelve null (UI muestra "Documento de
 * identidad" generico sin pre-seleccion de tipo).
 */
export const getDefaultDocumentTypeForCountry = (
  country: string | null | undefined
): PersonDocumentType | null => {
  if (!country) return null
  const upper = country.toUpperCase()

  return DEFAULT_DOCUMENT_BY_COUNTRY[upper] ?? 'GENERIC_NATIONAL_ID'
}

interface CountrySnapshotRow {
  source: string
  country: string | null
  status: string | null
  [key: string]: unknown
}

/**
 * Cascade resolver del pais del colaborador, con prioridad declarativa.
 *
 * El colaborador es la fuente de verdad: si declaro su direccion legal en
 * Nicaragua, eso prevalece sobre el location_country que Entra/SCIM
 * sincronizo desde Microsoft Graph.
 *
 * Returns ISO alpha-2 uppercase, o null si no hay informacion.
 */
export const resolvePersonCountry = async (
  memberId: string,
  profileId: string | null
): Promise<string | null> => {
  // Si tenemos profile, hacemos cascade lookup en tablas TASK-784
  if (profileId) {
    const rows = await query<CountrySnapshotRow>(
      `
        SELECT 'address_legal_verified' AS source, country_code AS country, verification_status AS status,
               COALESCE(verified_at, declared_at) AS effective_at
        FROM greenhouse_core.person_addresses
        WHERE profile_id = $1
          AND address_type = 'legal'
          AND verification_status = 'verified'
          AND country_code IS NOT NULL

        UNION ALL

        SELECT 'address_legal_pending' AS source, country_code AS country, verification_status AS status,
               declared_at AS effective_at
        FROM greenhouse_core.person_addresses
        WHERE profile_id = $1
          AND address_type = 'legal'
          AND verification_status = 'pending_review'
          AND country_code IS NOT NULL

        UNION ALL

        SELECT 'document_verified' AS source, country_code AS country, verification_status AS status,
               COALESCE(verified_at, declared_at) AS effective_at
        FROM greenhouse_core.person_identity_documents
        WHERE profile_id = $1
          AND verification_status = 'verified'
          AND country_code IS NOT NULL

        UNION ALL

        SELECT 'address_any' AS source, country_code AS country, verification_status AS status,
               declared_at AS effective_at
        FROM greenhouse_core.person_addresses
        WHERE profile_id = $1
          AND verification_status IN ('pending_review', 'verified')
          AND country_code IS NOT NULL

        UNION ALL

        SELECT 'document_any' AS source, country_code AS country, verification_status AS status,
               declared_at AS effective_at
        FROM greenhouse_core.person_identity_documents
        WHERE profile_id = $1
          AND verification_status IN ('pending_review', 'verified')
          AND country_code IS NOT NULL

        ORDER BY
          CASE source
            WHEN 'address_legal_verified' THEN 1
            WHEN 'address_legal_pending' THEN 2
            WHEN 'document_verified' THEN 3
            WHEN 'address_any' THEN 4
            WHEN 'document_any' THEN 5
            ELSE 99
          END ASC,
          effective_at DESC NULLS LAST
        LIMIT 1
      `,
      [profileId]
    )

    const candidate = rows[0]?.country

    if (candidate) {
      const upper = candidate.toUpperCase()

      if (/^[A-Z]{2}$/.test(upper)) return upper
    }
  }

  // Fallback: members.location_country (Entra/SCIM sync)
  const memberRows = await query<{ location_country: string | null; [key: string]: unknown }>(
    `SELECT location_country FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
    [memberId]
  )

  const raw = memberRows[0]?.location_country

  if (!raw) return null

  const normalized = raw.trim().toUpperCase()

  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}

/**
 * @deprecated Use `resolvePersonCountry(memberId, profileId)` que cascade-resuelve
 * desde direccion declarada > documento declarado > location_country. Solo el
 * fallback Entra queda intacto. Esta funcion legacy se mantiene por
 * compatibilidad temporal — no usar en codigo nuevo.
 */
export const resolveMemberCountry = async (memberId: string): Promise<string | null> => {
  const memberRows = await query<{ location_country: string | null; [key: string]: unknown }>(
    `SELECT location_country FROM greenhouse_core.members WHERE member_id = $1 LIMIT 1`,
    [memberId]
  )

  const raw = memberRows[0]?.location_country

  if (!raw) return null

  const normalized = raw.trim().toUpperCase()

  return /^[A-Z]{2}$/.test(normalized) ? normalized : null
}
