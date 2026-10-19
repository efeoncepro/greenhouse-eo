import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ forms: vi.fn(), legacy: vi.fn(), useForms: true }))

vi.mock('@/lib/growth/ai-visibility/public-intake', () => ({ createPublicGraderRun: mocks.legacy }))
vi.mock('@/lib/growth/ai-visibility/public-intake/forms-engine-binding', () => ({ createPublicGraderRunViaFormsEngine: mocks.forms }))
vi.mock('@/lib/growth/ai-visibility/flags', () => ({ isGraderIntakeOnFormsEngineEnabled: () => mocks.useForms }))
vi.mock('@/lib/growth/forms/store', () => ({ listActivePublicFormOrigins: async () => ['https://think.efeoncepro.com'] }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { resetPublicFormsCorsCacheForTests } from '@/app/api/public/growth/forms/cors'

import { OPTIONS, POST } from '../route'

const origin = 'https://think.efeoncepro.com'
const url = 'https://greenhouse.efeoncepro.com/api/public/growth/ai-visibility/run'
const accepted = { outcome: 'accepted', runPublicId: null, submissionId: 'offline-submission', reason: 'accepted' }
const receipt = { version: 1, transactionId: '11111111-1111-4111-8111-111111111111', conversionKey: 'commercial_lead' }

const request = (body: unknown, headers: Record<string, string> = {}) => new Request(url, {
  method: 'POST', headers: { 'content-type': 'application/json', origin, ...headers }, body: JSON.stringify(body),
})

beforeEach(() => {
  vi.clearAllMocks()
  resetPublicFormsCorsCacheForTests()
  mocks.useForms = true
  mocks.forms.mockResolvedValue(accepted)
  mocks.legacy.mockResolvedValue({ ...accepted, submissionId: null, runPublicId: 'display-only', pollToken: 'offline-poll' })
})

describe('Grader intake transport — no persistence or provider calls', () => {
  it('passes request visitor context and raw consent envelope to canonical Forms facade', async () => {
    const measurementContext = { advertisement: false }

    const response = await POST(request({ measurementContext, pageUri: origin + '/brand-visibility', pageName: 'Grader' }, {
      'x-forwarded-for': '192.0.2.1, 192.0.2.2', 'user-agent': 'Offline contract fixture', 'sec-gpc': '1',
    }))

    expect(response.status).toBe(202)
    expect(mocks.forms).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      ip: '192.0.2.1', userAgent: 'Offline contract fixture', origin, requestGlobalPrivacyControl: true,
      measurementContext, pageUri: origin + '/brand-visibility', pageName: 'Grader',
    }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.legacy).not.toHaveBeenCalled()
  })

  it('returns the dedicated accepted receipt without changing poll handles', async () => {
    mocks.forms.mockResolvedValue({ ...accepted, googleAdsConversion: receipt })
    const body = await (await POST(request({}))).json()

    expect(body.googleAdsConversion).toEqual(receipt)
    expect(body.submissionId).toBe(accepted.submissionId)
    expect(body.pollToken).toBeNull()
    expect(body).not.toHaveProperty('measurementContext')
  })

  it('omits receipt on rejected responses', async () => {
    mocks.forms.mockResolvedValue({ ...accepted, outcome: 'invalid', googleAdsConversion: receipt })
    const response = await POST(request({}))

    expect(response.status).toBe(400)
    expect(await response.json()).not.toHaveProperty('googleAdsConversion')
  })

  it.each([null, [], 'invalid'])('rejects non-object JSON before calling either command: %j', async body => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.forms).not.toHaveBeenCalled()
    expect(mocks.legacy).not.toHaveBeenCalled()
  })

  it('supports governed preflight; unknown origin has no ACAO', async () => {
    const allowed = await OPTIONS(new Request(url, { method: 'OPTIONS', headers: { origin } }))
    const denied = await OPTIONS(new Request(url, { method: 'OPTIONS', headers: { origin: 'https://unowned.invalid' } }))

    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(mocks.forms).not.toHaveBeenCalled()
  })

  it('preserves the legacy flag branch without creating a Forms receipt', async () => {
    mocks.useForms = false
    const body = await (await POST(request({}))).json()

    expect(mocks.forms).not.toHaveBeenCalled()
    expect(mocks.legacy).toHaveBeenCalledOnce()
    expect(body.pollToken).toBe('offline-poll')
    expect(body).not.toHaveProperty('googleAdsConversion')
  })

  it('keeps errors private and excludes context or receipt', async () => {
    mocks.forms.mockRejectedValue(new Error('offline failure'))
    const response = await POST(request({ measurementContext: { advertisement: true } }))

    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(await response.json()).toEqual({ error: expect.any(String) })
  })
})
