/**
 * TASK-1231 / TASK-1256 — Growth Forms portable renderer · máscaras forgiving (display vs stored).
 *
 * Piso `forms-ux`: aceptar el input en cualquier formato, mostrar enmascarado, y
 * **enviar/validar el valor crudo (normalizado canónico)**. El server sigue siendo la
 * autoridad de validación/normalización (Arch §11, §11.1); la máscara es UX.
 *
 * TASK-1256 (Slice 1) generaliza la máscara de teléfono a E.164 **por país** (estilo
 * HubSpot, derivada de `validatorParams.country`), reconoce el field type `national_id`
 * (TASK-1253) — RUT sólo para CL — y normaliza URL on-blur (antepone `https://`). La lista
 * de países soportados es SSOT: `CALLING_CODES` del validator registry canónico (mismo
 * módulo isomórfico que ya usa el renderer), nunca una copia local. Países sin máscara
 * dedicada degradan honesto a passthrough (sin máscara falsa que confunda).
 */
import { CALLING_CODES } from '@/lib/growth/forms/validators/core'

import type { RendererFieldDefinition } from './contract'

export type MaskKind = 'none' | 'rut' | 'phone' | 'url'

const DEFAULT_COUNTRY = 'CL'

/** País ISO alpha-2 efectivo del campo (default CL), normalizado a mayúsculas. */
const resolveFieldCountry = (field: RendererFieldDefinition): string =>
  (field.validatorParams?.country ?? DEFAULT_COUNTRY).toUpperCase()

/**
 * Deriva la máscara de display de un campo. Determinista y documentada:
 * - `tel` / `inputMode=tel`        → teléfono E.164 por país.
 * - `url` / `inputMode=url`        → normalización de URL (antepone scheme on-blur).
 * - `national_id` (CL)             → RUT; otros países → sin máscara (passthrough honesto).
 * - `text` cuyo `key`/`autocomplete` sugiere RUT/tax-id → RUT (heurística legacy CL).
 * Nunca infiere máscara para email/number (tienen su propio teclado/typing).
 */
export const resolveMaskKind = (field: RendererFieldDefinition): MaskKind => {
  if (field.type === 'tel' || field.inputMode === 'tel') return 'phone'
  if (field.type === 'url' || field.inputMode === 'url') return 'url'

  if (field.type === 'national_id') {
    // La máscara de cédula es por país; hoy sólo CL (RUT) tiene formato de display.
    return resolveFieldCountry(field) === 'CL' ? 'rut' : 'none'
  }

  const hay = `${field.key} ${field.autocomplete ?? ''}`.toLowerCase()

  if (field.type === 'text' && /\brut\b|nationalid|tax[_-]?id/.test(hay)) return 'rut'

  return 'none'
}

/** Display "12.345.678-9" desde cualquier input. NO valida el dígito verificador. */
export const formatRutDisplay = (value: string): string => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase()

  if (clean.length < 2) return clean
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return `${dotted}-${dv}`
}

/** Valor crudo a enviar: "123456789" / "12345678K" (sin puntos ni guión). */
export const stripRut = (value: string): string => value.replace(/[^0-9kK]/g, '').toUpperCase()

/**
 * Valor crudo a enviar para teléfono: "+<cc><nacional>" (E.164-ish). Espeja la
 * normalización de `validateE164Phone` del registry canónico: si el input no trae `+`,
 * prefija el calling code del país (default CL) salvo que ya empiece con él. Sin `libphonenumber`
 * (el renderer es bundle-light) → no valida largo per-país; el server lo valida.
 */
export const stripPhone = (value: string, country: string = DEFAULT_COUNTRY): string => {
  const input = value.trim()

  if (input === '') return ''

  const hasPlus = input.startsWith('+')
  let digits = input.replace(/\D/g, '')

  if (digits === '') return ''

  if (!hasPlus) {
    const cc = CALLING_CODES[country.toUpperCase()] ?? ''

    if (cc && !digits.startsWith(cc)) digits = `${cc}${digits}`
  }

  return `+${digits}`
}

/**
 * Display por país desde cualquier input. CL conserva la forma móvil familiar
 * "+56 9 1234 5678"; el resto agrupa el número nacional en tríos legibles
 * ("+54 911 234 5678"). Per-país rico (libphonenumber) = follow-up declarado.
 */
export const formatPhoneDisplay = (value: string, country: string = DEFAULT_COUNTRY): string => {
  const cc = country.toUpperCase()
  const e164 = stripPhone(value, cc)

  if (e164 === '') return value.trim().startsWith('+') ? '+' : ''

  if (cc === 'CL' && e164.startsWith('+56')) {
    const rest = e164.slice(3)
    const a = rest.slice(0, 1)
    const b = rest.slice(1, 5)
    const c = rest.slice(5, 9)

    return `+56 ${a}${b ? ` ${b}` : ''}${c ? ` ${c}` : ''}`.trim()
  }

  const callingCode = CALLING_CODES[cc] ?? ''

  if (callingCode && e164.startsWith(`+${callingCode}`)) {
    const national = e164.slice(callingCode.length + 1)
    // Agrupa el número nacional en tríos alineados a la derecha (legible, sin dígito
    // suelto final): "1123456789" → "1 123 456 789".
    const grouped = national.replace(/\B(?=(\d{3})+$)/g, ' ')

    return `+${callingCode}${grouped ? ` ${grouped}` : ''}`.trim()
  }

  return e164
}

/** CL helpers (back-compat + implementación CL). Display "+56 9 1234 5678". */
export const formatPhoneClDisplay = (value: string): string => formatPhoneDisplay(value, 'CL')

/** CL helper (back-compat). Valor crudo "+56912345678". */
export const stripPhoneCl = (value: string): string => stripPhone(value, 'CL')

/** Valor crudo de URL: trim (el server normaliza/valida; el display antepone scheme). */
export const stripUrl = (value: string): string => value.trim()

/**
 * Display de URL on-blur: si hay valor sin scheme, antepone `https://` para que el
 * usuario vea la URL normalizada (guía). Vacío → vacío (no inventa scheme). Espeja la
 * normalización de `validateUrl` del registry.
 */
export const formatUrlDisplay = (value: string): string => {
  const v = value.trim()

  if (v === '') return ''
  if (/^https?:\/\//i.test(v)) return v

  return `https://${v}`
}

export interface MaskOps {
  /** Texto que se muestra en el input. */
  toDisplay: (value: string) => string
  /** Valor crudo que se persiste/envía/valida. */
  toStored: (value: string) => string
}

const IDENTITY: MaskOps = { toDisplay: v => v, toStored: v => v }

export const maskOpsFor = (field: RendererFieldDefinition): MaskOps => {
  switch (resolveMaskKind(field)) {
    case 'rut':
      return { toDisplay: formatRutDisplay, toStored: stripRut }

    case 'phone': {
      const country = resolveFieldCountry(field)

      return { toDisplay: value => formatPhoneDisplay(value, country), toStored: value => stripPhone(value, country) }
    }

    case 'url':
      // toStored es trim; el display (on-blur) antepone scheme y el blur re-almacena
      // el display (ver `wireText`) → la URL enviada queda con `https://`.
      return { toDisplay: formatUrlDisplay, toStored: stripUrl }
    default:
      return IDENTITY
  }
}
