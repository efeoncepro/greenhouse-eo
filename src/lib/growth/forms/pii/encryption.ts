import 'server-only'

/**
 * TASK-1255 — Cifrado at-rest de national_id (cédula) · Slice 2.
 *
 * AES-256-GCM application-layer con IV aleatorio por valor (12 bytes) + auth tag
 * (16 bytes) almacenados en el envelope junto al ciphertext. La key (256-bit,
 * base64) se resuelve desde GCP Secret Manager vía `GROWTH_FORMS_PII_ENCRYPTION_KEY_SECRET_REF`
 * (o el env directo `GROWTH_FORMS_PII_ENCRYPTION_KEY` para local/test).
 *
 * Invariantes:
 *  - national_id NUNCA se persiste/loggea en claro: vive sólo como envelope cifrado.
 *  - El `mask` precomputado (no sensible) evita descifrar en cada lectura del cockpit.
 *  - La key se conserva (descifrar siempre posible → rollback del flag sin pérdida).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { resolveSecret } from '@/lib/secrets/secret-manager'

import type { FieldDefinition } from '../contracts'

import { resolveFieldCountry, resolvePiiFieldKeys } from './classify'
import { GrowthFormsPiiError } from './errors'
import { maskNationalId } from './mask'
import type { EncryptedFieldEnvelope } from './types'

const ALGORITHM = 'aes-256-gcm' as const
const IV_BYTES = 12
const KEY_BYTES = 32

export const PII_ENCRYPTION_KEY_ENV = 'GROWTH_FORMS_PII_ENCRYPTION_KEY'

/**
 * Resuelve la key de cifrado (32 bytes) desde Secret Manager / env. Throw explícito
 * si no está configurada o tiene largo inválido — NUNCA degrada a "sin cifrado"
 * silencioso (eso dejaría PII en claro creyendo estar cifrada).
 */
const resolveEncryptionKey = async (): Promise<Buffer> => {
  const resolution = await resolveSecret({ envVarName: PII_ENCRYPTION_KEY_ENV })

  if (!resolution.value) {
    throw new GrowthFormsPiiError(
      'Growth Forms PII encryption key no configurada.',
      'encryption_key_unconfigured',
      503,
    )
  }

  let key: Buffer

  try {
    key = Buffer.from(resolution.value, 'base64')
  } catch {
    throw new GrowthFormsPiiError('Growth Forms PII encryption key inválida.', 'encryption_key_invalid', 503)
  }

  if (key.length !== KEY_BYTES) {
    throw new GrowthFormsPiiError(
      `Growth Forms PII encryption key debe ser ${KEY_BYTES} bytes (256-bit).`,
      'encryption_key_invalid',
      503,
    )
  }

  return key
}

/** ¿Hay key de cifrado configurada y válida? (preflight para el rollout gate). */
export const isPiiEncryptionKeyConfigured = async (): Promise<boolean> => {
  try {
    await resolveEncryptionKey()

    return true
  } catch {
    return false
  }
}

/** Cifra un valor national_id en claro → envelope (con mask precomputado). */
export const encryptNationalId = async (plaintext: string, country = 'CL'): Promise<EncryptedFieldEnvelope> => {
  const key = await resolveEncryptionKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    v: 1,
    alg: ALGORITHM,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    mask: maskNationalId(plaintext, country),
    country,
  }
}

/** Descifra un envelope → valor national_id en claro. Throw si el auth tag no valida. */
export const decryptNationalId = async (envelope: EncryptedFieldEnvelope): Promise<string> => {
  const key = await resolveEncryptionKey()

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, 'base64'))

    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'))

    return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString(
      'utf8',
    )
  } catch {
    // NUNCA propagar el error crudo de crypto (puede insinuar key/tag). Sanitizado.
    throw new GrowthFormsPiiError('No fue posible descifrar el dato.', 'decrypt_failed', 500)
  }
}

export interface SplitEncryptResult {
  /** normalized_fields_json SIN los national_id (salieron del blob en claro). */
  remaining: Record<string, unknown>
  /** Map fieldKey → envelope cifrado (para encrypted_fields_json). */
  encrypted: Record<string, EncryptedFieldEnvelope>
}

/**
 * Separa los campos national_id del blob normalizado, los cifra, y devuelve el blob
 * restante (sin cédula en claro) + el map cifrado. Boundary: tras esto, el dispatcher
 * (que lee `remaining`/normalized_fields_json) ya no puede ver la cédula.
 *
 * Campos national_id vacíos/no-string se dejan pasar tal cual en `remaining` (nada que
 * cifrar) — salvo que no haya valor, en cuyo caso simplemente no se cifran.
 */
export const splitAndEncryptPii = async (
  fields: FieldDefinition[],
  normalizedFields: Record<string, unknown>,
): Promise<SplitEncryptResult> => {
  const groups = resolvePiiFieldKeys(fields)

  if (groups.nationalId.length === 0) {
    return { remaining: { ...normalizedFields }, encrypted: {} }
  }

  const countryByKey = new Map(groups.nationalId.map(n => [n.key, n.country]))
  const remaining: Record<string, unknown> = { ...normalizedFields }
  const encrypted: Record<string, EncryptedFieldEnvelope> = {}

  for (const { key } of groups.nationalId) {
    const value = remaining[key]

    if (typeof value !== 'string' || value.trim() === '') continue

    encrypted[key] = await encryptNationalId(value, countryByKey.get(key) ?? resolveFieldCountry({ validatorParams: { country: 'CL' } }))
    delete remaining[key]
  }

  return { remaining, encrypted }
}
