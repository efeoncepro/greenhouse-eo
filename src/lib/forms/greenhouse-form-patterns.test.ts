import { describe, expect, it } from 'vitest'

import { required, email, minLength, dateInFuture } from './greenhouse-form-patterns'

describe('greenhouse form patterns', () => {
  describe('required', () => {
    it('passes for non-empty string', () => {
      expect(required()('hello')).toBe(true)
    })

    it('fails for empty string', () => {
      expect(required()('')).toBe('Campo requerido')
    })

    it('fails for whitespace-only string', () => {
      expect(required()('   ')).toBe('Campo requerido')
    })

    it('uses custom label in error message', () => {
      expect(required('Email')('')).toBe('Email requerido')
    })
  })

  describe('email', () => {
    it('passes for valid email', () => {
      expect(email('user@example.com')).toBe(true)
    })

    it('fails for missing @', () => {
      expect(email('userexample.com')).toBe('Correo no válido')
    })

    it('fails for missing domain', () => {
      expect(email('user@')).toBe('Correo no válido')
    })

    it('trims whitespace before validation', () => {
      expect(email('  user@example.com  ')).toBe(true)
    })
  })

  describe('minLength', () => {
    it('passes when string meets minimum', () => {
      expect(minLength(3)('abc')).toBe(true)
    })

    it('fails when string is too short', () => {
      expect(minLength(8)('short')).toBe('Mínimo 8 caracteres')
    })

    it('trims before checking length', () => {
      expect(minLength(5)('  ab  ')).toBe('Mínimo 5 caracteres')
    })
  })

  describe('dateInFuture', () => {
    it('passes for future date', () => {
      const tomorrow = new Date(Date.now() + 86_400_000)

      expect(dateInFuture(tomorrow)).toBe(true)
    })

    it('fails for past date', () => {
      const yesterday = new Date(Date.now() - 86_400_000)

      expect(dateInFuture(yesterday)).toBe('La fecha debe ser futura')
    })

    it('fails for null', () => {
      expect(dateInFuture(null)).toBe('Selecciona una fecha')
    })
  })
})
