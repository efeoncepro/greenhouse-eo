import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockIsResendConfigured = vi.fn()
const mockGetResendClient = vi.fn()
const mockGetEmailFromAddress = vi.fn()
const mockGetSubscribers = vi.fn()
const mockCheckRecipientRateLimit = vi.fn()
const mockWithGreenhousePostgresTransaction = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  onGreenhousePostgresReset: () => () => {},
  isGreenhousePostgresRetryableConnectionError: () => false,
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args),
  withGreenhousePostgresTransaction: (...args: unknown[]) => mockWithGreenhousePostgresTransaction(...args)
}))

vi.mock('@/lib/resend', () => ({
  isResendConfigured: () => mockIsResendConfigured(),
  getResendClient: () => mockGetResendClient(),
  getEmailFromAddress: () => mockGetEmailFromAddress()
}))

vi.mock('@/lib/email/subscriptions', () => ({
  getSubscribers: (...args: unknown[]) => mockGetSubscribers(...args)
}))

vi.mock('@/lib/email/rate-limit', () => ({
  checkRecipientRateLimit: (...args: unknown[]) => mockCheckRecipientRateLimit(...args)
}))

const {
  claimTokenSensitiveEmailIntent,
  processFailedEmailDeliveries,
  retryFailedDelivery,
  sendEmail
} = await import('./delivery')

