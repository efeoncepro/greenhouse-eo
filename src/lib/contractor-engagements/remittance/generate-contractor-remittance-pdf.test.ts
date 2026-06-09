import { describe, expect, it } from 'vitest'

import { buildRemittanceAdvice } from './remittance-presenter'
import {
  generateContractorRemittancePdf,
  REMITTANCE_TEMPLATE_VERSION
} from './generate-contractor-remittance-pdf'
import type { RemittanceAdviceInput } from './types'

const input = (overrides: Partial<RemittanceAdviceInput> = {}): RemittanceAdviceInput => ({
  regime: 'honorarios_cl',
  number: 'EO-RA-000142',
  issuer: { legalName: 'Efeonce Group SpA', taxId: '77.357.182-1', address: 'Santiago, Chile', logoSrc: '/branding/logo-full.svg' },
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

const isPdf = (buf: Buffer) => buf.length > 1000 && buf.subarray(0, 5).toString('latin1') === '%PDF-'

describe('generateContractorRemittancePdf', () => {
  it('exposes a template version constant', () => {
    expect(REMITTANCE_TEMPLATE_VERSION).toBe('3')
  })

  it('renders honorarios CL (es-CL) to a valid PDF buffer', async () => {
    const buf = await generateContractorRemittancePdf(buildRemittanceAdvice(input(), 'es-CL'))

    expect(isPdf(buf)).toBe(true)
  })

  it('renders provider-managed (no withholding row) without throwing', async () => {
    const buf = await generateContractorRemittancePdf(
      buildRemittanceAdvice(
        input({ regime: 'provider_managed', withholding: null, net: 1_500, gross: 1_500, currency: 'USD', withholdingManagedByProvider: true, withholdingRate: null, providerDocument: { kind: 'invoice', value: 'INV-1201' } }),
        'es-CL'
      )
    )

    expect(isPdf(buf)).toBe(true)
  })

  it('renders en-US locale to a valid PDF buffer', async () => {
    const buf = await generateContractorRemittancePdf(buildRemittanceAdvice(input(), 'en-US'))

    expect(isPdf(buf)).toBe(true)
  })

  it('renders honest-degrade (missing tax id + provider doc) without throwing', async () => {
    const buf = await generateContractorRemittancePdf(
      buildRemittanceAdvice(input({ beneficiary: { name: 'Sin documento', taxId: null, country: 'NI' }, providerDocument: null }), 'es-CL')
    )

    expect(isPdf(buf)).toBe(true)
  })
})
