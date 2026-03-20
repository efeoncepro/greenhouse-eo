import { describe, it, expect } from 'vitest'

import {
  buildPayloadHash,
  mapSaleToRawRow,
  mapPurchaseToRawRow,
  mapExpenseToRawRow,
  mapIncomeToRawRow,
  mapSaleToConformed,
  mapPurchaseToConformed,
  mapExpenseToConformedBankMovement,
  mapIncomeToConformedBankMovement
} from './mappers'

import type { NuboxSale, NuboxPurchase, NuboxExpense, NuboxIncome } from './types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeSale = (overrides: Partial<NuboxSale> = {}): NuboxSale => ({
  id: 25129369,
  number: '94',
  type: { id: 3, legalCode: '33', abbreviation: 'FAC-EL', name: 'Factura electrónica' },
  totalNetAmount: 632546,
  totalExemptAmount: 0,
  totalTaxVatAmount: 120184,
  totalAmount: 752730,
  totalOtherTaxesAmount: 0,
  totalWithholdingAmount: 0,
  balance: 0,
  emissionDate: '2026-02-02T13:24:52Z',
  periodMonth: 2,
  periodYear: 2026,
  dueDate: '2026-03-02',
  origin: { id: 4, name: 'Manual Emision' },
  paymentForm: { id: 2, legalCode: '2', name: 'Crédito' },
  dataCl: { trackId: 11670174962, annulled: false },
  client: {
    tradeName: 'SKY AIRLINE S A',
    identification: { value: '88417000-1' },
    mainActivity: 'Transporte'
  },
  emissionStatus: { id: 1, name: 'Emitido' },
  saleType: { id: 1, legalCode: '1', name: 'Ventas del Giro' },
  ...overrides
})

const makePurchase = (overrides: Partial<NuboxPurchase> = {}): NuboxPurchase => ({
  id: 31558251,
  number: '80917',
  type: { id: 3, legalCode: '33', abbreviation: 'FAC-EL', name: 'Factura electrónica' },
  totalNetAmount: 31924,
  totalExemptAmount: 0,
  totalTaxVatAmount: 6066,
  totalAmount: 37990,
  totalOtherTaxesAmount: 0,
  totalWithholdingAmount: 0,
  balance: 37990,
  emissionDate: '2026-01-31T03:00:00Z',
  periodMonth: 2,
  periodYear: 2026,
  dueDate: '2026-02-28',
  origin: { id: 3, name: 'Integración SII' },
  dataCl: { annulled: false },
  supplier: {
    tradeName: 'CHITA SPA',
    identification: { value: '76543210-K' }
  },
  documentStatus: { id: 1, name: 'Registrado' },
  purchaseType: { id: 1, legalCode: '1', name: 'Compras del Giro' },
  ...overrides
})

const makeExpense = (overrides: Partial<NuboxExpense> = {}): NuboxExpense => ({
  id: 2488688,
  folio: 31,
  type: { id: 4, description: 'Gastos por compra' },
  bank: { id: 11, description: 'Banco Santander-Chile' },
  paymentMethod: { id: 4, description: 'Transferencia' },
  supplier: {
    identification: { type: 1, value: '97036000-K' },
    tradeName: 'Santander - Chile'
  },
  totalAmount: 17311,
  paymentDate: '2025-09-01',
  links: [
    { rel: 'document', href: 'https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1/purchases/21205774' }
  ],
  ...overrides
})

const makeIncome = (overrides: Partial<NuboxIncome> = {}): NuboxIncome => ({
  id: 2510466,
  folio: 21,
  type: { id: 1, description: 'Ingreso por venta' },
  bank: { id: 11, description: 'Banco Santander-Chile' },
  paymentMethod: { id: 4, description: 'Transferencia' },
  client: {
    tradeName: 'CORP ALDEA DEL ENCUENTRO',
    identification: { type: 1, value: '65258560-4' }
  },
  totalAmount: 199908,
  paymentDate: '2025-09-05',
  links: [
    { rel: 'document', href: 'https://api.pyme.nubox.com/nbxpymapi-environment-pyme/v1/sales/17386672' }
  ],
  ...overrides
})

