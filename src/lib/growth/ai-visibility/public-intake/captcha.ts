import 'server-only'

/**
 * TASK-1240 — Growth AI Visibility · Captcha verifier port (EPIC-020 B).
 *
 * Puerto provider-neutral: la impl V1 es Cloudflare Turnstile (gratis, sin PII a
 * Google, baja fricción). Reversible — swap de provider sin tocar el command.
 *
 * Secret hygiene: el secret se resuelve server-side desde `TURNSTILE_SECRET`. Si NO
 * hay secret:
 *  - en NO producción → **bypass** (verificación deshabilitada, para dev/test);
 *  - en producción con el intake ON → **fail-closed** (rechaza), nunca abre el
 *    intake público sin captcha real.
 */

export interface CaptchaVerification {
  ok: boolean
  reason: string
}

export interface CaptchaVerifier {
  verify(token: string | null, remoteIp: string | null): Promise<CaptchaVerification>
}

const TURNSTILE_SECRET_ENV = 'TURNSTILE_SECRET'
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const isProduction = (env: NodeJS.ProcessEnv): boolean => env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production'

/** Verifier canónico Turnstile con bypass dev / fail-closed prod. */
export const turnstileCaptchaVerifier = (env: NodeJS.ProcessEnv = process.env): CaptchaVerifier => ({
  async verify(token, remoteIp) {
    const secret = env[TURNSTILE_SECRET_ENV]

    if (!secret) {
      // Sin secret: bypass en dev/test, fail-closed en prod (no abrir sin captcha real).
      return isProduction(env)
        ? { ok: false, reason: 'captcha_not_configured' }
        : { ok: true, reason: 'bypass_no_secret_non_prod' }
    }

    if (!token) {
      return { ok: false, reason: 'missing_token' }
    }

    try {
      const body = new URLSearchParams({ secret, response: token })

      if (remoteIp) body.set('remoteip', remoteIp)

      const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body })
      const data = (await response.json()) as { success?: boolean }

      return data.success === true ? { ok: true, reason: 'verified' } : { ok: false, reason: 'rejected' }
    } catch {
      // Error de red al verificar → fail-closed (no asumir humano).
      return { ok: false, reason: 'verify_error' }
    }
  }
})
