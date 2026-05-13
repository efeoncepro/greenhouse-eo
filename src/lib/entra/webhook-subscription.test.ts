import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ query: vi.fn() }))
vi.mock('@/lib/secrets/secret-manager', () => ({ resolveSecret: vi.fn() }))

const { resolveNotificationUrl } = await import('./webhook-subscription')

describe('resolveNotificationUrl — env-aware URL resolution (ISSUE-075)', () => {
  const baseEnv = {} as NodeJS.ProcessEnv

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('uses GREENHOUSE_ENTRA_NOTIFICATION_URL when explicit override is set', () => {
    const env = {
      ...baseEnv,
      GREENHOUSE_ENTRA_NOTIFICATION_URL: 'https://custom.example.org/api/webhooks/entra-user-change',
      GREENHOUSE_PUBLIC_BASE_URL: 'https://wrong.example.com',
      NEXTAUTH_URL: 'https://also-wrong.example.com'
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://custom.example.org/api/webhooks/entra-user-change'
    )
  })

  it('falls back to GREENHOUSE_PUBLIC_BASE_URL appending canonical path', () => {
    const env = {
      ...baseEnv,
      GREENHOUSE_PUBLIC_BASE_URL: 'https://dev-greenhouse.efeoncepro.com',
      NEXTAUTH_URL: 'https://wrong.example.com'
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })

  it('falls back to NEXTAUTH_URL when GREENHOUSE_PUBLIC_BASE_URL absent', () => {
    const env = {
      ...baseEnv,
      NEXTAUTH_URL: 'https://greenhouse.efeoncepro.com'
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://greenhouse.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })

  it('falls back to production hardcoded URL when no env vars set', () => {
    expect(resolveNotificationUrl(baseEnv)).toBe(
      'https://greenhouse.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })

  it('strips trailing slash from base URL', () => {
    const env = {
      ...baseEnv,
      GREENHOUSE_PUBLIC_BASE_URL: 'https://dev-greenhouse.efeoncepro.com/'
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })

  it('strips multiple trailing slashes from base URL', () => {
    const env = {
      ...baseEnv,
      GREENHOUSE_PUBLIC_BASE_URL: 'https://dev-greenhouse.efeoncepro.com///'
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })

  it('trims whitespace from env values', () => {
    const env = {
      ...baseEnv,
      GREENHOUSE_PUBLIC_BASE_URL: '  https://dev-greenhouse.efeoncepro.com  '
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })

  it('ignores empty string env values and falls through to next priority', () => {
    const env = {
      ...baseEnv,
      GREENHOUSE_ENTRA_NOTIFICATION_URL: '',
      GREENHOUSE_PUBLIC_BASE_URL: '',
      NEXTAUTH_URL: 'https://fallback.efeoncepro.com'
    }

    expect(resolveNotificationUrl(env)).toBe(
      'https://fallback.efeoncepro.com/api/webhooks/entra-user-change'
    )
  })
})
