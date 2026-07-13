import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { turnstileCaptchaVerifier } from '../captcha'

describe('growth/public-submission captcha verifier', () => {
  it('fails closed when the public submit does not provide a captcha token', async () => {
    const verifier = turnstileCaptchaVerifier({ NODE_ENV: 'development' })

    await expect(verifier.verify(null, '127.0.0.1')).resolves.toEqual({
      ok: false,
      reason: 'missing_token',
    })
  })

  it('keeps the local synthetic-token bypass when no Turnstile secret is configured', async () => {
    const verifier = turnstileCaptchaVerifier({ NODE_ENV: 'development' })

    await expect(verifier.verify('task-approved', '127.0.0.1')).resolves.toEqual({
      ok: true,
      reason: 'bypass_no_secret_non_prod',
    })
  })
})
