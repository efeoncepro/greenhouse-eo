/**
 * TASK-1209 — tests para el signal finance.nubox_export.unprojected_invoice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => queryMock(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

import { getNuboxExportUnprojectedInvoiceSignal } from './nubox-export-unprojected-invoice'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('getNuboxExportUnprojectedInvoiceSignal', () => {
  it('no unprojected export invoices → ok / steady', async () => {
    queryMock.mockResolvedValueOnce([])
    const s = await getNuboxExportUnprojectedInvoiceSignal()

    expect(s.signalId).toBe('finance.nubox_export.unprojected_invoice')
    expect(s.kind).toBe('data_quality')
    expect(s.moduleKey).toBe('finance')
    expect(s.severity).toBe('ok')
  })

  it('one export invoice without income row → warning with actionable detail', async () => {
    queryMock.mockResolvedValueOnce([
      { nubox_document_id: '28800562', folio: '1', dte_type_code: '110', last_seen: '2026-06-20T11:30:00Z' }
    ])
    const s = await getNuboxExportUnprojectedInvoiceSignal()

    expect(s.severity).toBe('warning')
    expect(s.summary).toContain('1 factura')
    expect(s.summary).toContain('28800562')
  })

  it('multiple unprojected invoices → warning pluralized', async () => {
    queryMock.mockResolvedValueOnce([
      { nubox_document_id: '28800562', folio: '1', dte_type_code: '110', last_seen: '2026-06-20T11:30:00Z' },
      { nubox_document_id: '29062197', folio: '51', dte_type_code: '110', last_seen: '2026-06-20T11:30:00Z' }
    ])
    const s = await getNuboxExportUnprojectedInvoiceSignal()

    expect(s.severity).toBe('warning')
    expect(s.summary).toContain('2 facturas')
  })

  it('query failure → degrades honestly to unknown', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))
    const s = await getNuboxExportUnprojectedInvoiceSignal()

    expect(s.severity).toBe('unknown')
  })
})
