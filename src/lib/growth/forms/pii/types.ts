/**
 * TASK-1255 — Growth Forms PII Hardening (Ley 21.719) · tipos compartidos.
 *
 * Browser-safe: NUNCA importar `server-only` / `node:*` aquí (lo consume el
 * masked-reader server-only Y, potencialmente, contratos isomórficos).
 */
import type { FieldType } from '../contracts'

/**
 * Clase PII efectiva de un campo, derivada del `FieldDefinition` (TASK-1253
 * `FIELD_TYPES`). Gobierna masking + cifrado + reveal:
 *  - `national_id`: cédula → cifrado at-rest (AES-256-GCM), reveal gobernado.
 *  - `email` / `phone`: PII que SÍ viaja a downstream (HubSpot) → claro + masked en admin.
 *  - `contact`: otra PII de contacto en claro (free_text marcado, etc.) → masked en admin.
 *  - `non_pii`: público (company, select, etc.) → sin masking.
 */
export type PiiFieldClass = 'national_id' | 'email' | 'phone' | 'contact' | 'non_pii'

/**
 * Envelope cifrado de un valor `national_id`, almacenado en
 * `form_submission.encrypted_fields_json[fieldKey]`. El `mask` precomputado evita
 * descifrar en cada render del cockpit (solo el reveal gobernado descifra).
 * NUNCA contiene el valor en claro.
 */
export interface EncryptedFieldEnvelope {
  /** Versión del envelope (para rotación/migración futura). */
  v: 1
  /** Algoritmo. Hoy siempre `aes-256-gcm`. */
  alg: 'aes-256-gcm'
  /** Ciphertext en base64. */
  ciphertext: string
  /** IV aleatorio (12 bytes) en base64. */
  iv: string
  /** Auth tag GCM (16 bytes) en base64. */
  tag: string
  /** Máscara legible precomputada (p.ej. `xx.xxx.678-K`). NO sensible. */
  mask: string
  /** País ISO alpha-2 usado para formatear/normalizar (default `CL`). */
  country: string
}

/** Type guard: ¿este valor de `encrypted_fields_json[key]` es un envelope válido? */
export const isEncryptedFieldEnvelope = (value: unknown): value is EncryptedFieldEnvelope => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>

  return (
    v.v === 1 &&
    v.alg === 'aes-256-gcm' &&
    typeof v.ciphertext === 'string' &&
    typeof v.iv === 'string' &&
    typeof v.tag === 'string' &&
    typeof v.mask === 'string' &&
    typeof v.country === 'string'
  )
}

/** Campo de un lead, enmascarado por default (consumido por cockpit/Nexa/MCP). */
export interface MaskedLeadField {
  key: string
  label: string | null
  type: FieldType
  piiClass: PiiFieldClass
  /** Display enmascarado (o el valor en claro si `piiClass === 'non_pii'`). null si vacío. */
  maskedValue: string | null
  /** true si el valor full vive cifrado (national_id) y requiere reveal gobernado. */
  isEncrypted: boolean
  /** true si hay un valor full revelable (PII con reveal disponible). */
  isRevealable: boolean
}

/** Vista enmascarada de un lead. El primitive masked-por-default (un primitive, muchos consumers). */
export interface MaskedLeadView {
  submissionId: string
  formId: string
  formVersionId: string
  fields: MaskedLeadField[]
  createdAt: string
}
