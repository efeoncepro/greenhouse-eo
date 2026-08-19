import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()
const mockRequireAdmin = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockQuery(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireAdminTenantContext: () => mockRequireAdmin()
}))

import { GET } from '@/app/api/admin/email-deliveries/route'

describe('GET /api/admin/email-deliveries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({ tenant: { tenantType: 'efeonce_internal' }, errorResponse: null })
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('AS dispatched_7d')) {
        return [
          {
            sent_today: '10',
            dispatch_failed_today: '1',
            provider_failed_today: '2',
            pending_retry: '0',
            dispatched_7d: '10',
            delivered_7d: '4',
            lifecycle_missing_7d: '2',
            terminal_outcome_pending_7d: '3'
          }
        ]
      }

      return [
        {
          delivery_id: 'delivery-1',
          batch_id: 'batch-1',
          email_type: 'hiring_assessment_assigned',
          domain: 'hiring',
          recipient_email: 'candidate@example.com',
          recipient_name: null,
          recipient_user_id: null,
          subject: 'Assessment',
          resend_id: 'resend-1',
          status: 'sent',
          provider_status: 'delivery_delayed',
          provider_event_created_at: '2026-08-19T12:00:00.000Z',
          has_attachments: false,
          source_event_id: 'event-1',
          source_entity: 'assessment-1',
          actor_email: null,
          error_message: null,
          attempt_number: 1,
          delivered_at: null,
          bounced_at: null,
          complained_at: null,
          delivery_delayed_at: '2026-08-19T12:00:00.000Z',
          failed_at: null,
          suppressed_at: null,
          created_at: '2026-08-19T11:00:00.000Z',
          updated_at: '2026-08-19T12:00:00.000Z',
          total_count: '1'
        }
      ]
    })
  })

  it('filters provider lifecycle independently from outbound dispatch status', async () => {
    const response = await GET(
      new Request('http://localhost/api/admin/email-deliveries?status=sent&providerStatus=delivery_delayed')
    )

    const body = await response.json()
    const listCall = mockQuery.mock.calls.find(([sql]) => !String(sql).includes('AS dispatched_7d'))

    expect(response.status).toBe(200)
    expect(listCall?.[0]).toContain('provider_status = $2')
    expect(body.data[0]).toMatchObject({
      status: 'sent',
      providerStatus: 'delivery_delayed',
      effectiveStatus: 'delivery_delayed'
    })
  })

  it('computes delivery rate from provider-confirmed delivery only', async () => {
    const response = await GET(new Request('http://localhost/api/admin/email-deliveries'))
    const body = await response.json()

    expect(body.kpis).toMatchObject({
      deliveryRate: 40,
      dispatchFailedToday: 1,
      providerFailedToday: 2,
      lifecycleMissing7d: 2,
      terminalOutcomePending7d: 3
    })
  })
})
