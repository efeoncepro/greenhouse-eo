import 'server-only'

import type { PersonDocumentType, AddressType } from './types'

/**
 * TASK-784 — Masking helpers para display default.
 *
 * Reglas:
 *   - Para CL_RUT: formato `xx.xxx.NNN-K` — ultimos 3 digitos + DV visibles.
 *   - Para documentos genericos: ultimos 4 chars visibles + asteriscos.
 *   - Para direcciones: ciudad + region + pais (SIN street_line_1).
 */

/**
 * Aplica mascara al valor formateado de CL_RUT.
 * Input esperado: "12.345.678-K" (formato presentacion).
 * Output: "xx.xxx.678-K".
 */
export const maskClRut = (formatted: string): string => {
  // Espera formato XX.XXX.XXX-K. Si no matchea, fallback al masker generico.
  const match = formatted.match(/^(\d{1,2})\.(\d{3})\.(\d{3})-([\dK])$/i)

  if (!match) {
    return maskGenericDocument(formatted)
  }

  const [, , , last3, dv] = match

  return `xx.xxx.${last3}-${dv?.toUpperCase()}`
}

/**
 * Mascara generica: oculta todo salvo los ultimos 4 chars.
 * "ABC123456789" → "********6789"
 */
export const maskGenericDocument = (value: string): string => {
  if (value.length <= 4) {
    return '*'.repeat(value.length)
  }

  const visible = value.slice(-4)
  const masked = '*'.repeat(value.length - 4)

  return `${masked}${visible}`
}

/**
 * Dispatcher canonico: dado document_type + valor formateado, devuelve la
 * mascara legible que se persiste en `display_mask` y se devuelve por default
 * desde readers.
 */
export const formatDisplayMask = (
  documentType: PersonDocumentType,
  formattedValue: string
): string => {
  switch (documentType) {
    case 'CL_RUT':
      return maskClRut(formattedValue)
    default:
      return maskGenericDocument(formattedValue)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Address masking
// ──────────────────────────────────────────────────────────────────────────────

export interface AddressParts {
  streetLine1: string
  streetLine2?: string | null
  city: string
  region?: string | null
  postalCode?: string | null
  countryCode: string
}

/**
 * Texto presentable completo (used in document snapshots authorized).
 */
export const formatAddressPresentationText = (parts: AddressParts): string => {
  const segments = [
    parts.streetLine1.trim(),
    parts.streetLine2?.trim() || null,
    [parts.city.trim(), parts.region?.trim() || null].filter(Boolean).join(', '),
    parts.postalCode?.trim() || null,
    parts.countryCode.toUpperCase()
  ].filter((segment): segment is string => Boolean(segment))

  return segments.join(', ')
}

/**
 * Mascara presentable: ciudad + region + pais. NUNCA incluye street_line_1.
 */
export const formatAddressPresentationMask = (parts: AddressParts): string => {
  const cityRegion = [parts.city.trim(), parts.region?.trim() || null].filter(Boolean).join(', ')

  return [cityRegion, parts.countryCode.toUpperCase()].filter(Boolean).join(' · ')
}

// ──────────────────────────────────────────────────────────────────────────────
// Address type label (es-CL country-aware)
// ──────────────────────────────────────────────────────────────────────────────

const ADDRESS_TYPE_LABELS_ES_CL: Record<AddressType, string> = {
  legal: 'Direccion legal',
  residence: 'Residencia',
  mailing: 'Correspondencia',
  emergency: 'Contacto de emergencia'
}

export const labelAddressType = (type: AddressType): string =>
  ADDRESS_TYPE_LABELS_ES_CL[type] ?? type
