import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

describe('hes-store', () => {
  beforeEach(() => {
    vi.resetModules()
    mockRunGreenhousePostgresQuery.mockReset()
  })

  it('creates HES as submitted so the registered workflow starts as received', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValueOnce([
      {
        hes_id: 'HES-test-001',
        hes_number: '7013337',
        purchase_order_id: 'PO-1',
        client_id: 'client-1',
        organization_id: 'org-1',
        space_id: 'space-1',
        service_description: 'Servicio de diseño externo',
        service_period_start: '2026-04-09',
        service_period_end: '2026-04-30',
        deliverables_summary: 'Piezas de diseño',
        amount: '6902000',
        currency: 'CLP',
        amount_clp: '6902000',
        status: 'submitted',
        submitted_at: '2026-04-13T12:00:00.000Z',
        approved_at: null,
        approved_by: null,
        rejection_reason: null,
        income_id: null,
        invoiced: false,
        client_contact_name: 'Dianesty Santander Romero',
        client_contact_email: 'dianesty.santander@skyairline.com',
        attachment_url: 'https://assets.example/po.pdf',
        notes: 'ok',
        created_at: '2026-04-13T12:00:00.000Z',
        updated_at: null
      }
    ])

    const { createHes } = await import('./hes-store')

    const created = await createHes({
      hesNumber: '7013337',
      purchaseOrderId: 'PO-1',
      clientId: 'client-1',
      organizationId: 'org-1',
      spaceId: 'space-1',
      serviceDescription: 'Servicio de diseño externo',
      servicePeriodStart: '2026-04-09',
      servicePeriodEnd: '2026-04-30',
      deliverablesSummary: 'Piezas de diseño',
      amount: 6902000,
      clientContactName: 'Dianesty Santander Romero',
      clientContactEmail: 'dianesty.santander@skyairline.com',
      attachmentUrl: 'https://assets.example/po.pdf',
      notes: 'ok',
      createdBy: 'user-1'
    })

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)

    const insertSql = String(mockRunGreenhousePostgresQuery.mock.calls[0]?.[0] ?? '')

    expect(insertSql).toContain('INSERT INTO greenhouse_finance.service_entry_sheets')
    expect(insertSql).toContain("'submitted'")
    expect(insertSql).toContain('submitted_at')
    expect(insertSql).toContain('NOW()')

    expect(created).toMatchObject({
      hesNumber: '7013337',
      status: 'submitted',
      submittedAt: '2026-04-13T12:00:00.000Z',
      clientContactEmail: 'dianesty.santander@skyairline.com'
    })
  })
})
