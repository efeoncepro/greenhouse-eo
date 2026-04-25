import { describe, expect, it } from 'vitest'

import { ApiPlatformError } from './errors'
import { API_PLATFORM_VERSION_HEADER, DEFAULT_API_PLATFORM_VERSION, resolveApiPlatformVersion } from './versioning'

describe('api platform versioning', () => {
  it('falls back to the default version when the header is omitted', () => {
    const version = resolveApiPlatformVersion(new Request('https://example.com/api/platform/ecosystem/context'))

    expect(version).toBe(DEFAULT_API_PLATFORM_VERSION)
  })

  it('accepts the current supported version', () => {
    const version = resolveApiPlatformVersion(
      new Request('https://example.com/api/platform/ecosystem/context', {
        headers: {
          [API_PLATFORM_VERSION_HEADER]: DEFAULT_API_PLATFORM_VERSION
        }
      })
    )

    expect(version).toBe(DEFAULT_API_PLATFORM_VERSION)
  })

  it('rejects unsupported versions', () => {
    expect(() =>
      resolveApiPlatformVersion(
        new Request('https://example.com/api/platform/ecosystem/context', {
          headers: {
            [API_PLATFORM_VERSION_HEADER]: '2025-01-01'
          }
        })
      )
    ).toThrow(ApiPlatformError)
  })
})
