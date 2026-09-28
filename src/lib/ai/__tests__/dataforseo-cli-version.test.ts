import { describe, expect, it } from 'vitest'

import {
  DATAFORSEO_CLI_VERSION,
  DATAFORSEO_CLI_VERSION_REGISTRY,
  validateDataForSeoCliVersionRegistry
} from '../dataforseo-cli-version'

describe('DataForSEO CLI version contract', () => {
  it('keeps the current version aligned with the append-only release registry', () => {
    expect(DATAFORSEO_CLI_VERSION).toBe('1.0.0')
    expect(DATAFORSEO_CLI_VERSION_REGISTRY.releases.at(-1)?.version).toBe(DATAFORSEO_CLI_VERSION)
    expect(DATAFORSEO_CLI_VERSION_REGISTRY.sourceDigest).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects duplicate or unordered releases', () => {
    expect(() =>
      validateDataForSeoCliVersionRegistry({
        ...DATAFORSEO_CLI_VERSION_REGISTRY,
        releases: [
          ...DATAFORSEO_CLI_VERSION_REGISTRY.releases,
          {
            version: DATAFORSEO_CLI_VERSION,
            date: '2026-09-28',
            bump: 'patch',
            summary: 'duplicada',
            changes: ['no válida'],
            sourceRefs: ['test']
          }
        ]
      })
    ).toThrow('ordenadas sin duplicados')
  })

  it('rejects a currentVersion that differs from the latest release', () => {
    expect(() =>
      validateDataForSeoCliVersionRegistry({
        ...DATAFORSEO_CLI_VERSION_REGISTRY,
        currentVersion: '9.9.9'
      })
    ).toThrow('no coincide')
  })
})
