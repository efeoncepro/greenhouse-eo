// TASK-990 Slice 3 — Nubox export (DTE 110) foreign-currency conformed model.

import { describe, expect, it } from 'vitest'

import { isNuboxExportInvoice, mapNuboxExportationDetail, mapSaleToConformed } from '../mappers'
import type { NuboxSale } from '../types'

const baseSale = (overrides: Partial<NuboxSale> = {}): NuboxSale => ({
  id: 28800562,
  number: '28800562',
  type: { id: 1, legalCode: '110', abbreviation: 'FAC-EXP', name: 'Factura de exportación' },
  totalNetAmount: 4617647,
  totalExemptAmount: 4617647,
  totalTaxVatAmount: 0,
  totalAmount: 4617647,
  emissionDate: '2026-06-01T22:52:13Z',
  periodMonth: 6,
  periodYear: 2026,
  dueDate: '2026-07-01',
  client: {
    tradeName: 'PINTURAS BEREL SA DE CV',
    identification: { value: 'PBE970101718' }
  },
  emissionStatus: { id: 1, name: 'Emitido' },
  ...overrides
})

const identityMaps = {
  orgByRut: new Map([['PBE970101718', { organization_id: 'org-berel', client_id: 'client-berel' }]]),
  incomeByNuboxId: new Map<string, string>()
}

describe('mapNuboxExportationDetail (Berel DTE 110)', () => {
  it('detects export DTE legal codes', () => {
    expect(isNuboxExportInvoice(baseSale())).toBe(true)
    expect(isNuboxExportInvoice(baseSale({ type: { id: 2, legalCode: '33', abbreviation: 'FAC', name: 'Factura' } }))).toBe(false)
  })

  it('extracts foreign amount + currency from the raw export node (high confidence)', () => {
    const detail = mapNuboxExportationDetail(baseSale({ exportationDetail: { montoExtranjero: 89960, tipoMoneda: 'MXN' } }))

    expect(detail.foreignTotalAmount).toBe(89960)
    expect(detail.foreignCurrencyCode).toBe('MXN')
    expect(detail.functionalTotalAmountClp).toBe(4617647) // CLP legal, never recomputed
    expect(detail.evidenceSource).toBe('nubox_payload')
    expect(detail.confidence).toBe('high')
  })

  it('export invoice without usable foreign detail → none (needs reviewed disposition)', () => {
    const detail = mapNuboxExportationDetail(baseSale({ exportationDetail: null }))

    expect(detail.foreignTotalAmount).toBeNull()
    expect(detail.foreignCurrencyCode).toBeNull()
    expect(detail.functionalTotalAmountClp).toBe(4617647) // CLP legal still present
    expect(detail.evidenceSource).toBe('none')
    expect(detail.confidence).toBe('none')
  })

  it('non-export invoice → all foreign fields null/none (CLP behavior unchanged)', () => {
    const detail = mapNuboxExportationDetail(
      baseSale({ type: { id: 2, legalCode: '33', abbreviation: 'FAC', name: 'Factura' } })
    )

    expect(detail.foreignTotalAmount).toBeNull()
    expect(detail.foreignCurrencyCode).toBeNull()
    expect(detail.evidenceSource).toBe('none')
  })
})

describe('mapSaleToConformed export fields', () => {
  it('projects the 6 export fields onto the conformed sale', () => {
    const conformed = mapSaleToConformed(
      baseSale({ exportationDetail: { foreignAmount: 89960, currencyCode: 'MXN' } }),
      'run-1',
      identityMaps
    )

    expect(conformed.dte_type_code).toBe('110')
    expect(conformed.foreign_total_amount).toBe(89960)
    expect(conformed.foreign_currency_code).toBe('MXN')
    expect(conformed.functional_total_amount_clp).toBe(4617647)
    expect(conformed.foreign_currency_evidence_source).toBe('nubox_payload')
    expect(conformed.foreign_currency_confidence).toBe('high')
    expect(conformed.exportation_detail_json).toContain('MXN')
    // identity resolution still works (org matched by RFC value via orgByRut)
    expect(conformed.organization_id).toBe('org-berel')
  })

  it('CLP-only (non-export) conformed sale leaves foreign fields null', () => {
    const conformed = mapSaleToConformed(
      baseSale({ type: { id: 2, legalCode: '33', abbreviation: 'FAC', name: 'Factura' }, exportationDetail: null }),
      'run-1',
      identityMaps
    )

    expect(conformed.foreign_total_amount).toBeNull()
    expect(conformed.foreign_currency_code).toBeNull()
    expect(conformed.foreign_currency_evidence_source).toBe('none')
  })
})
