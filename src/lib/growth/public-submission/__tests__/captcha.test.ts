import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { turnstileCaptchaVerifier } from '../captcha'

describe('growth/public-submission captcha verifier', () => {
  afterEach(() => vi.unstubAllGlobals())

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

  it('rejects a successful token issued for another hostname', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: 'attacker.example',
      action: 'meeting_booking',
    }))))

    const verifier = turnstileCaptchaVerifier(
      { NODE_ENV: 'production', TURNSTILE_SECRET: 'secret' },
      { expectedHostname: 'efeoncepro.com', expectedAction: 'meeting_booking' },
    )

    await expect(verifier.verify('token', '127.0.0.1')).resolves.toEqual({
      ok: false,
      reason: 'hostname_mismatch',
    })
  })

  it('requires the scheduler-specific Turnstile action', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      hostname: 'efeoncepro.com',
      action: 'contact_form',
    }))))

    const verifier = turnstileCaptchaVerifier(
      { NODE_ENV: 'production', TURNSTILE_SECRET: 'secret' },
      { expectedHostname: 'efeoncepro.com', expectedAction: 'meeting_booking' },
    )

    await expect(verifier.verify('token', '127.0.0.1')).resolves.toEqual({
      ok: false,
      reason: 'action_mismatch',
    })
  })
})
