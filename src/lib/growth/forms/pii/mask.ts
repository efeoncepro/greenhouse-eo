/**
 * TASK-1255 — Growth Forms PII masking (browser-safe, puro).
 *
 * Máscaras de display por default para el cockpit admin. NUNCA revelan el valor
 * completo: email `j***@dominio`, teléfono/cédula parcial. El valor full solo se
 * obtiene por el reveal gobernado (capability + reason + audit).
 *
 * NUNCA importar `server-only` / `node:*` aquí. Sólo el core isomórfico de
 * identity-documents (para formatear el RUT antes de enmascararlo).
 */
import { validateNationalIdByCountry } from '@/lib/identity-documents'

/** Oculta todo salvo los últimos `visibleCount` chars. `"ABCDEFGH" → "****EFGH"`. */
export const maskGeneric = (value: string, visibleCount = 4): string => {
  if (value.length <= visibleCount) return '*'.repeat(value.length)

  return `${'*'.repeat(value.length - visibleCount)}${value.slice(-visibleCount)}`
}

/**
 * Email: primer char del local + `***` + `@dominio`.
 *   `juan.perez@acme.com` → `j***@acme.com`
 *   `a@acme.com`          → `*@acme.com`
 * Si no parsea como email, cae al masker genérico.
 */
export const maskEmail = (raw: string): string => {
  const value = raw.trim()
  const at = value.lastIndexOf('@')

  if (at <= 0 || at === value.length - 1) return maskGeneric(value)

  const local = value.slice(0, at)
  const domain = value.slice(at) // incluye '@'
  const firstChar = local[0] ?? ''

  return `${firstChar}***${domain}`
}

/**
 * Teléfono: conserva los últimos 3 dígitos, enmascara el resto, preservando un
 * `+` líder si existe. `+56912345678` → `+*********678`.
 */
export const maskPhone = (raw: string): string => {
  const value = raw.trim()
  const hasPlus = value.startsWith('+')
  const digits = value.replace(/\D/g, '')

  if (digits.length <= 3) return `${hasPlus ? '+' : ''}${'*'.repeat(digits.length)}`

  const masked = `${'*'.repeat(digits.length - 3)}${digits.slice(-3)}`

  return `${hasPlus ? '+' : ''}${masked}`
}

/**
 * National ID (cédula): formatea por país (CL → `12.345.678-K`) y enmascara todo
 * salvo los últimos 3 dígitos + DV. `111111111` (CL) → `xx.xxx.111-1`.
 * Para países sin formato dedicado, masker genérico sobre el valor canónico.
 */
export const maskNationalId = (raw: string, country = 'CL'): string => {
  const value = raw.trim()

  if (value.length === 0) return ''

  const cc = (country || 'CL').trim().toUpperCase()
  const result = validateNationalIdByCountry(cc, value)
  const formatted = result.formatted || value

  // CL: `12.345.678-K` → `xx.xxx.678-K` (últimos 3 + DV visibles).
  const clMatch = formatted.match(/^(\d{1,3})\.(\d{3})\.(\d{3})-([\dkK])$/)

  if (cc === 'CL' && clMatch) {
    const [, , , last3, dv] = clMatch

    return `xx.xxx.${last3}-${dv?.toUpperCase()}`
  }

  return maskGeneric(formatted, 4)
}
