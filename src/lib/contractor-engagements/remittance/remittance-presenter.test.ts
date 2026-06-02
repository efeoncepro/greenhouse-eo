import { describe, expect, it } from 'vitest'

import { buildRemittanceAdvice } from './remittance-presenter'
import type { RemittanceAdviceInput } from './types'

const baseInput = (overrides: Partial<RemittanceAdviceInput> = {}): RemittanceAdviceInput => ({
  regime: 'honorarios_cl',
  number: 'EO-RA-000142',
  issuer: {
    legalName: 'Efeonce Group SpA',
    taxId: '77.357.182-1',
    address: 'Santiago, Chile',
    logoSrc: '/branding/logo-full.svg'
  },
  beneficiary: { name: 'Camila Soto Reyes', taxId: '18.452.901-3', country: 'CL' },
  providerDocument: { kind: 'bhe', value: 'N° 1042' },
  gross: 1_000_000,
  withholding: 152_500,
  net: 847_500,
  currency: 'CLP',
  withholdingManagedByProvider: false,
  withholdingRate: 0.1525,
  fx: null,
  payment: { dateIso: '2026-04-30', reference: 'TRX-88231' },
  ...overrides
})

const rowById = (p: ReturnType<typeof buildRemittanceAdvice>, id: string) =>
  p.breakdown.find(r => r.id === id)

describe('buildRemittanceAdvice — honorarios CL', () => {
  it('shows gross → SII withholding (with rate) → net, amounts verbatim', () => {
    const p = buildRemittanceAdvice(baseInput(), 'es-CL')

    expect(p.labels.title).toBe('Comprobante de Pago')
    expect(p.number).toBe('EO-RA-000142')
    expect(rowById(p, 'gross')?.amount).toBe(1_000_000)
    expect(rowById(p, 'withholding')?.amount).toBe(152_500)
    expect(rowById(p, 'withholding')?.label).toContain('Retención SII')
    expect(rowById(p, 'withholding')?.label).toContain('15,25%')
    expect(rowById(p, 'withholding')?.negative).toBe(true)
    expect(rowById(p, 'net')?.amount).toBe(847_500)
    expect(rowById(p, 'net')?.emphasis).toBe(true)
    expect(p.disclaimer).toContain('No constituye remuneración')
    expect(p.disclaimer).not.toContain('gestionada por el proveedor')
  })
})

describe('buildRemittanceAdvice — international withholding', () => {
  it('uses the generic withholding label (no SII rate)', () => {
    const p = buildRemittanceAdvice(
      baseInput({
        regime: 'international_withholding',
        providerDocument: { kind: 'invoice', value: 'INV-0099' },
        gross: 2_000,
        withholding: 200,
        net: 1_800,
        currency: 'USD',
        withholdingRate: null,
        beneficiary: { name: 'John Carter', taxId: 'SSN ••• 4821', country: 'US' }
      }),
      'es-CL'
    )

    expect(rowById(p, 'withholding')?.label).toBe('Retención')
    expect(rowById(p, 'net')?.amount).toBe(1_800)
  })
})

describe('buildRemittanceAdvice — provider managed', () => {
  it('omits the withholding row and prefixes the managed note', () => {
    const p = buildRemittanceAdvice(
      baseInput({
        regime: 'provider_managed',
        providerDocument: { kind: 'invoice', value: 'INV-1201' },
        gross: 1_500,
        withholding: null,
        net: 1_500,
        currency: 'USD',
        withholdingManagedByProvider: true,
        withholdingRate: null
      }),
      'es-CL'
    )

    expect(rowById(p, 'withholding')).toBeUndefined()
    expect(p.breakdown).toHaveLength(2)
    expect(p.disclaimer).toContain('gestionada por el proveedor')
    expect(p.disclaimer).toContain('No constituye remuneración')
  })
})

describe('buildRemittanceAdvice — cross currency', () => {
  it('keeps the obligation currency in the breakdown and omits the FX line in V1', () => {
    const p = buildRemittanceAdvice(
      baseInput({
        regime: 'cross_currency',
        providerDocument: { kind: 'invoice', value: 'INV-2048' },
        gross: 1_800,
        withholding: null,
        net: 1_800,
        currency: 'USD',
        fx: null
      }),
      'es-CL'
    )

    expect(rowById(p, 'net')?.currency).toBe('USD')
    expect(p.fx).toBeUndefined()
    expect(p.labels.regimeLabel).toBe('Internacional (FX)')
  })

  it('renders an FX informational line when a rate is provided', () => {
    const p = buildRemittanceAdvice(
      baseInput({
        regime: 'cross_currency',
        currency: 'USD',
        withholding: null,
        net: 1_800,
        fx: { rate: 942.5, equivalent: 1_696_500, equivalentCurrency: 'CLP' }
      }),
      'es-CL'
    )

    expect(p.fx?.value).toContain('942')
    expect(p.fx?.value).toContain('Tipo de cambio aplicado')
  })
})

describe('buildRemittanceAdvice — honest degrade + bilingual', () => {
  it('falls back to — when beneficiary tax id / provider doc are missing', () => {
    const p = buildRemittanceAdvice(
      baseInput({
        beneficiary: { name: 'Sin documento', taxId: null, country: 'NI' },
        providerDocument: null
      }),
      'es-CL'
    )

    expect(p.beneficiary.taxId).toBe('—')
    expect(p.providerDocument.value).toBe('—')
  })

  it('renders en-US labels + disclaimer when the contractor locale is en-US', () => {
    const p = buildRemittanceAdvice(baseInput(), 'en-US')

    expect(p.labels.title).toBe('Remittance Advice')
    expect(rowById(p, 'net')?.label).toBe('Net paid')
    expect(p.beneficiary.taxIdLabel).toBe('Tax ID')
    expect(p.disclaimer).toContain('professional services')
    expect(rowById(p, 'withholding')?.label).toContain('SII withholding')
  })
})
