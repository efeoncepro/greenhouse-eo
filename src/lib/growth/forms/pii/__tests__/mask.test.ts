import { describe, expect, it } from 'vitest'

import { maskEmail, maskGeneric, maskNationalId, maskPhone } from '../mask'

describe('TASK-1255 — PII masking (puro)', () => {
  describe('maskEmail', () => {
    it('enmascara el local salvo el primer char, preserva el dominio', () => {
      expect(maskEmail('juan.perez@acme.com')).toBe('j***@acme.com')
      expect(maskEmail('a@acme.com')).toBe('a***@acme.com')
    })

    it('cae al masker genérico si no parsea como email', () => {
      expect(maskEmail('no-es-email')).toBe('*******mail')
    })

    it('NUNCA expone el email completo', () => {
      const out = maskEmail('confidencial@empresa.cl')

      expect(out).not.toBe('confidencial@empresa.cl')
      expect(out).not.toContain('confidencial')
    })
  })

  describe('maskPhone', () => {
    it('conserva últimos 3 dígitos + el + líder', () => {
      expect(maskPhone('+56912345678')).toBe('+********678')
      expect(maskPhone('912345678')).toBe('******678')
    })

    it('NUNCA expone el teléfono completo', () => {
      expect(maskPhone('+56987654321')).not.toContain('987654')
    })
  })

  describe('maskNationalId', () => {
    it('CL: formatea y enmascara salvo últimos 3 + DV', () => {
      // 11.111.111-1 canónico = 111111111
      expect(maskNationalId('111111111', 'CL')).toBe('xx.xxx.111-1')
      expect(maskNationalId('12.345.678-5', 'CL')).toBe('xx.xxx.678-5')
    })

    it('país no-CL: masker genérico sobre el valor canónico', () => {
      expect(maskNationalId('AB123456', 'AR')).toBe('****3456')
    })

    it('NUNCA expone la cédula completa', () => {
      const out = maskNationalId('111111111', 'CL')

      expect(out).not.toContain('11111111')
    })

    it('vacío → string vacío', () => {
      expect(maskNationalId('', 'CL')).toBe('')
    })
  })

  describe('maskGeneric', () => {
    it('oculta todo salvo los últimos N', () => {
      expect(maskGeneric('ABCDEFGH', 4)).toBe('****EFGH')
      expect(maskGeneric('AB', 4)).toBe('**')
    })
  })
})
