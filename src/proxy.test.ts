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
    expect(response.headers.has('Strict-Transport-Security')).toBe(false)
  })

  it('adds hsts only for production', () => {
    vi.stubEnv('VERCEL_ENV', 'production')

    const response = proxy(new NextRequest('https://example.com/login'))

    expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains; preload')

    vi.unstubAllEnvs()
  })
})

describe('proxy config', () => {
  it('keeps a conservative matcher that skips static assets and next internals', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)'
    ])
  })
})
