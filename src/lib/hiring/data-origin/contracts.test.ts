import { describe, expect, it } from 'vitest'

import {
  deriveApplicationDataOrigin,
  HIRING_DATA_ORIGIN_DEFAULT,
  HIRING_DATA_ORIGIN_VALUES,
  isHiringDataOrigin,
  isRealDataOrigin,
  isSyntheticDataOrigin,
  realOnlyPredicate,
  type HiringDataOrigin
} from './contracts'

describe('TASK-1739 — contrato de procedencia', () => {
  it('el enum es cerrado y su default es `real`', () => {
    expect([...HIRING_DATA_ORIGIN_VALUES]).toEqual(['real', 'synthetic_seed', 'smoke_test', 'demo'])
    expect(HIRING_DATA_ORIGIN_DEFAULT).toBe('real')
  })

  it('un valor desconocido, nulo o ausente se trata como REAL (nunca oculta un candidato)', () => {
    // La mitigación principal de la task: fallar hacia lo visible, jamás hacia lo invisible.
    for (const value of [null, undefined, '', 'synthetic', 'TEST', 42, {}]) {
      expect(isHiringDataOrigin(value)).toBe(false)
      expect(isRealDataOrigin(value)).toBe(true)
      expect(isSyntheticDataOrigin(value)).toBe(false)
    }
  })

  it('clasifica los tres valores no-real como sintéticos', () => {
    for (const value of ['synthetic_seed', 'smoke_test', 'demo'] satisfies HiringDataOrigin[]) {
      expect(isSyntheticDataOrigin(value)).toBe(true)
      expect(isRealDataOrigin(value)).toBe(false)
    }
  })

  it('el predicado de filtro se construye sobre el alias recibido', () => {
    expect(realOnlyPredicate('ha')).toBe("ha.data_origin = 'real'")
  })

  describe('derivación desde las dos raíces', () => {
    it('real + real → real (las cuatro combinaciones del criterio de aceptación)', () => {
      expect(deriveApplicationDataOrigin('real', 'real')).toBe('real')
    })

    it('gana el no-real cuando la persona es sintética', () => {
      expect(deriveApplicationDataOrigin('smoke_test', 'real')).toBe('smoke_test')
    })

    it('gana el no-real cuando la vacante es sintética', () => {
      // El caso vivo: una persona REAL que postula a una vacante de smoke.
      expect(deriveApplicationDataOrigin('real', 'smoke_test')).toBe('smoke_test')
    })

    it('ambas sintéticas e iguales → ese valor', () => {
      expect(deriveApplicationDataOrigin('demo', 'demo')).toBe('demo')
    })

    it('ambas sintéticas y distintas → gana la MÁS PROTECTORA, no la primera', () => {
      // Una derivada nunca queda sujeta a una purga más agresiva que la de sus raíces:
      // si una raíz es `demo` y debe sobrevivir, la derivada también.
      expect(deriveApplicationDataOrigin('smoke_test', 'demo')).toBe('demo')
      expect(deriveApplicationDataOrigin('demo', 'smoke_test')).toBe('demo')
      expect(deriveApplicationDataOrigin('smoke_test', 'synthetic_seed')).toBe('synthetic_seed')
      expect(deriveApplicationDataOrigin('synthetic_seed', 'smoke_test')).toBe('synthetic_seed')
    })

    it('es conmutativa: el orden de las raíces no cambia el resultado', () => {
      for (const a of HIRING_DATA_ORIGIN_VALUES) {
        for (const b of HIRING_DATA_ORIGIN_VALUES) {
          expect(deriveApplicationDataOrigin(a, b)).toBe(deriveApplicationDataOrigin(b, a))
        }
      }
    })

    it('una raíz ilegible degrada a real, nunca a sintético', () => {
      expect(deriveApplicationDataOrigin(null, 'real')).toBe('real')
      expect(deriveApplicationDataOrigin(undefined, undefined)).toBe('real')
      // Pero no borra una marca legítima de la otra raíz.
      expect(deriveApplicationDataOrigin(null, 'demo')).toBe('demo')
    })
  })
})
