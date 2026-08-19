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

  it('enforces a self-only CSP and privacy headers on assessment session surfaces', () => {
    for (const path of [
      '/public/assessment/access',
      '/public/assessment/session',
      '/api/public/assessment/access/exchange',
      '/api/public/assessment/session',
    ]) {
      const response = proxy(new NextRequest(`https://example.com${path}`))
      const csp = response.headers.get('Content-Security-Policy') ?? ''

      expect(response.headers.has('Content-Security-Policy-Report-Only')).toBe(false)
      expect(csp).toContain("default-src 'self'")
      expect(csp).toContain("connect-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(csp).toMatch(/script-src 'self' 'nonce-[a-f0-9]+'/)
      expect(csp).not.toContain('https:')
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
      expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
      expect(response.headers.get('Cache-Control')).toContain('no-store')
      expect(response.headers.get('Pragma')).toBe('no-cache')
    }
  })

  it('never rewrites assessment access or session surfaces before the fragment scrub', () => {
    vi.stubEnv('MAINTENANCE_MODE', 'true')

    const assessmentPaths = [
      '/public/assessment/access',
      '/public/assessment/session',
      '/api/public/assessment/access/exchange',
      '/api/public/assessment/session',
    ]

    for (const canonicalPath of assessmentPaths) {
      for (const path of [canonicalPath, `${canonicalPath}/`, `${canonicalPath}///`]) {
        const response = proxy(new NextRequest(`https://example.com${path}`))
        const csp = response.headers.get('Content-Security-Policy') ?? ''

        expect(response.status).toBe(200)
        expect(response.headers.has('x-middleware-rewrite')).toBe(false)
        expect(csp).toMatch(/script-src 'self' 'nonce-[a-f0-9]+'/)
        expect(response.headers.get('Cache-Control')).toContain('no-store')
        expect(response.headers.get('Pragma')).toBe('no-cache')
        expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
      }
    }

    for (const falsePositive of [
      '/public/assessment/access/extra',
      '/public/assessment/session-other',
      '/api/public/assessment/access/exchange/extra',
      '/api/public/assessment/session-other',
    ]) {
      const response = proxy(new NextRequest(`https://example.com${falsePositive}`))

      expect(response.status).toBe(503)
      expect(response.headers.get('x-middleware-rewrite')).toContain('/maintenance')
      expect(response.headers.has('Content-Security-Policy')).toBe(false)
    }
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
