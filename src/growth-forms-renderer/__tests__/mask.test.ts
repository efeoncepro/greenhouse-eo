import { describe, expect, it } from 'vitest'

import type { RendererFieldDefinition } from '../contract'
import {
  formatNationalPhoneDisplay,
  formatPhoneClDisplay,
  formatPhoneDisplay,
  formatRutDisplay,
  formatUrlDisplay,
  maskOpsFor,
  nationalFromStored,
  parseE164,
  PHONE_COUNTRIES,
  resolveMaskKind,
  stripNationalDigits,
  stripPhone,
  stripPhoneCl,
  stripRut,
  stripUrl,
  toE164,
} from '../mask'

const field = (over: Partial<RendererFieldDefinition>): RendererFieldDefinition => ({
  key: 'x',
  type: 'text',
  ...over,
})

describe('growth-forms-renderer · mask', () => {
  it('formats and strips RUT regardless of input format', () => {
    expect(formatRutDisplay('123456789')).toBe('12.345.678-9')
    expect(formatRutDisplay('12.345.678-9')).toBe('12.345.678-9')
    expect(formatRutDisplay('12345678-K')).toBe('12.345.678-K')
    expect(stripRut('12.345.678-9')).toBe('123456789')
    expect(stripRut('12.345.678-k')).toBe('12345678K')
  })

  it('formats and strips CL phone regardless of input format', () => {
    expect(formatPhoneClDisplay('912345678')).toBe('+56 9 1234 5678')
    expect(formatPhoneClDisplay('+56912345678')).toBe('+56 9 1234 5678')
    expect(stripPhoneCl('+56 9 1234 5678')).toBe('+56912345678')
    expect(stripPhoneCl('912345678')).toBe('+56912345678')
  })

  it('formats and strips phone by country (E.164, HubSpot-style)', () => {
    // AR (calling code 54): groups the national number in legible triples.
    expect(stripPhone('1123456789', 'AR')).toBe('+541123456789')
    expect(formatPhoneDisplay('1123456789', 'AR')).toBe('+54 1 123 456 789')
    // MX (52), input already with +.
    expect(stripPhone('+52 55 1234 5678', 'MX')).toBe('+525512345678')
    // Already-prefixed digits are not duplicated.
    expect(stripPhone('5491123456789', 'AR')).toBe('+5491123456789')
    // Unknown country with explicit + is kept as E.164.
    expect(stripPhone('+34911223344', 'ES')).toBe('+34911223344')
    // Empty stays empty; a lone "+" guides the user without inventing digits.
    expect(stripPhone('', 'AR')).toBe('')
    expect(formatPhoneDisplay('+', 'AR')).toBe('+')
  })

  it('normalizes URL display by prepending https:// when missing', () => {
    expect(formatUrlDisplay('tuempresa.com')).toBe('https://tuempresa.com')
    expect(formatUrlDisplay('https://tuempresa.com')).toBe('https://tuempresa.com')
    expect(formatUrlDisplay('http://x.com')).toBe('http://x.com')
    expect(formatUrlDisplay('')).toBe('')
    expect(stripUrl('  tuempresa.com  ')).toBe('tuempresa.com')
  })

  it('detects mask kind by type/inputMode/key + national_id by country', () => {
    expect(resolveMaskKind(field({ type: 'tel' }))).toBe('phone')
    expect(resolveMaskKind(field({ type: 'text', inputMode: 'tel' }))).toBe('phone')
    expect(resolveMaskKind(field({ type: 'url' }))).toBe('url')
    expect(resolveMaskKind(field({ type: 'text', key: 'rut' }))).toBe('rut')
    // national_id: CL → RUT mask; other countries → no mask (honest passthrough).
    expect(resolveMaskKind(field({ type: 'national_id', validatorParams: { country: 'CL' } }))).toBe('rut')
    expect(resolveMaskKind(field({ type: 'national_id' }))).toBe('rut') // default country CL
    expect(resolveMaskKind(field({ type: 'national_id', validatorParams: { country: 'AR' } }))).toBe('none')
    expect(resolveMaskKind(field({ type: 'email' }))).toBe('none')
  })

  it('mask ops round-trip is idempotent for phone/rut (blur re-store safe)', () => {
    const phone = maskOpsFor(field({ type: 'tel', validatorParams: { country: 'CL' } }))
    const stored = phone.toStored('912345678')

    expect(stored).toBe('+56912345678')
    // blur re-store: toStored(toDisplay(stored)) === stored
    expect(phone.toStored(phone.toDisplay(stored))).toBe(stored)

    const rut = maskOpsFor(field({ type: 'national_id', validatorParams: { country: 'CL' } }))
    const rutStored = rut.toStored('12.345.678-9')

    expect(rutStored).toBe('123456789')
    expect(rut.toStored(rut.toDisplay(rutStored))).toBe(rutStored)
  })

  it('international phone field: country list, E.164 composition + national display', () => {
    // PHONE_COUNTRIES deriva de CALLING_CODES (SSOT) con CL primero.
    expect(PHONE_COUNTRIES[0].code).toBe('CL')
    expect(PHONE_COUNTRIES.find(c => c.code === 'MX')?.callingCode).toBe('52')
    expect(PHONE_COUNTRIES.every(c => c.flag.length > 0 && c.name.length > 0)).toBe(true)

    // toE164: país + nacional → E.164.
    expect(toE164('CL', '9 8765 4321')).toBe('+56987654321')
    expect(toE164('MX', '5512345678')).toBe('+525512345678')
    expect(toE164('CL', '')).toBe('')

    // display nacional: CL 1-4-4, otros tríos a la derecha.
    expect(formatNationalPhoneDisplay('987654321', 'CL')).toBe('9 8765 4321')
    expect(formatNationalPhoneDisplay('5512345678', 'MX')).toBe('5 512 345 678')
    expect(stripNationalDigits('9 8765 4321')).toBe('987654321')

    // nationalFromStored: quita el +CC del país.
    expect(nationalFromStored('+56987654321', 'CL')).toBe('987654321')
    expect(nationalFromStored('+525512345678', 'MX')).toBe('5512345678')
  })

  it('parseE164 detects country from a pasted +CC number (US wins +1 tie)', () => {
    expect(parseE164('+56 9 8765 4321')).toEqual({ country: 'CL', national: '987654321' })
    expect(parseE164('+52 55 1234 5678')).toEqual({ country: 'MX', national: '5512345678' })
    expect(parseE164('+1 415 555 0100')).toEqual({ country: 'US', national: '4155550100' })
    // sin "+" → null (se trata como número nacional).
    expect(parseE164('987654321')).toBeNull()
  })

  it('identity mask passes value through untouched', () => {
    const ops = maskOpsFor(field({ type: 'text', key: 'name' }))

    expect(ops.toDisplay('Acme S.A.')).toBe('Acme S.A.')
    expect(ops.toStored('Acme S.A.')).toBe('Acme S.A.')
  })
})
