import { describe, expect, it } from 'vitest'

import {
  buildPublicSiteBridgeCanonicalRequest,
  hashPublicSiteBridgeBody,
  signPublicSiteBridgeRequest
} from '../bridge-signing'

describe('public site bridge signing', () => {
  it('builds a stable canonical request and HMAC headers', () => {
    const body = JSON.stringify({
      contractVersion: 'greenhouse-wp-bridge-draft.v1',
      greenhouseManifestId: 'landing.demo',
      title: 'Demo',
      slug: 'demo'
    })

    const signed = signPublicSiteBridgeRequest({
      method: 'post',
      route: '/greenhouse-wp-bridge/v1/drafts',
      body,
      secret: 'test-secret',
      timestamp: 1780000000,
      requestId: 'gh-test-request-001',
      actor: 'codex-test',
      environment: 'test'
    })

    expect(hashPublicSiteBridgeBody(body)).toBe(
      '82e99918c4de2563d89450d42cdbf7e16c52db5cdda51fd3486690007668804d'
    )
    expect(signed.canonicalRequest).toBe(
      [
        'GHWPB-HMAC-SHA256',
        'POST',
        '/greenhouse-wp-bridge/v1/drafts',
        '82e99918c4de2563d89450d42cdbf7e16c52db5cdda51fd3486690007668804d',
        '1780000000',
        'gh-test-request-001',
        'codex-test',
        'test'
      ].join('\n')
    )
    expect(signed.headers).toEqual({
      'X-Greenhouse-Timestamp': '1780000000',
      'X-Greenhouse-Request-Id': 'gh-test-request-001',
      'X-Greenhouse-Actor': 'codex-test',
      'X-Greenhouse-Environment': 'test',
      'X-Greenhouse-Body-Sha256': '82e99918c4de2563d89450d42cdbf7e16c52db5cdda51fd3486690007668804d',
      'X-Greenhouse-Signature': 'sha256=52334910227ca04cb9c03db2abfc682c56b8ef1a4608612818382823ed3208a5'
    })
  })

  it('exposes the canonical builder used by the WordPress verifier', () => {
    expect(
      buildPublicSiteBridgeCanonicalRequest({
        method: 'PATCH',
        route: '/greenhouse-wp-bridge/v1/drafts/landing.demo',
        bodyHash: '0'.repeat(64),
        timestamp: '1780000001',
        requestId: 'gh-test-request-002',
        actor: 'codex-test',
        environment: 'test'
      })
    ).toContain('/greenhouse-wp-bridge/v1/drafts/landing.demo')
  })
})