// ─── buildPayloadHash ────────────────────────────────────────────────────────

describe('buildPayloadHash', () => {
  it('returns consistent SHA256 for the same object', () => {
    const hash1 = buildPayloadHash({ a: 1, b: 2 })
    const hash2 = buildPayloadHash({ a: 1, b: 2 })

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA256 hex = 64 chars
  })

  it('returns different hashes for different inputs', () => {
    expect(buildPayloadHash({ a: 1 })).not.toBe(buildPayloadHash({ a: 2 }))
  })

  it('accepts string input directly', () => {
    const hash = buildPayloadHash('{"a":1}')

    expect(hash).toHaveLength(64)
    expect(hash).toBe(buildPayloadHash('{"a":1}'))
  })
})

// ─── Raw Snapshot Mappers ────────────────────────────────────────────────────

describe('mapSaleToRawRow', () => {
  it('maps a sale to a raw snapshot row', () => {
    const row = mapSaleToRawRow(makeSale(), 'run-1')

    expect(row.sync_run_id).toBe('run-1')
    expect(row.source_system).toBe('nubox')
    expect(row.source_object_type).toBe('sale')
    expect(row.source_object_id).toBe('25129369')
    expect(row.source_created_at).toBe('2026-02-02T13:24:52Z')
    expect(row.is_deleted).toBe(false)
    expect(row.payload_hash).toHaveLength(64)
    expect(JSON.parse(row.payload_json).id).toBe(25129369)
  })

  it('handles null emissionDate', () => {
    const row = mapSaleToRawRow(makeSale({ emissionDate: undefined }), 'run-1')

    expect(row.source_created_at).toBeNull()
  })
})

describe('mapPurchaseToRawRow', () => {
  it('maps a purchase to a raw snapshot row', () => {
    const row = mapPurchaseToRawRow(makePurchase(), 'run-2')

    expect(row.source_object_type).toBe('purchase')
    expect(row.source_object_id).toBe('31558251')
    expect(row.source_created_at).toBe('2026-01-31T03:00:00Z')
  })
})

describe('mapExpenseToRawRow', () => {
  it('maps an expense to a raw snapshot row with timestamp conversion', () => {
    const row = mapExpenseToRawRow(makeExpense(), 'run-3')

    expect(row.source_object_type).toBe('expense')
    expect(row.source_object_id).toBe('2488688')
    // Date-only paymentDate should be converted to full timestamp
    expect(row.source_created_at).toBe('2025-09-01T00:00:00Z')
  })

  it('handles null paymentDate', () => {
    const row = mapExpenseToRawRow(makeExpense({ paymentDate: undefined }), 'run-3')

    expect(row.source_created_at).toBeNull()
  })
})

describe('mapIncomeToRawRow', () => {
  it('maps an income to a raw snapshot row with timestamp conversion', () => {
    const row = mapIncomeToRawRow(makeIncome(), 'run-4')

    expect(row.source_object_type).toBe('income')
    expect(row.source_object_id).toBe('2510466')
    expect(row.source_created_at).toBe('2025-09-05T00:00:00Z')
  })
})

// ─── Conformed Mappers ──────────────────────────────────────────────────────

