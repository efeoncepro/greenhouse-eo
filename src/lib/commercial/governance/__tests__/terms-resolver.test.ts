import { describe, expect, it } from 'vitest'

import { resolveTermVariables } from '../terms-store'

describe('resolveTermVariables', () => {
  it('replaces payment_terms_days with the numeric value', () => {
    const result = resolveTermVariables('Pago a {{payment_terms_days}} dias.', {
      paymentTermsDays: 45
    })

    expect(result).toBe('Pago a 45 dias.')
  })

  it('replaces contract_duration with "{n} meses"', () => {
    const result = resolveTermVariables('Duracion: {{contract_duration}}', {
      contractDurationMonths: 12
    })

    expect(result).toBe('Duracion: 12 meses')
  })

  it('maps billing_frequency codes to Spanish labels', () => {
    expect(resolveTermVariables('Facturacion {{billing_frequency}}', { billingFrequency: 'monthly' })).toBe(
      'Facturacion mensual'
    )
    expect(resolveTermVariables('Facturacion {{billing_frequency}}', { billingFrequency: 'milestone' })).toBe(
      'Facturacion por hito'
    )
    expect(resolveTermVariables('Facturacion {{billing_frequency}}', { billingFrequency: 'one_time' })).toBe(
      'Facturacion único'
    )
  })

  it('formats valid_until as dd/mm/yyyy from ISO date', () => {
    expect(resolveTermVariables('Vence: {{valid_until}}', { validUntil: '2026-06-30' })).toBe('Vence: 30/06/2026')
  })

  it('replaces organization_name and escalation_pct', () => {
    const result = resolveTermVariables(
      'Propuesta para {{organization_name}} con reajuste {{escalation_pct}} anual.',
      { organizationName: 'Sky Airline', escalationPct: 3.5 }
    )

    expect(result).toBe('Propuesta para Sky Airline con reajuste 3.5% anual.')
  })

  it('leaves unknown placeholders untouched', () => {
    expect(resolveTermVariables('Valor: {{unknown_placeholder}}', {})).toBe('Valor: {{unknown_placeholder}}')
  })

  it('emits empty strings for missing variable context', () => {
    const result = resolveTermVariables(
      'Pago {{payment_terms_days}} — Duracion {{contract_duration}}',
      {}
    )

    expect(result).toBe('Pago  — Duracion ')
  })

  it('supports multiple placeholders in the same template', () => {
    const result = resolveTermVariables(
      'Propuesta para {{organization_name}}. Pago a {{payment_terms_days}} días. Vence {{valid_until}}.',
      {
        organizationName: 'Globo Retail',
        paymentTermsDays: 30,
        validUntil: '2027-01-15'
      }
    )

    expect(result).toBe('Propuesta para Globo Retail. Pago a 30 días. Vence 15/01/2027.')
  })
})
