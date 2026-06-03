/**
 * TASK-997 Slice 2 — test del suggest reader de contactos de finanzas.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args)
}))

import { listFinanceContactSuggestionsForCompany } from './finance-contact-suggestions'

beforeEach(() => {
  queryMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('listFinanceContactSuggestionsForCompany — TASK-997 Slice 2', () => {
  it('devuelve [] sin consultar cuando no hay hubspotCompanyId', async () => {
    expect(await listFinanceContactSuggestionsForCompany(null)).toEqual([])
    expect(await listFinanceContactSuggestionsForCompany('   ')).toEqual([])
    expect(queryMock).not.toHaveBeenCalled()
  })

  it('consulta crm.contacts por primary o associated company id', async () => {
    queryMock.mockResolvedValueOnce([
      { hubspotContactId: '901', name: 'María Ríos', email: 'mf@berel.mx', jobTitle: 'Finanzas' }
    ])

    const rows = await listFinanceContactSuggestionsForCompany('55405407542')

    expect(rows).toHaveLength(1)
    expect(rows[0].hubspotContactId).toBe('901')

    const sql = String(queryMock.mock.calls[0]?.[0] ?? '')
    const params = queryMock.mock.calls[0]?.[1] as unknown[]

    expect(sql).toContain('greenhouse_crm.contacts')
    expect(sql).toContain('hubspot_primary_company_id = $1')
    expect(sql).toContain('$1 = ANY(hubspot_associated_company_ids)')
    expect(sql).toContain('is_deleted = FALSE')
    expect(params?.[0]).toBe('55405407542')
  })
})
