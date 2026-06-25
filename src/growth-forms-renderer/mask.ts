/**
 * TASK-1231 — Growth Forms portable renderer · máscaras CL forgiving (display vs stored).
 *
 * Piso `forms-ux`: aceptar el input en cualquier formato, mostrar enmascarado, y
 * **enviar/validar el valor crudo**. El contract no expone hint de máscara hoy
 * (`normalizeWith` es server-only), así que el renderer deriva la máscara de display
 * por `type` + `inputMode` de forma determinista. El server sigue siendo la autoridad
 * de normalización/validación (Arch §11, §11.1).
 */
import type { RendererFieldDefinition } from './contract'

export type MaskKind = 'none' | 'rut' | 'phone_cl'

/**
 * Deriva la máscara de display de un campo. Determinista y documentada:
 * - `tel` + `inputMode=tel`  → teléfono CL.
 * - `text` cuyo `key`/`autocomplete` sugiere RUT → RUT CL.
 * Nunca infiere máscara para email/url/number (esos tienen su propio teclado/typing).
 */
export const resolveMaskKind = (field: RendererFieldDefinition): MaskKind => {
  if (field.type === 'tel' || field.inputMode === 'tel') return 'phone_cl'

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

/** Display "+56 9 1234 5678" desde cualquier input. */
export const formatPhoneClDisplay = (value: string): string => {
  let digits = value.replace(/\D/g, '')

  if (digits.startsWith('56')) digits = digits.slice(2)
  if (digits.length === 0) return value.trim().startsWith('+') ? '+56 ' : ''

  const a = digits.slice(0, 1)
  const b = digits.slice(1, 5)
  const c = digits.slice(5, 9)

  return `+56 ${a}${b ? ` ${b}` : ''}${c ? ` ${c}` : ''}`.trim()
}

/** Valor crudo a enviar para teléfono CL: "+56912345678" (E.164-ish, sin espacios). */
export const stripPhoneCl = (value: string): string => {
  let digits = value.replace(/\D/g, '')

  if (digits.startsWith('56')) digits = digits.slice(2)
  if (digits.length === 0) return ''

  return `+56${digits.slice(0, 9)}`
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
    case 'phone_cl':
      return { toDisplay: formatPhoneClDisplay, toStored: stripPhoneCl }
    default:
      return IDENTITY
  }
}