describe('email delivery layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsResendConfigured.mockReturnValue(true)
    mockGetEmailFromAddress.mockReturnValue('no-reply@efeoncepro.com')
    mockGetResendClient.mockReturnValue({
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'resend-123' } })
      }
    })
    mockGetSubscribers.mockResolvedValue([])
    mockCheckRecipientRateLimit.mockResolvedValue({ allowed: true, currentCount: 0, limit: 10 })
    mockWithGreenhousePostgresTransaction.mockImplementation(async callback => callback({ query: vi.fn() }))

    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes('RETURNING delivery_id')) {
        return Promise.resolve([{ delivery_id: 'delivery-123' }])
      }

      return Promise.resolve([])
    })
  })

  it('sends a templated email and records delivery rows', async () => {
    const bearer = 'implicit-sensitive-bearer'

    const result = await sendEmail({
      emailType: 'password_reset',
      domain: 'identity',
      recipients: [{ email: 'user@example.com', name: 'Ada Lovelace' }],
      context: {
        resetUrl: `https://greenhouse.example/reset?token=${bearer}`
      }
    })

    expect(result.status).toBe('sent')
    expect(result.deliveryId).toEqual(expect.any(String))
    expect(result.resendId).toBe('resend-123')

    const resendClient = mockGetResendClient.mock.results[0]?.value as any

    expect(resendClient.emails.send).toHaveBeenCalledTimes(1)
    expect(resendClient.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@efeoncepro.com',
        to: 'user@example.com',
        subject: 'Restablece tu contraseña — Greenhouse'
      })
    )

    expect(mockRunGreenhousePostgresQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_notifications.email_deliveries'),
      expect.arrayContaining([expect.any(String), 'password_reset', 'identity', 'user@example.com'])
    )

    expect(
      mockRunGreenhousePostgresQuery.mock.calls.some(
        call => typeof call[0] === 'string' && call[0].includes('delivery_payload')
      )
    ).toBe(true)
    expect(JSON.stringify(mockRunGreenhousePostgresQuery.mock.calls)).not.toContain(bearer)
  })

  it('renders token-sensitive context in memory but persists only allowlisted non-retryable metadata', async () => {
    const bearer = 'sentinel-bearer-that-must-never-persist'

    const result = await sendEmail({
      emailType: 'password_reset',
      domain: 'identity',
      recipients: [{ email: 'user@example.com', name: bearer, userId: bearer }],
      context: { resetUrl: `https://greenhouse.example/reset?token=${bearer}` },
      sourceEventId: bearer,
      sourceEntity: bearer,
      persistence: {
        mode: 'token_sensitive',
        safeContext: { locale: 'es', leak: bearer } as never,
      },
    })

    expect(result.status).toBe('sent')

    const insert = mockRunGreenhousePostgresQuery.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_notifications.email_deliveries'),
    )

    const serializedParameters = JSON.stringify(insert?.[1])

    expect(serializedParameters).not.toContain(bearer)
    expect(serializedParameters).not.toContain('resetUrl')

    const payload = JSON.parse((insert?.[1] as unknown[])[10] as string)

    expect(payload).toMatchObject({
      context: { templateVersion: 'password_reset:current', locale: 'es' },
      persistence: { mode: 'token_sensitive', retryable: false },
    })
  })

  it('persists only canonical assessment correlation IDs', async () => {
    const assessmentId = 'asmt-11111111-1111-4111-8111-111111111111'
    const eventId = 'outbox-22222222-2222-4222-8222-222222222222'

    const txQuery = vi.fn(async (sql: string, params?: unknown[]) => {
      void params

      if (sql.includes('INSERT INTO greenhouse_notifications.email_deliveries')) {
        return { rows: [{ delivery_id: 'delivery-intent-1' }] }
      }

      return { rows: [] }
    })

    mockWithGreenhousePostgresTransaction.mockImplementation(callback => callback({ query: txQuery }))

    await claimTokenSensitiveEmailIntent({
      emailType: 'hiring_assessment_assigned',
      domain: 'hr',
      recipient: { email: 'candidate@example.com', name: 'Candidate' },
      sourceEventId: eventId,
      sourceEntity: assessmentId,
      safeContext: { locale: 'es' },
      issueCredential: vi.fn().mockResolvedValue({ token: 'memory-only' })
    })

    const insert = txQuery.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].includes('INSERT INTO greenhouse_notifications.email_deliveries')
    )

    expect((insert?.[1] as unknown[])[6]).toBe(eventId)
    expect((insert?.[1] as unknown[])[7]).toBe(assessmentId)

  })

  it('atomically claims one token rotation intent under concurrent event delivery', async () => {
    const assessmentId = 'asmt-11111111-1111-4111-8111-111111111111'
    const eventId = 'outbox-22222222-2222-4222-8222-222222222222'
    let storedDeliveryId: string | null = null
    let transactionTail: Promise<unknown> = Promise.resolve()
    const issueCredential = vi.fn().mockResolvedValue({ token: 'only-once' })

    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('pg_advisory_xact_lock')) return { rows: [] }

        if (sql.includes('SELECT delivery_id')) {
          return { rows: storedDeliveryId ? [{ delivery_id: storedDeliveryId }] : [] }
        }

        if (sql.includes('INSERT INTO greenhouse_notifications.email_deliveries')) {
          storedDeliveryId = 'delivery-atomic-1'

          return { rows: [{ delivery_id: storedDeliveryId }] }
        }

        return { rows: [] }
      })
    }

    mockWithGreenhousePostgresTransaction.mockImplementation(callback => {
      const run = transactionTail.then(() => callback(client))

      transactionTail = run.then(() => undefined, () => undefined)

      return run
    })

    const input = {
      emailType: 'hiring_assessment_assigned' as const,
      domain: 'hr' as const,
      recipient: { email: 'candidate@example.com' },
      sourceEventId: eventId,
      sourceEntity: assessmentId,
      safeContext: { locale: 'es' },
      issueCredential
    }

    const outcomes = await Promise.all([
      claimTokenSensitiveEmailIntent(input),
      claimTokenSensitiveEmailIntent(input)
    ])

    expect(outcomes.filter(outcome => outcome.claimed)).toHaveLength(1)
    expect(outcomes.filter(outcome => !outcome.claimed)).toHaveLength(1)
    expect(issueCredential).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      emailType: 'hiring_assessment_assigned' as const,
      context: { openingTitle: 'Role', assessmentUrl: 'https://example.test/assessment/bearer', locale: 'es' }
    },
    {
      emailType: 'hiring_assessment_access_recovery' as const,
      context: { openingTitle: 'Role', assessmentUrl: 'https://example.test/assessment/access#token=bearer', locale: 'es' }
    },
    {
      emailType: 'hiring_talent_pool_verification' as const,
      context: { profileUrl: 'https://example.test/talent/bearer', locale: 'es' }
    }
  ])('blocks $emailType before the provider when its claimed intent is missing', async ({ emailType, context }) => {
    await expect(sendEmail({
      emailType,
      domain: 'hr',
      recipients: [{ email: 'candidate@example.com' }],
      context
    })).rejects.toThrow('claimed delivery intent')
    expect(mockGetResendClient).not.toHaveBeenCalled()
  })

  it.each([
    {
      emailType: 'hiring_assessment_assigned' as const,
      context: { openingTitle: 'Role', assessmentUrl: 'https://example.test/assessment/bearer', locale: 'es' },
      sourceEntity: 'asmt-11111111-1111-4111-8111-111111111111'
    },
    {
      emailType: 'hiring_assessment_access_recovery' as const,
      context: { openingTitle: 'Role', assessmentUrl: 'https://example.test/assessment/access#token=bearer', locale: 'es' },
      sourceEntity: 'asmt-11111111-1111-4111-8111-111111111111'
    },
    {
      emailType: 'hiring_talent_pool_verification' as const,
      context: { profileUrl: 'https://example.test/talent/bearer', locale: 'es' },
      sourceEntity: 'tlpc-11111111-1111-4111-8111-111111111111'
    }
  ])('blocks a fake $emailType intent before the provider', async ({ emailType, context, sourceEntity }) => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const result = await sendEmail({
      emailType,
      domain: 'hr',
      recipients: [{ email: 'candidate@example.com' }],
      context,
      sourceEventId: 'outbox-22222222-2222-4222-8222-222222222222',
      sourceEntity,
      persistence: {
        mode: 'token_sensitive',
        safeContext: { locale: 'es' },
        deliveryIntentId: '00000000-0000-4000-8000-000000000000'
      }
    })

    expect(result).toMatchObject({ status: 'failed', dispatchOutcome: 'failed' })
    expect(mockGetResendClient).not.toHaveBeenCalled()
  })

  it('terminalizes and returns the real intent when a rotation-owner type is paused', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes('email_type_config')) {
        return Promise.resolve([{ enabled: false, paused_reason: 'controlled pause' }])
      }

      if (sql.includes("SET status='skipped'")) {
        return Promise.resolve([{ delivery_id: 'delivery-intent-1' }])
      }

      return Promise.resolve([])
    })

    const result = await sendEmail({
      emailType: 'hiring_assessment_assigned',
      domain: 'hr',
      recipients: [{ email: 'candidate@example.com' }],
      context: { openingTitle: 'Role', assessmentUrl: 'https://example.test/assessment/bearer', locale: 'es' },
      sourceEventId: 'outbox-22222222-2222-4222-8222-222222222222',
      sourceEntity: 'asmt-11111111-1111-4111-8111-111111111111',
      persistence: {
        mode: 'token_sensitive',
        safeContext: { locale: 'es' },
        deliveryIntentId: 'delivery-intent-1'
      }
    })

    expect(result).toMatchObject({
      deliveryId: 'delivery-intent-1',
      status: 'skipped',
      dispatchOutcome: 'failed'
    })
    expect(mockGetResendClient).not.toHaveBeenCalled()
  })

  it('skips delivery when no recipients can be resolved', async () => {
    mockGetSubscribers.mockResolvedValueOnce([])

    const result = await sendEmail({
      emailType: 'payroll_export',
      domain: 'payroll',
      context: {}
    })

    expect(result.status).toBe('skipped')
    expect(result.resendId).toBeNull()
    expect(mockGetResendClient).not.toHaveBeenCalled()
  })

  it('retries failed deliveries using the persisted replay payload', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes("status = 'failed' AND attempt_number")) {
        return Promise.resolve([
          {
            delivery_id: 'delivery-claim-1',
            batch_id: 'batch-1',
            email_type: 'notification',
            domain: 'system',
            recipient_email: 'user@example.com',
            recipient_name: 'User Example',
            recipient_user_id: 'user-1',
            subject: 'Hola',
            resend_id: null,
            status: 'pending',
            has_attachments: true,
            delivery_payload: {
              recipients: [
                {
                  email: 'user@example.com',
                  name: 'User Example',
                  userId: 'user-1'
                }
              ],
              context: {
                title: 'Hola',
                body: 'Tu notificación',
                recipientName: 'User Example'
              },
              attachments: [
                {
                  filename: 'hello.txt',
                  content: { type: 'Buffer', data: [104, 105] },
                  contentType: 'text/plain'
                }
              ]
            },
            source_event_id: 'event-1',
            source_entity: 'service.created',
            actor_email: 'ops@example.com',
            error_message: null,
            attempt_number: 2
          }
        ])
      }

      if (sql.includes("SET status = 'pending'")) {
        return Promise.resolve([
          {
            delivery_id: 'delivery-claim-1',
            batch_id: 'batch-1',
            email_type: 'notification',
            domain: 'system',
            recipient_email: 'user@example.com',
            recipient_name: 'User Example',
            recipient_user_id: 'user-1',
            subject: 'Hola',
            resend_id: null,
            status: 'pending',
            has_attachments: true,
            delivery_payload: {
              recipients: [
                {
                  email: 'user@example.com',
                  name: 'User Example',
                  userId: 'user-1'
                }
              ],
              context: {
                title: 'Hola',
                body: 'Tu notificación',
                recipientName: 'User Example'
              },
              attachments: [
                {
                  filename: 'hello.txt',
                  content: { type: 'Buffer', data: [104, 105] },
                  contentType: 'text/plain'
                }
              ]
            },
            source_event_id: 'event-1',
            source_entity: 'service.created',
            actor_email: 'ops@example.com',
            error_message: null,
            attempt_number: 3
          }
        ])
      }

      if (sql.includes('SET resend_id = $2')) {
        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const result = await processFailedEmailDeliveries()

    expect(result).toMatchObject({
      attempted: 1,
      claimed: 1,
      sent: 1,
      failed: 0,
      skipped: 0
    })

    const resendClient = mockGetResendClient.mock.results[0]?.value as any

    expect(resendClient.emails.send).toHaveBeenCalledTimes(1)
    expect(resendClient.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Hola'
      })
    )
  })

  it('excludes token-sensitive deliveries from automatic and manual generic retry claims', async () => {
    mockRunGreenhousePostgresQuery.mockResolvedValue([])

    const batch = await processFailedEmailDeliveries()
    const manual = await retryFailedDelivery('delivery-sensitive-1')
    const sql = mockRunGreenhousePostgresQuery.mock.calls.map(call => String(call[0])).join('\n')

    expect(batch).toMatchObject({ attempted: 0, claimed: 0 })
    expect(manual).toMatchObject({ status: 'skipped', error: 'Delivery not eligible for retry.' })
    expect(sql.match(/delivery_payload->'persistence'->>'retryable'/g)).toHaveLength(2)
    expect(sql.match(/email_type = ANY/g)).toHaveLength(2)
    expect(mockRunGreenhousePostgresQuery.mock.calls.every(
      call => Array.isArray(call[1]) && Array.isArray(call[1][1]) && call[1][1].includes('hiring_assessment_assigned')
    )).toBe(true)
  })

  it('treats an explicit provider error as failed without persisting provider details', async () => {
    const providerSentinel = 'provider-secret-sentinel'

    mockGetResendClient.mockReturnValue({
      emails: {
        send: vi.fn().mockResolvedValue({ data: null, error: { message: providerSentinel } })
      }
    })

    const result = await sendEmail({
      emailType: 'password_reset',
      domain: 'identity',
      recipients: [{ email: 'user@example.com' }],
      context: { resetUrl: 'https://greenhouse.example/reset?token=secret' }
    })

    expect(result).toMatchObject({ status: 'failed', resendId: null, dispatchOutcome: 'failed' })
    expect(JSON.stringify(result)).not.toContain(providerSentinel)
    expect(JSON.stringify(mockRunGreenhousePostgresQuery.mock.calls)).not.toContain(providerSentinel)
  })

  it('reports unknown when Resend accepted but the local delivery row could not be persisted', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO greenhouse_notifications.email_deliveries')) {
        return Promise.resolve([{ delivery_id: 'delivery-pending-1' }])
      }

      if (sql.includes('SET resend_id = $2')) {
        return Promise.reject(new Error('database unavailable'))
      }

      return Promise.resolve([])
    })

    const result = await sendEmail({
      emailType: 'password_reset',
      domain: 'identity',
      recipients: [{ email: 'user@example.com' }],
      context: { resetUrl: 'https://greenhouse.example/reset?token=secret' }
    })

    expect(result).toMatchObject({
      deliveryId: 'delivery-pending-1',
      status: 'failed',
      resendId: 'resend-123',
      dispatchOutcome: 'unknown'
    })
    expect(result.recipientResults?.[0]).toMatchObject({
      status: 'failed',
      resendId: 'resend-123',
      dispatchOutcome: 'unknown'
    })
  })

  it('does not call Resend when a sensitive delivery intent cannot be created', async () => {
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string) => {
      if (sql.includes('INSERT INTO greenhouse_notifications.email_deliveries')) {
        return Promise.reject(new Error('database unavailable'))
      }

      return Promise.resolve([])
    })

    const result = await sendEmail({
      emailType: 'password_reset',
      domain: 'identity',
      recipients: [{ email: 'user@example.com' }],
      context: { resetUrl: 'https://greenhouse.example/reset?token=secret' }
    })

    expect(result).toMatchObject({ status: 'failed', dispatchOutcome: 'failed', resendId: null })
    expect(mockGetResendClient).not.toHaveBeenCalled()
  })

  it('does not mark a batch as sent when Resend returns an error value', async () => {
    mockGetResendClient.mockReturnValue({
      batch: { send: vi.fn().mockResolvedValue({ data: null, error: { message: 'provider rejected' } }) }
    })

    const result = await sendEmail({
      emailType: 'notification',
      domain: 'system',
      recipients: [{ email: 'one@example.com' }, { email: 'two@example.com' }],
      context: { title: 'Aviso', body: 'Contenido' }
    })

    expect(result).toMatchObject({ status: 'failed', dispatchOutcome: 'failed' })
    expect(result.recipientResults).toHaveLength(2)
    expect(result.recipientResults?.every(item => item.status === 'failed' && item.resendId === null)).toBe(true)
  })

  it('does not report a fully rate-limited batch as accepted', async () => {
    mockCheckRecipientRateLimit.mockResolvedValue({ allowed: false, currentCount: 10, limit: 10 })

    const result = await sendEmail({
      emailType: 'notification',
      domain: 'system',
      recipients: [{ email: 'one@example.com' }, { email: 'two@example.com' }],
      context: { title: 'Aviso', body: 'Contenido' }
    })

    expect(result).toMatchObject({ status: 'failed', dispatchOutcome: 'failed' })
    expect(mockGetResendClient).not.toHaveBeenCalled()
    expect(result.recipientResults?.every(item => item.status === 'rate_limited')).toBe(true)
  })

  it('reports an accepted batch recipient as unknown when its delivery row cannot be persisted', async () => {
    mockGetResendClient.mockReturnValue({
      batch: {
        send: vi.fn().mockResolvedValue({
          data: { data: [{ id: 'batch-resend-1' }, { id: 'batch-resend-2' }] },
          error: null
        })
      }
    })
    mockRunGreenhousePostgresQuery.mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('INSERT INTO greenhouse_notifications.email_deliveries') && params[3] === 'two@example.com') {
        return Promise.reject(new Error('database unavailable'))
      }

      if (sql.includes('RETURNING delivery_id')) return Promise.resolve([{ delivery_id: 'delivery-batch-1' }])

      return Promise.resolve([])
    })

    const result = await sendEmail({
      emailType: 'notification',
      domain: 'system',
      recipients: [{ email: 'one@example.com' }, { email: 'two@example.com' }],
      context: { title: 'Aviso', body: 'Contenido' }
    })

    expect(result).toMatchObject({ status: 'failed', dispatchOutcome: 'unknown' })
    expect(result.recipientResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ resendId: 'batch-resend-1', dispatchOutcome: 'accepted' }),
      expect.objectContaining({ resendId: 'batch-resend-2', dispatchOutcome: 'unknown' })
    ]))
  })

  it('returns failed aggregate when RESEND_API_KEY is not configured (config error is retryable)', async () => {
    mockIsResendConfigured.mockReturnValue(false)

    const result = await sendEmail({
      emailType: 'notification',
      domain: 'system',
      recipients: [{ email: 'user@example.com', name: 'User' }],
      context: { title: 'Test', body: 'Test body' }
    })

    expect(result.status).toBe('failed')
    expect(result.recipientResults).toBeDefined()
    expect(result.recipientResults?.[0]?.status).toBe('failed')
  })
})
