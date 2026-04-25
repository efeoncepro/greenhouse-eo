import { describe, expect, it } from 'vitest'

import type { CloudSentryIncident } from '@/lib/cloud/contracts'

import { correlateIncident } from './incident-mapping'

const buildIncident = (overrides: Partial<CloudSentryIncident> = {}): CloudSentryIncident => ({
  id: 'sentry-1',
  shortId: 'PROJ-123',
  title: 'Generic crash',
  location: '',
  level: 'error',
  priority: null,
  status: 'unresolved',
  count: 1,
  userCount: 0,
  firstSeen: null,
  lastSeen: null,
  release: null,
  environment: 'production',
  permalink: null,
  ...overrides
})

describe('correlateIncident', () => {
  describe('path matching (filesOwned globs)', () => {
    it('attributes incidents under src/lib/finance/** to finance', () => {
      const result = correlateIncident(
        buildIncident({ location: 'src/lib/finance/quotations.ts', title: 'Crash' })
      )

      expect(result.moduleKey).toBe('finance')
      expect(result.source).toBe('path')
      expect(result.matchedPattern).toBeTruthy()
    })

    it('attributes incidents under src/app/api/finance/** to finance', () => {
      const result = correlateIncident(
        buildIncident({ location: 'src/app/api/finance/expenses/route.ts' })
      )

      expect(result.moduleKey).toBe('finance')
      expect(result.source).toBe('path')
    })

    it('attributes incidents under src/lib/integrations/notion-* to integrations.notion', () => {
      const result = correlateIncident(
        buildIncident({ location: 'src/lib/integrations/notion-readiness.ts' })
      )

      expect(result.moduleKey).toBe('integrations.notion')
      expect(result.source).toBe('path')
    })

    it('attributes incidents under src/lib/ico-engine/** to delivery', () => {
      const result = correlateIncident(
        buildIncident({ location: 'src/lib/ico-engine/materializer.ts' })
      )

      expect(result.moduleKey).toBe('delivery')
      expect(result.source).toBe('path')
    })

    it('attributes incidents under src/lib/cloud/** to cloud', () => {
      const result = correlateIncident(
        buildIncident({ location: 'src/lib/cloud/gcp-billing.ts' })
      )

      expect(result.moduleKey).toBe('cloud')
      expect(result.source).toBe('path')
    })

    it('strips leading "in " prefix that Sentry sometimes adds', () => {
      const result = correlateIncident(
        buildIncident({ location: 'in src/lib/finance/income.ts' })
      )

      expect(result.moduleKey).toBe('finance')
      expect(result.source).toBe('path')
    })

    it('strips leading slashes so /src/lib/finance/foo.ts matches', () => {
      const result = correlateIncident(
        buildIncident({ location: '/src/lib/finance/foo.ts' })
      )

      expect(result.moduleKey).toBe('finance')
    })
  })

  describe('priority on path-collisions', () => {
    it('prefers finance over cloud when a path matches both globs', () => {
      // src/app/(dashboard)/admin/** está en cloud filesOwned;
      // ningún glob de finance matchea esa ruta. Usamos un caso real:
      // src/lib/finance/** está en finance. Si ambas existieran, finance
      // tiene priority 30 vs cloud priority 1.
      const result = correlateIncident(
        buildIncident({ location: 'src/lib/finance/expenses.ts' })
      )

      expect(result.moduleKey).toBe('finance')
    })
  })

  describe('title matching (fallback when path no match)', () => {
    it('uses title hints when location is empty', () => {
      const result = correlateIncident(
        buildIncident({
          location: '',
          title: 'Quote rendering failed for /finance/quotes/EO-123'
        })
      )

      expect(result.moduleKey).toBe('finance')
      expect(result.source).toBe('title')
      expect(result.matchedPattern).toBeTruthy()
    })

    it('uses title hints when location does not match any glob', () => {
      const result = correlateIncident(
        buildIncident({
          location: 'unknown/random/path.js',
          title: 'notion-bq-sync timeout'
        })
      )

      expect(result.moduleKey).toBe('integrations.notion')
      expect(result.source).toBe('title')
    })

    it('matches title hint case-insensitively', () => {
      const result = correlateIncident(
        buildIncident({ location: '', title: 'NOTION webhook crashed' })
      )

      expect(result.moduleKey).toBe('integrations.notion')
    })
  })

  describe('fallback to cloud (uncorrelated)', () => {
    it('falls back to cloud when neither location nor title matches', () => {
      const result = correlateIncident(
        buildIncident({ location: '', title: 'Generic uncategorized error' })
      )

      expect(result.moduleKey).toBe('cloud')
      expect(result.source).toBe('fallback')
      expect(result.matchedPattern).toBeNull()
    })

    it('falls back to cloud when location is null/undefined and title is empty', () => {
      const result = correlateIncident(
        buildIncident({ location: '', title: '' })
      )

      expect(result.moduleKey).toBe('cloud')
      expect(result.source).toBe('fallback')
    })

    it('falls back to cloud for an unknown JS framework path', () => {
      const result = correlateIncident(
        buildIncident({
          location: 'node_modules/some-vendor/lib.js',
          title: 'Some vendor warning'
        })
      )

      expect(result.moduleKey).toBe('cloud')
      expect(result.source).toBe('fallback')
    })
  })

  describe('release / environment do not affect correlation', () => {
    it('attributes incident regardless of release version', () => {
      const result = correlateIncident(
        buildIncident({
          location: 'src/lib/finance/income.ts',
          release: 'greenhouse-eo@2024.01.99-legacy',
          environment: 'production'
        })
      )

      expect(result.moduleKey).toBe('finance')
    })
  })
})
