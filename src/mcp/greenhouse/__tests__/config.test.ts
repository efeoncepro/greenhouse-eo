import { describe, expect, it } from 'vitest'

import { resolveGreenhouseMcpConfig } from '../config'

describe('resolveGreenhouseMcpConfig', () => {
  it('normalizes required env vars and trims trailing slash from base URL', () => {
    const config = resolveGreenhouseMcpConfig({
      GREENHOUSE_MCP_API_BASE_URL: 'https://greenhouse.example.com/',
      GREENHOUSE_MCP_CONSUMER_TOKEN: 'secret-token',
      GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE: 'organization',
      GREENHOUSE_MCP_EXTERNAL_SCOPE_ID: 'org_123'
    })

    expect(config).toEqual({
      apiBaseUrl: 'https://greenhouse.example.com',
      consumerToken: 'secret-token',
      externalScopeType: 'organization',
      externalScopeId: 'org_123',
      apiVersion: '2026-04-25',
      requestTimeoutMs: 15000
    })
  })

  it('throws a clear error when required env vars are missing', () => {
    expect(() =>
      resolveGreenhouseMcpConfig({
        GREENHOUSE_MCP_API_BASE_URL: 'https://greenhouse.example.com'
      })
    ).toThrow(/GREENHOUSE_MCP_CONSUMER_TOKEN/)
  })

  it('accepts a custom request timeout when provided', () => {
    const config = resolveGreenhouseMcpConfig({
      GREENHOUSE_MCP_API_BASE_URL: 'https://greenhouse.example.com/',
      GREENHOUSE_MCP_CONSUMER_TOKEN: 'secret-token',
      GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE: 'organization',
      GREENHOUSE_MCP_EXTERNAL_SCOPE_ID: 'org_123',
      GREENHOUSE_MCP_REQUEST_TIMEOUT_MS: '9000'
    })

    expect(config.requestTimeoutMs).toBe(9000)
  })
})
