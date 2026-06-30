import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearSecretManagerResolutionCache } from '@/lib/secrets/secret-manager'

import type { FieldDefinition } from '../../contracts'
import {
  decryptNationalId,
  encryptNationalId,
  isPiiEncryptionKeyConfigured,
  PII_ENCRYPTION_KEY_ENV,
  splitAndEncryptPii,
} from '../encryption'
import { isEncryptedFieldEnvelope } from '../types'

// Key de test: 32 bytes (256-bit) en base64. NO es la key productiva.
const TEST_KEY = Buffer.from(new Uint8Array(32).fill(7)).toString('base64')

describe('TASK-1255 — cifrado at-rest national_id (AES-256-GCM)', () => {
  beforeEach(() => {
    clearSecretManagerResolutionCache()
    vi.stubEnv(PII_ENCRYPTION_KEY_ENV, TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    clearSecretManagerResolutionCache()
  })

  it('round-trip: cifra y descifra al valor original', async () => {
    const envelope = await encryptNationalId('111111111', 'CL')

    expect(isEncryptedFieldEnvelope(envelope)).toBe(true)
    expect(envelope.alg).toBe('aes-256-gcm')
    expect(await decryptNationalId(envelope)).toBe('111111111')
  })

  it('el envelope NUNCA contiene el valor en claro; trae mask precomputado', async () => {
    const envelope = await encryptNationalId('111111111', 'CL')

    expect(envelope.ciphertext).not.toContain('111111111')
    expect(JSON.stringify(envelope)).not.toContain('111111111')
    expect(envelope.mask).toBe('xx.xxx.111-1')
  })

  it('IV aleatorio: dos cifrados del mismo valor producen ciphertext distinto', async () => {
    const a = await encryptNationalId('111111111', 'CL')
    const b = await encryptNationalId('111111111', 'CL')

    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('descifrar un envelope manipulado (tag inválido) falla sanitizado', async () => {
    const envelope = await encryptNationalId('111111111', 'CL')
    const tampered = { ...envelope, ciphertext: Buffer.from('otro-valor').toString('base64') }

    await expect(decryptNationalId(tampered)).rejects.toMatchObject({ reason: 'decrypt_failed' })
  })

  it('sin key configurada → throw explícito (NUNCA degrada a sin-cifrado)', async () => {
    vi.unstubAllEnvs()
    clearSecretManagerResolutionCache()

    await expect(encryptNationalId('111111111', 'CL')).rejects.toMatchObject({
      reason: 'encryption_key_unconfigured',
    })
    expect(await isPiiEncryptionKeyConfigured()).toBe(false)
  })

  describe('splitAndEncryptPii', () => {
    const fields = [
      { key: 'email', type: 'email' },
      { key: 'rut', type: 'national_id', validatorParams: { country: 'CL' } },
      { key: 'company', type: 'text' },
    ] as unknown as FieldDefinition[]

    it('saca national_id del blob en claro y lo cifra', async () => {
      const { remaining, encrypted } = await splitAndEncryptPii(fields, {
        email: 'juan@acme.com',
        rut: '111111111',
        company: 'ACME',
      })

      // La cédula salió del blob en claro (boundary).
      expect(remaining).not.toHaveProperty('rut')
      expect(remaining.email).toBe('juan@acme.com')
      expect(remaining.company).toBe('ACME')

      // Y vive cifrada.
      expect(isEncryptedFieldEnvelope(encrypted.rut)).toBe(true)
      expect(await decryptNationalId(encrypted.rut!)).toBe('111111111')
    })

    it('sin campos national_id → no cifra nada', async () => {
      const { remaining, encrypted } = await splitAndEncryptPii(
        [{ key: 'email', type: 'email' }] as unknown as FieldDefinition[],
        { email: 'x@y.com' },
      )

      expect(encrypted).toEqual({})
      expect(remaining.email).toBe('x@y.com')
    })

    it('national_id vacío → no cifra (nada que proteger)', async () => {
      const { remaining, encrypted } = await splitAndEncryptPii(fields, { email: 'x@y.com', rut: '' })

      expect(encrypted).toEqual({})
      expect(remaining.rut).toBe('')
    })
  })
})
