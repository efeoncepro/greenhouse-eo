import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunGreenhousePostgresQuery = vi.fn()
const mockGenerateToken = vi.fn()
const mockStoreToken = vi.fn()
const mockCheckRateLimit = vi.fn()
const mockSendEmail = vi.fn()
const mockPublishOutboxEvent = vi.fn()
const mockRequireTenantContext = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/auth-tokens', () => ({
  generateToken: (...args: unknown[]) => mockGenerateToken(...args),
  storeToken: (...args: unknown[]) => mockStoreToken(...args),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args)
}))

vi.mock('@/lib/email/delivery', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args)
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => mockPublishOutboxEvent(...args)
}))

vi.mock('@/lib/tenant/authorization', () => ({
  requireTenantContext: () => mockRequireTenantContext()
}))

import { POST } from './route'

const tenant = {
  userId: 'jreyes@efeoncepro.com',
  roleCodes: ['efeonce_admin'],
  routeGroups: ['admin']
}

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireTenantContext.mockResolvedValue({ tenant, unauthorizedResponse: null })
    mockCheckRateLimit.mockResolvedValue(true)
    mockGenerateToken.mockReturnValue('test-jwt-token')
    mockStoreToken.mockResolvedValue(undefined)
    mockPublishOutboxEvent.mockResolvedValue('outbox-123')
  })

  it('sends verification email and emits outbox event', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([{
      user_id: 'user-1',
      email: 'jreyes@efeoncepro.com',
      full_name: 'Julio Reyes',
      email_verified: false
    }])

    mockSendEmail.mockResolvedValue({ status: 'sent', deliveryId: 'del-1', resendId: 'r-1' })

    const request = new Request('http://localhost/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.sent).toBe(true)
    expect(body.email).toBe('jreyes@efeoncepro.com')

    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      emailType: 'verify_email',
      domain: 'identity'
    }))

    expect(mockPublishOutboxEvent).toHaveBeenCalledWith(expect.objectContaining({
      aggregateType: 'email_verification',
      eventType: 'identity.email_verification.requested'
    }))
  })

  it('returns already verified if email is already verified', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([{
      user_id: 'user-1',
      email: 'jreyes@efeoncepro.com',
      full_name: 'Julio Reyes',
      email_verified: true
    }])

    const request = new Request('http://localhost/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.alreadyVerified).toBe(true)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('rejects when rate limited', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([{
      user_id: 'user-1',
      email: 'jreyes@efeoncepro.com',
      full_name: 'Julio Reyes',
      email_verified: false
    }])

    mockCheckRateLimit.mockResolvedValue(false)

    const request = new Request('http://localhost/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns 404 for unknown user', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const request = new Request('http://localhost/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)

    expect(response.status).toBe(404)
  })
})
