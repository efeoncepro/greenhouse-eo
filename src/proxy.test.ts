import { NextRequest } from 'next/server'

import { describe, expect, it, vi } from 'vitest'

import { config, proxy } from '@/proxy'

describe('proxy', () => {
  it('applies the baseline security headers', () => {
    const response = proxy(new NextRequest('https://example.com/dashboard'))

    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(), browsing-topics=()')
    expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('on')
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain("default-src 'self'")
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain("object-src 'none'")
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain('https://login.microsoftonline.com')
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain('https://accounts.google.com')
    expect(response.headers.has('Strict-Transport-Security')).toBe(false)
  })

  it('adds hsts only for production', () => {
    vi.stubEnv('VERCEL_ENV', 'production')

    const response = proxy(new NextRequest('https://example.com/login'))

    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains; preload')

    vi.unstubAllEnvs()
  })

  it('allows vercel live frames outside production', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')

    const response = proxy(new NextRequest('https://example.com/dashboard'))

    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain('https://vercel.live')

    vi.unstubAllEnvs()
  })

  it('keeps vercel live out of production csp', () => {
    vi.stubEnv('VERCEL_ENV', 'production')

    const response = proxy(new NextRequest('https://example.com/dashboard'))

    expect(response.headers.get('Content-Security-Policy-Report-Only')).not.toContain('https://vercel.live')

    vi.unstubAllEnvs()
  })

  it('responds cleanly to page OPTIONS requests', () => {
    const request = new NextRequest('https://example.com/dashboard', {
      method: 'OPTIONS'
    })

    const response = proxy(request)

    expect(response.status).toBe(204)
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('does not short-circuit api OPTIONS requests', () => {
    const request = new NextRequest('https://example.com/api/finance/income', {
      method: 'OPTIONS'
    })

    const response = proxy(request)

    expect(response.status).toBe(200)
  })
})

describe('proxy config', () => {
  it('keeps a conservative matcher that skips static assets and next internals', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)'
    ])
  })
})
