import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import type { PreparedMeasurement } from './contracts'

type Envelope = PreparedMeasurement['encryptedPayload']

const keyBytes = (key: string) => {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('measurement_key_invalid')

  return Buffer.from(key, 'hex')
}

export const encryptMeasurementPayload = (payload: unknown, key: string, eventId: string): Envelope => {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(key), iv)

  cipher.setAAD(Buffer.from(`measurement-v1:${eventId}`))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])

  return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }
}

export const decryptMeasurementPayload = (envelope: Envelope, key: string, eventId: string): unknown => {
  if (envelope.v !== 1) throw new Error('measurement_envelope_invalid')
  const iv = Buffer.from(envelope.iv, 'base64')
  const tag = Buffer.from(envelope.tag, 'base64')

  if (iv.length !== 12 || tag.length !== 16) throw new Error('measurement_envelope_invalid')
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(key), iv)

  decipher.setAAD(Buffer.from(`measurement-v1:${eventId}`))
  decipher.setAuthTag(tag)

  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'))
}
