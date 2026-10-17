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
  it('preserves Ads receipt only for a fresh eligible confirmation and ignores malformed instrumentation', async () => {
    const now=Date.now()
    const receipt={version:1,transactionId:'11111111-1111-4111-8111-111111111111',conversionKey:'meeting_booking',issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+600000).toISOString(),userData:{sha256_email_address:'a'.repeat(64)}}
    const book=async(patch:Record<string,unknown>={},status=200)=>createMeetingApiClient('https://greenhouse.example',vi.fn(async()=>new Response(JSON.stringify({...meetingConfirmedFixture(),googleAdsConversion:receipt,...patch}),{status,headers:{'content-type':'application/json'}})) as unknown as typeof fetch).book(payload,'intent-123')
    const fresh=await book()

    expect(fresh.outcome==='confirmed'&&fresh.googleAdsConversion).toEqual(receipt)

    for(const patch of [{conversionEligible:false},{conversionReceipt:null},{googleAdsConversion:{...receipt,userData:{email:'raw@example.test'}}}]) {
      const result=await book(patch)

      expect(result.outcome).toBe('confirmed')
      expect(result.outcome==='confirmed'&&result.googleAdsConversion).toBeUndefined()
    }

    const failed=await book({},400)

    expect(failed.outcome==='confirmed'&&failed.googleAdsConversion).toBeUndefined()
  })
  it('verifica el correo contra la surface gobernada sin exponerlo en la URL', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      outcome: 'ok',
      accepted: false,
      syntaxValid: true,
      isCorporate: false,
      isDisposable: false,
      suggestion: null,
      reasonCode: 'email_not_corporate',
    }), { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch

    const result = await createMeetingApiClient('https://greenhouse.example', fetcher).verifyEmail({
      surfaceId: 'efeonce-public-site',
      schedulerKey: 'efeonce-discovery-30',
      email: 'persona@gmail.com',
    })

    expect(result).toMatchObject({ outcome: 'ok', accepted: false, reasonCode: 'email_not_corporate' })
    expect(fetcher).toHaveBeenCalledWith(
      'https://greenhouse.example/api/public/growth/meetings/verify-email',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('persona@gmail.com'),
      }),
    )
    expect(String(vi.mocked(fetcher).mock.calls[0]?.[0])).not.toContain('persona@gmail.com')
  })

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
