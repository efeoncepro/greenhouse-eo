import { NextResponse } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunEcosystemReadRoute = vi.fn()
const mockRunEcosystemCommandRoute = vi.fn()
const mockCreateWebhookSubscription = vi.fn()
const mockUpdateWebhookSubscription = vi.fn()
const mockRetryWebhookDelivery = vi.fn()
const mockListEcosystemOrganizations = vi.fn()
const mockGetEcosystemOrganizationDetail = vi.fn()
const mockListEcosystemCapabilities = vi.fn()
const mockGetEcosystemIntegrationReadiness = vi.fn()
const mockGetEcosystemPlatformHealth = vi.fn()
const mockListEventTypes = vi.fn()
const mockListWebhookSubscriptions = vi.fn()
const mockGetWebhookSubscription = vi.fn()
const mockListWebhookDeliveries = vi.fn()
const mockGetWebhookDelivery = vi.fn()

vi.mock('@/lib/api-platform/core/ecosystem-auth', () => ({
  runEcosystemReadRoute: (...args: unknown[]) => mockRunEcosystemReadRoute(...args)
}))

vi.mock('@/lib/api-platform/core/commands', () => ({
  runEcosystemCommandRoute: (...args: unknown[]) => mockRunEcosystemCommandRoute(...args)
}))

vi.mock('@/lib/api-platform/resources/organizations', () => ({
  listEcosystemOrganizations: (...args: unknown[]) => mockListEcosystemOrganizations(...args),
  getEcosystemOrganizationDetail: (...args: unknown[]) => mockGetEcosystemOrganizationDetail(...args)
}))

vi.mock('@/lib/api-platform/resources/capabilities', () => ({
  listEcosystemCapabilities: (...args: unknown[]) => mockListEcosystemCapabilities(...args)
}))

vi.mock('@/lib/api-platform/resources/integration-readiness', () => ({
  getEcosystemIntegrationReadiness: (...args: unknown[]) => mockGetEcosystemIntegrationReadiness(...args)
}))

vi.mock('@/lib/api-platform/resources/platform-health', () => ({
  getEcosystemPlatformHealth: (...args: unknown[]) => mockGetEcosystemPlatformHealth(...args)
}))

vi.mock('@/lib/api-platform/resources/events', () => ({
  listEventTypes: (...args: unknown[]) => mockListEventTypes(...args),
  listWebhookSubscriptions: (...args: unknown[]) => mockListWebhookSubscriptions(...args),
  getWebhookSubscription: (...args: unknown[]) => mockGetWebhookSubscription(...args),
  listWebhookDeliveries: (...args: unknown[]) => mockListWebhookDeliveries(...args),
  getWebhookDelivery: (...args: unknown[]) => mockGetWebhookDelivery(...args),
  createWebhookSubscription: (...args: unknown[]) => mockCreateWebhookSubscription(...args),
  updateWebhookSubscription: (...args: unknown[]) => mockUpdateWebhookSubscription(...args),
  retryWebhookDelivery: (...args: unknown[]) => mockRetryWebhookDelivery(...args)
}))

const organizationsRoute = await import('./organizations/route')
const organizationDetailRoute = await import('./organizations/[id]/route')
const capabilitiesRoute = await import('./capabilities/route')
const readinessRoute = await import('./integration-readiness/route')
const healthRoute = await import('./health/route')
const eventTypesRoute = await import('./event-types/route')
const webhookSubscriptionsRoute = await import('./webhook-subscriptions/route')
const webhookSubscriptionDetailRoute = await import('./webhook-subscriptions/[id]/route')
const webhookDeliveriesRoute = await import('./webhook-deliveries/route')
const webhookDeliveryDetailRoute = await import('./webhook-deliveries/[id]/route')
const webhookDeliveryDetailRetryRoute = await import('./webhook-deliveries/[id]/retry/route')

