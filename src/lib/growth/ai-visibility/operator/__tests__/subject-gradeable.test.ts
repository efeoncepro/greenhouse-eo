import { describe, expect, it } from 'vitest'

/**
 * TASK-1291 Slice 1 — SoT del gate del operador.
 *
 * Cubre la matriz prospecto/cliente × categoría/modelo resuelto, y que el predicado de categoría
 * sea el mismo de TASK-1288 (umbral de confianza), no una noción paralela.
 */

import { assertSubjectGradeable, isBusinessModelConfirmed } from '../subject-gradeable'

// Un nodo de categoría real con confianza suficiente (sector airlines, TASK-1288).
const RESOLVED_CATEGORY = {
  categoryNodeId: 'sector:passenger_airlines',
  categoryConfidence: 0.9
}

describe('isBusinessModelConfirmed', () => {
  it('true sólo para un modelo real (≠ unknown/null/vacío)', () => {
    expect(isBusinessModelConfirmed('consumer_b2c')).toBe(true)
    expect(isBusinessModelConfirmed('b2b_service_provider')).toBe(true)
    expect(isBusinessModelConfirmed('unknown')).toBe(false)
    expect(isBusinessModelConfirmed(null)).toBe(false)
    expect(isBusinessModelConfirmed('  ')).toBe(false)
  })
})

describe('assertSubjectGradeable — prospecto (estricto: categoría + modelo)', () => {
  it('categoría resuelta + modelo confirmado → ok', () => {
    expect(
      assertSubjectGradeable({ ...RESOLVED_CATEGORY, businessModel: 'consumer_b2c', audience: 'prospect' })
    ).toEqual({ ok: true })
  })

  it('categoría no resuelta → bloqueo category_unresolved (gana sobre el modelo)', () => {
    expect(
      assertSubjectGradeable({
        categoryNodeId: 'unknown',
        businessModel: 'consumer_b2c',
        audience: 'prospect'
      })
    ).toEqual({ ok: false, reason: 'category_unresolved' })
  })

  it('categoría resuelta pero modelo unknown → bloqueo business_model_unconfirmed', () => {
    expect(
      assertSubjectGradeable({ ...RESOLVED_CATEGORY, businessModel: 'unknown', audience: 'prospect' })
    ).toEqual({ ok: false, reason: 'business_model_unconfirmed' })
  })

  it('categoría resuelta pero modelo null → bloqueo business_model_unconfirmed', () => {
    expect(
      assertSubjectGradeable({ ...RESOLVED_CATEGORY, businessModel: null, audience: 'prospect' })
    ).toEqual({ ok: false, reason: 'business_model_unconfirmed' })
  })

  it('categoría con confianza baja → bloqueo (mismo umbral que TASK-1288)', () => {
    expect(
      assertSubjectGradeable({
        categoryNodeId: 'sector:passenger_airlines',
        categoryConfidence: 0.1,
        businessModel: 'consumer_b2c',
        audience: 'prospect'
      })
    ).toEqual({ ok: false, reason: 'category_unresolved' })
  })
})

describe('assertSubjectGradeable — cliente (categoría basta)', () => {
  it('categoría resuelta + modelo unknown → ok (la relación legitima el envío)', () => {
    expect(
      assertSubjectGradeable({ ...RESOLVED_CATEGORY, businessModel: 'unknown', audience: 'client' })
    ).toEqual({ ok: true })
  })

  it('categoría no resuelta → bloqueo aunque sea cliente', () => {
    expect(
      assertSubjectGradeable({ categoryNodeId: 'unknown', businessModel: 'unknown', audience: 'client' })
    ).toEqual({ ok: false, reason: 'category_unresolved' })
  })
})
