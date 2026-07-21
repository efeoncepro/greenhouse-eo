import { describe, expect, it, vi } from 'vitest'

import { createMeetingApiClient } from '../api-client'
import { meetingConfirmedFixture } from '../fixtures'

const payload = {
  schedulerKey: 'efeonce-discovery-30',
  surfaceId: 'efeonce-public-site',
  slot: { startsAt: '2026-07-22T13:15:00.000Z', durationMinutes: 30, timezone: 'America/Santiago' },
  locale: 'es' as const,
  contact: { email: 'persona@empresa.cl', firstName: 'Ada', lastName: 'Lovelace', company: 'Empresa' },
  consent: { processingAccepted: true, communicationKeys: [] },
  captchaToken: 'captcha-token',
}

describe('meeting API client', () => {
  it('envía la zona detectada al resolver config', async () => {
    const config = (await import('../fixtures')).meetingConfigFixture()

    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      ...config,
      timezonePolicy: {
        ...config.timezonePolicy,
        allowedTimezones: ['America/Lima'],
        resolvedTimezone: 'America/Lima',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch

    await createMeetingApiClient('https://greenhouse.example', fetcher).config({
      surfaceId: 'efeonce-public-site',
      schedulerKey: 'efeonce-discovery-30',
      timezone: 'America/Lima',
    })

    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('timezone=America%2FLima'),
      expect.any(Object),
    )
  })

  it('envía POST una sola vez con Idempotency-Key', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(meetingConfirmedFixture()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch

    const result = await createMeetingApiClient('https://greenhouse.example', fetcher).book(payload, 'intent-123')

    expect(result.outcome).toBe('confirmed')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(
      'https://greenhouse.example/api/public/growth/meetings/book',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'Idempotency-Key': 'intent-123' }) }),
    )
  })

  it('convierte pérdida de transporte post-dispatch en check_email sin reintentar', async () => {
    const fetcher = vi.fn(async () => { throw new Error('network lost') }) as unknown as typeof fetch
    const result = await createMeetingApiClient('https://greenhouse.example', fetcher).book(payload, 'intent-123')

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      outcome: 'error',
      error: { code: 'provider_degraded', recovery: 'check_email', retryable: false },
    })
  })
})
