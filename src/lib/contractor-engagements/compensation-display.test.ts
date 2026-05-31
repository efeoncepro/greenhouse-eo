import { describe, expect, it } from 'vitest'

import {
  CADENCE_OPTIONS,
  RATE_TYPE_OPTIONS,
  cadenceLabel,
  cadencePaymentUnitLabel,
  rateTypeLabel
} from './compensation-display'

describe('compensation-display', () => {
  it('maps rate_type to es-CL labels', () => {
    expect(rateTypeLabel('fixed')).toBe('Fija')
    expect(rateTypeLabel('hourly')).toBe('Por hora')
    expect(RATE_TYPE_OPTIONS).toHaveLength(6)
  })

  it('maps cadence to es-CL labels', () => {
    expect(cadenceLabel('monthly')).toBe('Mensual')
    expect(cadenceLabel('biweekly')).toBe('Quincenal')
    expect(CADENCE_OPTIONS).toHaveLength(7)
  })

  it('maps cadence to the per-payment unit', () => {
    expect(cadencePaymentUnitLabel('monthly')).toBe('mes')
    expect(cadencePaymentUnitLabel('weekly')).toBe('semana')
    expect(cadencePaymentUnitLabel('milestone')).toBe('hito')
    expect(cadencePaymentUnitLabel('on_invoice')).toBe('pago')
  })
})
