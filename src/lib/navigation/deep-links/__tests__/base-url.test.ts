import { describe, expect, it } from 'vitest'

import { joinGreenhouseAbsoluteUrl, resolveGreenhouseBaseUrl } from '../base-url'

describe('resolveGreenhouseBaseUrl', () => {
  it('prefers explicit override and trims trailing slash', () => {
    expect(resolveGreenhouseBaseUrl({ baseUrl: 'https://preview.example.com/' })).toBe('https://preview.example.com')
  })

  it('falls back to NEXTAUTH_URL before NEXT_PUBLIC_APP_URL', () => {
    expect(
      resolveGreenhouseBaseUrl({
        env: {
          NEXTAUTH_URL: 'https://auth.example.com/',
          NEXT_PUBLIC_APP_URL: 'https://app.example.com'
        } as unknown as NodeJS.ProcessEnv
      })
    ).toBe('https://auth.example.com')
  })

  it('uses NEXT_PUBLIC_APP_URL when NEXTAUTH_URL is absent', () => {
    expect(
      resolveGreenhouseBaseUrl({
        env: {
          NEXT_PUBLIC_APP_URL: 'https://app.example.com/'
        } as unknown as NodeJS.ProcessEnv
      })
    ).toBe('https://app.example.com')
  })

  it('uses VERCEL_URL when app urls are absent', () => {
    expect(
      resolveGreenhouseBaseUrl({
        env: {
          VERCEL_URL: 'greenhouse-preview.vercel.app'
        } as unknown as NodeJS.ProcessEnv
      })
    ).toBe('https://greenhouse-preview.vercel.app')
  })

  it('falls back to localhost in tests/dev', () => {
    expect(resolveGreenhouseBaseUrl({ env: {} as NodeJS.ProcessEnv })).toBe('http://localhost:3000')
  })
})

describe('joinGreenhouseAbsoluteUrl', () => {
  it('joins relative paths without duplicating slashes', () => {
    expect(joinGreenhouseAbsoluteUrl('https://greenhouse.efeoncepro.com/', '/admin/ops-health')).toBe(
      'https://greenhouse.efeoncepro.com/admin/ops-health'
    )
  })

  it('preserves absolute hrefs as-is', () => {
    expect(
      joinGreenhouseAbsoluteUrl('https://greenhouse.efeoncepro.com', 'https://public.example.com/quote/token')
    ).toBe('https://public.example.com/quote/token')
  })
})
