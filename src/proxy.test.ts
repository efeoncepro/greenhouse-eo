import { NextRequest } from 'next/server'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { config, proxy } from '@/proxy'

describe('proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

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
  })

  it('includes vercel live in report-only csp', () => {
    const response = proxy(new NextRequest('https://example.com/dashboard'))

    expect(response.headers.get('Content-Security-Policy-Report-Only')).toContain('https://vercel.live')
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

  it('rewrites portal requests to maintenance with honest temporary outage headers', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true')

    const response = proxy(new NextRequest('https://example.com/dashboard'))

    expect(response.status).toBe(503)
    expect(response.headers.get('Retry-After')).toBe('3600')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('never gates the maintenance page or auth health endpoints', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true')

    const maintenanceResponse = proxy(new NextRequest('https://example.com/maintenance'))
    const authResponse = proxy(new NextRequest('https://example.com/api/auth/session'))

    expect(maintenanceResponse.status).toBe(200)
    expect(maintenanceResponse.headers.has('Retry-After')).toBe(false)
    expect(authResponse.status).toBe(200)
  })

  it('grants the operator bypass cookie when the query secret matches', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true')
    vi.stubEnv('MAINTENANCE_BYPASS_SECRET', 'greenhouse-secret')

    const response = proxy(new NextRequest('https://example.com/dashboard?gh_bypass=greenhouse-secret'))

    expect(response.status).toBe(200)
    expect(response.cookies.get('gh-maintenance-bypass')?.value).toBe('greenhouse-secret')
    expect(response.headers.has('Retry-After')).toBe(false)
  })
})

describe('proxy config', () => {
  it('keeps a conservative matcher that skips static assets and next internals', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)'
    ])
  })
})
