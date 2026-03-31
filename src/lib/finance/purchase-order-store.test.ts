import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockClientQuery = vi.fn()
const mockAttachAssetToAggregate = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: async (callback: (client: { query: typeof mockClientQuery }) => Promise<unknown>) =>
    callback({ query: mockClientQuery })
}))

vi.mock('@/lib/storage/greenhouse-assets', () => ({
  attachAssetToAggregate: (...args: unknown[]) => mockAttachAssetToAggregate(...args),
  buildPrivateAssetDownloadUrl: (assetId: string) => `https://assets.example/private/${assetId}`
}))

const loadStore = async () => {
  vi.resetModules()

  return await import('./purchase-order-store')
}

describe('purchase-order-store compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('falls back to attachment_url when purchase_orders lacks attachment_asset_id', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return [{ has_attachment_asset_id: false }]
      }

      throw new Error(`Unexpected query: ${sql}`)
    })

    mockClientQuery.mockResolvedValueOnce({
      rows: [
        {
          po_id: 'PO-legacy-1',
          po_number: 'PO-001',
          client_id: 'client-1',
          organization_id: null,
          space_id: null,
          authorized_amount: '1000',
          currency: 'CLP',
          exchange_rate_to_clp: '1',
          authorized_amount_clp: '1000',
          invoiced_amount_clp: '0',
          remaining_amount_clp: '1000',
          invoice_count: '0',
          status: 'active',
          issue_date: '2026-03-31',
          expiry_date: null,
          description: 'Orden legacy',
          service_scope: null,
          contact_name: null,
          contact_email: null,
          notes: null,
          attachment_url: 'https://legacy.example/po-001.pdf',
          created_by: 'user-1',
          created_at: '2026-03-31T12:00:00.000Z',
          updated_at: null
        }
      ]
    })

    const { createPurchaseOrder } = await loadStore()

    const created = await createPurchaseOrder({
      poNumber: 'PO-001',
      clientId: 'client-1',
      authorizedAmount: 1000,
      issueDate: '2026-03-31',
      attachmentAssetId: 'asset-123',
      createdBy: 'user-1'
    })

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledTimes(1)

    const insertSql = String(mockClientQuery.mock.calls[0]?.[0] ?? '')
    const insertParams = mockClientQuery.mock.calls[0]?.[1] as unknown[] | undefined

    expect(insertSql).toContain('INSERT INTO greenhouse_finance.purchase_orders')
    expect(insertSql).not.toContain('attachment_asset_id')
    expect(insertSql).toContain('attachment_url')
    expect(insertParams).toContain('https://assets.example/private/asset-123')

    expect(mockAttachAssetToAggregate).toHaveBeenCalledTimes(1)
    expect(mockAttachAssetToAggregate.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        assetId: 'asset-123',
        ownerAggregateType: 'purchase_order',
        ownerAggregateId: expect.stringMatching(/^PO-/),
        actorUserId: 'user-1',
        ownerClientId: 'client-1',
        ownerSpaceId: null
      })
    )

    expect(created).toMatchObject({
      attachmentAssetId: null,
      attachmentUrl: 'https://legacy.example/po-001.pdf'
    })
  })

  it('falls back to attachment_url on update when purchase_orders lacks attachment_asset_id', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return [{ has_attachment_asset_id: false }]
      }

      if (sql.includes('SELECT * FROM greenhouse_finance.purchase_orders WHERE po_id = $1')) {
        return [
          {
            po_id: 'PO-legacy-1',
            po_number: 'PO-001',
            client_id: 'client-1',
            organization_id: null,
            space_id: null,
            authorized_amount: '1000',
            currency: 'CLP',
            exchange_rate_to_clp: '1',
            authorized_amount_clp: '1000',
            invoiced_amount_clp: '0',
            remaining_amount_clp: '1000',
            invoice_count: '0',
            status: 'active',
            issue_date: '2026-03-31',
            expiry_date: null,
            description: 'Orden legacy',
            service_scope: null,
            contact_name: null,
            contact_email: null,
            notes: null,
            attachment_asset_id: null,
            attachment_url: 'https://legacy.example/po-001-updated.pdf',
            created_by: 'user-1',
            created_at: '2026-03-31T12:00:00.000Z',
            updated_at: '2026-03-31T13:00:00.000Z'
          }
        ]
      }

      throw new Error(`Unexpected query: ${sql}`)
    })

    mockClientQuery.mockResolvedValueOnce({
      rows: [
        {
          po_id: 'PO-legacy-1',
          po_number: 'PO-001',
          client_id: 'client-1',
          organization_id: null,
          space_id: null,
          authorized_amount: '1000',
          currency: 'CLP',
          exchange_rate_to_clp: '1',
          authorized_amount_clp: '1000',
          invoiced_amount_clp: '0',
          remaining_amount_clp: '1000',
          invoice_count: '0',
          status: 'active',
          issue_date: '2026-03-31',
          expiry_date: null,
          description: 'Orden legacy actualizada',
          service_scope: null,
          contact_name: null,
          contact_email: null,
          notes: null,
          attachment_url: 'https://assets.example/private/asset-456',
          created_by: 'user-1',
          created_at: '2026-03-31T12:00:00.000Z',
          updated_at: '2026-03-31T13:00:00.000Z'
        }
      ]
    })

    const { updatePurchaseOrder } = await loadStore()

    const updated = await updatePurchaseOrder('PO-legacy-1', {
      description: 'Orden legacy actualizada',
      attachmentAssetId: 'asset-456',
      createdBy: 'user-1',
      clientId: 'client-1'
    })

    const updateSql = String(mockClientQuery.mock.calls[0]?.[0] ?? '')
    const updateParams = mockClientQuery.mock.calls[0]?.[1] as unknown[] | undefined

    expect(updateSql).toContain('UPDATE greenhouse_finance.purchase_orders SET')
    expect(updateSql).not.toContain('attachment_asset_id')
    expect(updateSql).toContain('attachment_url')
    expect(updateParams).toContain('https://assets.example/private/asset-456')

    expect(updated).toMatchObject({
      attachmentAssetId: null,
      attachmentUrl: 'https://assets.example/private/asset-456'
    })
  })

  it('keeps reads on the legacy attachment contract', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT * FROM greenhouse_finance.purchase_orders WHERE po_id = $1')) {
        return [
          {
            po_id: 'PO-legacy-2',
            po_number: 'PO-002',
            client_id: 'client-2',
            organization_id: null,
            space_id: null,
            authorized_amount: '1500',
            currency: 'CLP',
            exchange_rate_to_clp: '1',
            authorized_amount_clp: '1500',
            invoiced_amount_clp: '0',
            remaining_amount_clp: '1500',
            invoice_count: '0',
            status: 'active',
            issue_date: '2026-03-31',
            expiry_date: null,
            description: null,
            service_scope: null,
            contact_name: null,
            contact_email: null,
            notes: null,
            attachment_asset_id: 'asset-789',
            attachment_url: 'https://legacy.example/po-002.pdf',
            created_by: 'user-1',
            created_at: '2026-03-31T12:00:00.000Z',
            updated_at: '2026-03-31T13:00:00.000Z'
          }
        ]
      }

      throw new Error(`Unexpected query: ${sql}`)
    })

    const { getPurchaseOrder } = await loadStore()

    const purchaseOrder = await getPurchaseOrder('PO-legacy-2')

    expect(purchaseOrder).toMatchObject({
      attachmentAssetId: 'asset-789',
      attachmentUrl: 'https://assets.example/private/asset-789'
    })
  })

  it('persists attachment_asset_id when purchase_orders already supports the shared contract', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('information_schema.columns')) {
        return [{ has_attachment_asset_id: true }]
      }

      throw new Error(`Unexpected query: ${sql}`)
    })

    mockClientQuery.mockResolvedValueOnce({
      rows: [
        {
          po_id: 'PO-modern-1',
          po_number: 'PO-010',
          client_id: 'client-1',
          organization_id: null,
          space_id: 'space-1',
          authorized_amount: '1000',
          currency: 'CLP',
          exchange_rate_to_clp: '1',
          authorized_amount_clp: '1000',
          invoiced_amount_clp: '0',
          remaining_amount_clp: '1000',
          invoice_count: '0',
          status: 'active',
          issue_date: '2026-03-31',
          expiry_date: null,
          description: 'Orden moderna',
          service_scope: null,
          contact_name: null,
          contact_email: null,
          notes: null,
          attachment_asset_id: 'asset-999',
          attachment_url: 'https://assets.example/private/asset-999',
          created_by: 'user-1',
          created_at: '2026-03-31T12:00:00.000Z',
          updated_at: null
        }
      ]
    })

    const { createPurchaseOrder } = await loadStore()

    const created = await createPurchaseOrder({
      poNumber: 'PO-010',
      clientId: 'client-1',
      spaceId: 'space-1',
      authorizedAmount: 1000,
      issueDate: '2026-03-31',
      attachmentAssetId: 'asset-999',
      createdBy: 'user-1'
    })

    const insertSql = String(mockClientQuery.mock.calls[0]?.[0] ?? '')
    const insertParams = mockClientQuery.mock.calls[0]?.[1] as unknown[] | undefined

    expect(insertSql).toContain('attachment_asset_id')
    expect(insertParams).toContain('asset-999')
    expect(insertParams).toContain('https://assets.example/private/asset-999')
    expect(created).toMatchObject({
      attachmentAssetId: 'asset-999',
      attachmentUrl: 'https://assets.example/private/asset-999'
    })
  })
})