describe('mapSaleToConformed', () => {
  const identityMaps = {
    orgByRut: new Map([
      ['88417000-1', { organization_id: 'org-sky', client_id: 'cli-sky' }]
    ]),
    incomeByNuboxId: new Map([['25129369', 'inc-123']])
  }

  it('maps a sale with identity resolution', () => {
    const conformed = mapSaleToConformed(makeSale(), 'sync-1', identityMaps)

    expect(conformed.nubox_sale_id).toBe('25129369')
    expect(conformed.folio).toBe('94')
    expect(conformed.dte_type_code).toBe('33')
    expect(conformed.dte_type_abbreviation).toBe('FAC-EL')
    expect(conformed.total_amount).toBe(752730)
    expect(conformed.emission_date).toBe('2026-02-02')
    expect(conformed.due_date).toBe('2026-03-02')
    expect(conformed.sii_track_id).toBe('11670174962')
    expect(conformed.is_annulled).toBe(false)
    expect(conformed.client_rut).toBe('88417000-1')
    expect(conformed.organization_id).toBe('org-sky')
    expect(conformed.client_id).toBe('cli-sky')
    expect(conformed.income_id).toBe('inc-123')
  })

  it('returns null organization_id when RUT not found', () => {
    const sale = makeSale({
      client: { tradeName: 'Unknown', identification: { value: '99999999-9' } }
    })
    const conformed = mapSaleToConformed(sale, 'sync-1', identityMaps)

    expect(conformed.organization_id).toBeNull()
    expect(conformed.client_id).toBeNull()
    expect(conformed.client_rut).toBe('99999999-9')
  })

  it('returns null income_id when no match', () => {
    const sale = makeSale({ id: 99999 })
    const conformed = mapSaleToConformed(sale, 'sync-1', identityMaps)

    expect(conformed.income_id).toBeNull()
  })

  it('handles sale without client data', () => {
    const sale = makeSale({ client: undefined })
    const conformed = mapSaleToConformed(sale, 'sync-1', identityMaps)

    expect(conformed.client_rut).toBeNull()
    expect(conformed.client_trade_name).toBeNull()
    expect(conformed.organization_id).toBeNull()
  })
})

describe('mapPurchaseToConformed', () => {
  const identityMaps = {
    supplierByRut: new Map([['76543210-K', 'sup-chita']]),
    expenseByNuboxId: new Map<string, string>()
  }

  it('maps a purchase with supplier resolution', () => {
    const conformed = mapPurchaseToConformed(makePurchase(), 'sync-2', identityMaps)

    expect(conformed.nubox_purchase_id).toBe('31558251')
    expect(conformed.folio).toBe('80917')
    expect(conformed.total_amount).toBe(37990)
    expect(conformed.supplier_rut).toBe('76543210-K')
    expect(conformed.supplier_id).toBe('sup-chita')
    expect(conformed.expense_id).toBeNull()
  })

  it('returns null supplier_id when RUT not found', () => {
    const purchase = makePurchase({
      supplier: { tradeName: 'Unknown', identification: { value: '11111111-1' } }
    })
    const conformed = mapPurchaseToConformed(purchase, 'sync-2', identityMaps)

    expect(conformed.supplier_rut).toBe('11111111-1')
    expect(conformed.supplier_id).toBeNull()
  })
})

describe('mapExpenseToConformedBankMovement', () => {
  it('maps an expense to a bank movement (debit)', () => {
    const movement = mapExpenseToConformedBankMovement(makeExpense(), 'sync-3')

    expect(movement.nubox_movement_id).toBe('exp-2488688')
    expect(movement.movement_direction).toBe('debit')
    expect(movement.total_amount).toBe(17311)
    expect(movement.counterpart_rut).toBe('97036000-K')
    expect(movement.counterpart_trade_name).toBe('Santander - Chile')
    expect(movement.payment_date).toBe('2025-09-01')
    expect(movement.linked_purchase_id).toBe('21205774')
    expect(movement.linked_sale_id).toBeNull()
  })

  it('extracts linked_purchase_id from links', () => {
    const expense = makeExpense({
      links: [{ rel: 'document', href: 'https://api.pyme.nubox.com/v1/purchases/12345' }]
    })
    const movement = mapExpenseToConformedBankMovement(expense, 'sync-3')

    expect(movement.linked_purchase_id).toBe('12345')
  })

  it('handles missing links', () => {
    const expense = makeExpense({ links: undefined })
    const movement = mapExpenseToConformedBankMovement(expense, 'sync-3')

    expect(movement.linked_purchase_id).toBeNull()
  })
})

describe('mapIncomeToConformedBankMovement', () => {
  it('maps an income to a bank movement (credit)', () => {
    const movement = mapIncomeToConformedBankMovement(makeIncome(), 'sync-4')

    expect(movement.nubox_movement_id).toBe('inc-2510466')
    expect(movement.movement_direction).toBe('credit')
    expect(movement.total_amount).toBe(199908)
    expect(movement.counterpart_rut).toBe('65258560-4')
    expect(movement.linked_sale_id).toBe('17386672')
    expect(movement.linked_purchase_id).toBeNull()
  })
})
