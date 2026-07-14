import { describe, expect, it, vi } from 'vitest'

import { submitPublicForm, type RendererApiConfig, verifyPublicEmail } from '../api-client'

const api: RendererApiConfig = { baseUrl: 'https://gh.test', slug: 'ai-visibility-intake' }

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('growth-forms-renderer · verifyPublicEmail', () => {
  it('maps a sanitized ok verdict', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        outcome: 'ok',
        syntaxValid: true,
        isCorporate: true,
        isDisposable: false,
        isRoleBased: false,
        isFreeProvider: false,
        deliverable: 'deliverable',
        quality: 'verified',
        suggestion: null,
        reasonCode: null,
      }),
    ) as unknown as typeof fetch

    const result = await verifyPublicEmail(api, 'ana@empresa.com', fetchImpl)

    expect(result.outcome).toBe('ok')

    if (result.outcome === 'ok') {
      expect(result.isCorporate).toBe(true)
      expect(result.reasonCode).toBeNull()
    }

    // POST al endpoint público correcto.
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://gh.test/api/public/growth/forms/ai-visibility-intake/verify-email',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('degrades honest: 404 → disabled (flag OFF), 429 → rate_limited', async () => {
    const off = vi.fn(async () => jsonResponse({ outcome: 'disabled' }, 404)) as unknown as typeof fetch
    const limited = vi.fn(async () => jsonResponse({ outcome: 'rate_limited' }, 429)) as unknown as typeof fetch

    expect((await verifyPublicEmail(api, 'x@y.com', off)).outcome).toBe('disabled')
    expect((await verifyPublicEmail(api, 'x@y.com', limited)).outcome).toBe('rate_limited')
  })

  it('maps network error and 5xx to error (never throws)', async () => {
    const throwing = vi.fn(async () => {
      throw new Error('network')
    }) as unknown as typeof fetch

    const serverError = vi.fn(async () => jsonResponse({ outcome: 'invalid' }, 502)) as unknown as typeof fetch

    expect((await verifyPublicEmail(api, 'x@y.com', throwing)).outcome).toBe('error')
    expect((await verifyPublicEmail(api, 'x@y.com', serverError)).outcome).toBe('error')
  })

  it('surfaces a typo suggestion when present', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        outcome: 'ok',
        syntaxValid: true,
        isCorporate: false,
        isDisposable: false,
        isRoleBased: false,
        isFreeProvider: true,
        deliverable: 'unknown',
        quality: 'suspect',
        suggestion: 'ana@gmail.com',
        reasonCode: 'email_not_corporate',
      }),
    ) as unknown as typeof fetch

    const result = await verifyPublicEmail(api, 'ana@gmial.com', fetchImpl)

    expect(result.outcome).toBe('ok')

    if (result.outcome === 'ok') {
      expect(result.suggestion).toBe('ana@gmail.com')
      expect(result.reasonCode).toBe('email_not_corporate')
    }
  })
})

describe('growth-forms-renderer · submitPublicForm', () => {
  it('passes captchaToken through the public submit body when provided', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ outcome: 'accepted', submissionId: 'sub_1' }, 202)) as unknown as typeof fetch

    const result = await submitPublicForm(
      api,
      {
        fields: { email: 'ana@empresa.com' },
        consent: true,
        consentCheckboxes: [],
        captchaToken: 'turnstile-token',
      },
      fetchImpl,
    )

    expect(result.outcome).toBe('accepted')
    const body = JSON.parse((fetchImpl as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock.calls[0][1].body)

    expect(body.captchaToken).toBe('turnstile-token')
    expect(body.fields.email).toBe('ana@empresa.com')
  })

  it('maps the public route message field into the sanitized reason', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ outcome: 'consent_required', message: 'consent requerido' }, 422),
    ) as unknown as typeof fetch

    const result = await submitPublicForm(
      api,
      {
        fields: { email: 'ana@empresa.com' },
        consent: false,
        consentCheckboxes: [],
      },
      fetchImpl,
    )

    expect(result).toMatchObject({ outcome: 'consent_required', reason: 'consent requerido' })
  })

  it('uses multipart only when files are present and keeps files out of the JSON payload', async () => {
    const cv = new File(['%PDF-1.7'], 'ana-cv.pdf', { type: 'application/pdf' })

    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.headers).toEqual({ accept: 'application/json' })
      expect(init.body).toBeInstanceOf(FormData)

      const body = init.body as FormData
      const payload = JSON.parse(body.get('payload') as string)

      expect(payload.fields).toEqual({ email: 'ana@empresa.com' })
      expect(JSON.stringify(payload)).not.toContain('ana-cv.pdf')
      expect(body.get('file:cvFile')).toBe(cv)

      return jsonResponse({ outcome: 'accepted', submissionId: 'sub_file' }, 202)
    }) as unknown as typeof fetch

    const result = await submitPublicForm(
      api,
      {
        fields: { email: 'ana@empresa.com' },
        files: { cvFile: cv },
        consent: true,
        consentCheckboxes: [],
      },
      fetchImpl,
    )

    expect(result.outcome).toBe('accepted')
  })
})
