import { describe, expect, it, vi } from 'vitest'

import {
  analyzeImageIntegrity,
  deriveAssetResponseFindings,
  inspectAssetResponse,
  type AssetResponseLike
} from './asset-integrity'

const response = (
  resourceType: string,
  contentType: string,
  url = `https://studio.example.test/asset`,
  status = 200
): AssetResponseLike => ({
  status: () => status,
  url: () => url,
  headers: () => ({ 'content-type': contentType }),
  request: () => ({ resourceType: () => resourceType })
})

describe('inspectAssetResponse', () => {
  it.each([
    ['stylesheet', 'text/html', 'text/css'],
    ['image', 'text/html; charset=utf-8', 'image/*'],
    ['font', 'text/html', 'font/* (o MIME font legacy compatible)']
  ])('detects a 2xx HTML fallback for %s', (resourceType, contentType, expected) => {
    const issue = inspectAssetResponse(response(resourceType, contentType))

    expect(issue).toMatchObject({ resourceType, contentType: 'text/html', expected, status: 200 })
  })

  it.each([
    ['stylesheet', 'text/css; charset=utf-8'],
    ['image', 'image/svg+xml'],
    ['image', 'image/webp'],
    ['font', 'font/woff2'],
    ['font', 'application/font-woff'],
    ['font', 'application/octet-stream']
  ])('accepts compatible MIME for %s', (resourceType, contentType) => {
    expect(inspectAssetResponse(response(resourceType, contentType))).toBeUndefined()
  })

  it('ignores non-assets, non-2xx responses and non-http/data URLs', () => {
    expect(inspectAssetResponse(response('fetch', 'text/html'))).toBeUndefined()
    expect(inspectAssetResponse(response('image', 'text/html', 'https://x.test/missing.svg', 404))).toBeUndefined()
    expect(inspectAssetResponse(response('image', 'text/html', 'data:image/svg+xml;base64,PHN2Zz4='))).toBeUndefined()
  })

  it('removes query strings and fragments from persisted findings', () => {
    const issue = inspectAssetResponse(response('image', 'text/html', 'https://x.test/logo.svg?signature=secret#fragment'))

    expect(issue?.url).toBe('https://x.test/logo.svg')
  })
})

describe('deriveAssetResponseFindings', () => {
  const mismatch = inspectAssetResponse(response('image', 'text/html', 'https://x.test/logo.svg'))!

  it('emits a blocking typed finding in a premium gate', () => {
    expect(deriveAssetResponseFindings([mismatch], { enabled: true, failOnViolations: true })).toEqual([
      expect.objectContaining({
        severity: 'error',
        category: 'asset_integrity',
        code: 'asset_mime_mismatch',
        message: expect.stringContaining('https://x.test/logo.svg')
      })
    ])
  })

  it('is opt-in and respects explicit URL ignores', () => {
    expect(deriveAssetResponseFindings([mismatch], undefined)).toEqual([])
    expect(deriveAssetResponseFindings([mismatch], { enabled: true, ignoreUrlPatterns: ['logo\\.svg'] })).toEqual([])
  })
})

describe('analyzeImageIntegrity', () => {
  it('surfaces broken decoded images and deduplicates URLs', async () => {
    const evaluate = vi.fn().mockResolvedValue([
      { url: 'https://x.test/globe.svg', alt: 'Globe', complete: true, naturalWidth: 0, naturalHeight: 0, decodeError: 'decode failed' },
      { url: 'https://x.test/globe.svg', alt: 'Globe', complete: true, naturalWidth: 0, naturalHeight: 0 },
      { url: 'data:image/svg+xml;base64,PHN2Zz4=', alt: '', complete: true, naturalWidth: 0, naturalHeight: 0 }
    ])

    const findings = await analyzeImageIntegrity({ evaluate } as never, 'first-fold', {
      enabled: true,
      failOnViolations: true
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      severity: 'error',
      category: 'asset_integrity',
      code: 'asset_image_broken',
      frameLabel: 'first-fold'
    })
    expect(findings[0].message).toContain('Globe')
  })

  it('fails closed when the browser probe itself throws', async () => {
    const findings = await analyzeImageIntegrity({ evaluate: vi.fn().mockRejectedValue(new Error('context closed')) } as never, 'f', {
      enabled: true,
      failOnViolations: true
    })

    expect(findings[0]).toMatchObject({ code: 'asset_image_probe_failed', severity: 'error' })
  })
})