describe('api platform ecosystem route contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRunEcosystemReadRoute.mockImplementation(async ({ request, routeKey, handler }) => {
      const result = await handler({
        requestId: 'req-test',
        routeKey,
        version: '2026-04-25',
        consumer: {},
        binding: {
          greenhouseScopeType: 'internal'
        },
        rateLimit: {
          limitPerMinute: 60,
          limitPerHour: 1000
        }
      })

      return NextResponse.json({
        routeKey,
        requestUrl: request.url,
        result
      })
    })

    mockRunEcosystemCommandRoute.mockImplementation(async ({ request, routeKey, body, handler }) => {
      const result = await handler({
        requestId: 'req-test',
        routeKey,
        version: '2026-04-25',
        consumer: { consumerId: 'consumer-test' },
        binding: {
          greenhouseScopeType: 'internal'
        },
        rateLimit: {
          limitPerMinute: 60,
          limitPerHour: 1000
        }
      })

      return NextResponse.json({
        routeKey,
        requestUrl: request.url,
        body,
        result
      })
    })
  })

  it('routes organizations list through the ecosystem harness and reusable resource adapter', async () => {
    mockListEcosystemOrganizations.mockResolvedValue({
      data: { items: [] },
      meta: { pagination: { total: 0 } }
    })

    const request = new Request('https://example.com/api/platform/ecosystem/organizations?page=1')
    const response = await organizationsRoute.GET(request)
    const body = await response.json()

    expect(body.routeKey).toBe('platform.ecosystem.organizations.list')
    expect(mockListEcosystemOrganizations).toHaveBeenCalledWith(expect.objectContaining({ request }))
  })

  it('routes organization detail through the ecosystem harness and passes request for conditional checks', async () => {
    mockGetEcosystemOrganizationDetail.mockResolvedValue({
      data: { organizationId: 'org-1' }
    })

    const request = new Request('https://example.com/api/platform/ecosystem/organizations/org-1')

    const response = await organizationDetailRoute.GET(request, {
      params: Promise.resolve({ id: 'org-1' })
    })

    const body = await response.json()

    expect(body.routeKey).toBe('platform.ecosystem.organizations.detail')
    expect(mockGetEcosystemOrganizationDetail).toHaveBeenCalledWith({
      context: expect.any(Object),
      request,
      identifier: 'org-1'
    })
  })

  it('routes capabilities and readiness through shared adapters without touching legacy integrations routes', async () => {
    mockListEcosystemCapabilities.mockResolvedValue({ data: { items: [] } })
    mockGetEcosystemIntegrationReadiness.mockResolvedValue({ data: { allReady: true, results: {} } })

    await capabilitiesRoute.GET(new Request('https://example.com/api/platform/ecosystem/capabilities'))
    await readinessRoute.GET(new Request('https://example.com/api/platform/ecosystem/integration-readiness?keys=notion'))

    expect(mockListEcosystemCapabilities).toHaveBeenCalledTimes(1)
    expect(mockGetEcosystemIntegrationReadiness).toHaveBeenCalledTimes(1)
  })

  it('routes platform health through the ecosystem harness and health adapter', async () => {
    mockGetEcosystemPlatformHealth.mockResolvedValue({
      data: { contractVersion: 'platform-health.v1', overallStatus: 'healthy' }
    })

    const response = await healthRoute.GET(new Request('https://example.com/api/platform/ecosystem/health'))
    const body = await response.json()

    expect(body.routeKey).toBe('platform.ecosystem.health')
    expect(mockGetEcosystemPlatformHealth).toHaveBeenCalledWith(expect.any(Request))
  })

  it('routes event control plane reads through shared adapters', async () => {
    mockListEventTypes.mockResolvedValue({ count: 1, items: [{ code: 'delivery.updated' }] })
    mockListWebhookSubscriptions.mockResolvedValue({
      page: 1,
      pageSize: 25,
      total: 1,
      count: 1,
      items: [{ subscriptionId: 'sub-1' }]
    })
    mockGetWebhookSubscription.mockResolvedValue({ subscriptionId: 'sub-1' })
    mockListWebhookDeliveries.mockResolvedValue({
      page: 1,
      pageSize: 25,
      total: 1,
      count: 1,
      items: [{ deliveryId: 'del-1' }]
    })
    mockGetWebhookDelivery.mockResolvedValue({ deliveryId: 'del-1' })

    await eventTypesRoute.GET(new Request('https://example.com/api/platform/ecosystem/event-types'))
    await webhookSubscriptionsRoute.GET(new Request('https://example.com/api/platform/ecosystem/webhook-subscriptions'))
    await webhookSubscriptionDetailRoute.GET(new Request('https://example.com/api/platform/ecosystem/webhook-subscriptions/sub-1'), {
      params: Promise.resolve({ id: 'sub-1' })
    })
    await webhookDeliveriesRoute.GET(new Request('https://example.com/api/platform/ecosystem/webhook-deliveries'))
    await webhookDeliveryDetailRoute.GET(new Request('https://example.com/api/platform/ecosystem/webhook-deliveries/del-1'), {
      params: Promise.resolve({ id: 'del-1' })
    })

    expect(mockListEventTypes).toHaveBeenCalledTimes(1)
    expect(mockListWebhookSubscriptions).toHaveBeenCalledTimes(1)
    expect(mockGetWebhookSubscription).toHaveBeenCalledWith({
      context: expect.any(Object),
      subscriptionId: 'sub-1'
    })
    expect(mockListWebhookDeliveries).toHaveBeenCalledTimes(1)
    expect(mockGetWebhookDelivery).toHaveBeenCalledWith({
      context: expect.any(Object),
      deliveryId: 'del-1'
    })
  })

  it('routes event control plane commands through the idempotent command harness (TASK-655)', async () => {
    mockCreateWebhookSubscription.mockResolvedValue({ subscriptionId: 'sub-1' })
    mockUpdateWebhookSubscription.mockResolvedValue({ subscriptionId: 'sub-1' })
    mockRetryWebhookDelivery.mockResolvedValue({ deliveryId: 'del-1' })

    const createResponse = await webhookSubscriptionsRoute.POST(
      new Request('https://example.com/api/platform/ecosystem/webhook-subscriptions', {
        method: 'POST',
        body: JSON.stringify({ targetUrl: 'https://hooks.example.com' })
      })
    )

    const createBody = await createResponse.json()

    await webhookSubscriptionDetailRoute.PATCH(
      new Request('https://example.com/api/platform/ecosystem/webhook-subscriptions/sub-1', {
        method: 'PATCH',
        body: JSON.stringify({ active: false })
      }),
      { params: Promise.resolve({ id: 'sub-1' }) }
    )

    await webhookDeliveryDetailRetryRoute.POST(
      new Request('https://example.com/api/platform/ecosystem/webhook-deliveries/del-1/retry', { method: 'POST' }),
      { params: Promise.resolve({ id: 'del-1' }) }
    )

    // All three mutative routes flow through the command harness, never the read harness.
    expect(mockRunEcosystemCommandRoute).toHaveBeenCalledTimes(3)
    expect(createBody.routeKey).toBe('platform.ecosystem.webhook-subscriptions.create')
    expect(createBody.result.status).toBe(201)
    expect(mockCreateWebhookSubscription).toHaveBeenCalledTimes(1)
    expect(mockUpdateWebhookSubscription).toHaveBeenCalledTimes(1)
    expect(mockRetryWebhookDelivery).toHaveBeenCalledWith({
      context: expect.any(Object),
      deliveryId: 'del-1'
    })

    const commandRouteKeys = mockRunEcosystemCommandRoute.mock.calls.map(([args]) => args.routeKey)

    expect(commandRouteKeys).toEqual([
      'platform.ecosystem.webhook-subscriptions.create',
      'platform.ecosystem.webhook-subscriptions.update',
      'platform.ecosystem.webhook-deliveries.retry'
    ])
  })
})
