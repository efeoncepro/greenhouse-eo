import { describe, expect, it } from 'vitest'

import { decryptMeasurementPayload, encryptMeasurementPayload } from '../crypto'

const fixtureKey = 'ab'.repeat(32)

describe('durable matching encryption', () => {
  it('encrypts matching material and binds it to its event ID', () => {
    const payload = { meta: { 'x-fb-ud-em': '12'.repeat(32), ip_override: '192.0.2.1' } }
    const envelope = encryptMeasurementPayload(payload, fixtureKey, 'fixture-event')

    expect(JSON.stringify(envelope)).not.toContain('192.0.2.1')
    expect(decryptMeasurementPayload(envelope, fixtureKey, 'fixture-event')).toEqual(payload)
    expect(() => decryptMeasurementPayload(envelope, fixtureKey, 'another-event')).toThrow()
    expect(() => decryptMeasurementPayload(envelope, 'cd'.repeat(32), 'fixture-event')).toThrow()
  })
  it('uses independent nonces even for the same projection', () => {
    const first = encryptMeasurementPayload({}, fixtureKey, 'fixture-event')
    const second = encryptMeasurementPayload({}, fixtureKey, 'fixture-event')

    expect(first.iv).not.toBe(second.iv)
    expect(first.ciphertext).not.toBe(second.ciphertext)
  })
  it('rejects corrupt envelopes and malformed keys', () => {
    expect(() => encryptMeasurementPayload({}, 'invalid', 'fixture')).toThrow('measurement_key_invalid')
    const envelope = encryptMeasurementPayload({}, fixtureKey, 'fixture-event')

    expect(() => decryptMeasurementPayload({ ...envelope, tag: 'invalid' }, fixtureKey, 'fixture-event')).toThrow()
  })
})
