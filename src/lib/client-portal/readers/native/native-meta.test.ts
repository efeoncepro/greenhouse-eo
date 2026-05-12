// TASK-825 Slice 4 — Smoke tests for native reader metadata.
//
// Validates that every native reader in this folder exposes a
// `ClientPortalReaderMeta` that respects the invariants from spec V1.4 §3.1:
//   - classification === 'native'
//   - ownerDomain === null (native readers are BFF-owned, NO producer-domain)
//   - dataSources non-empty
//   - key matches the file slug
//
// When a new native reader is added, append it to NATIVE_METAS_UNDER_TEST.
// The `assertReaderMeta` runtime check catches structural drift; the per-meta
// assertions here pin the canonical contract for each native reader individually.
//
// Pattern source: curated-meta.test.ts (TASK-822 Slice 4) mirror.

import { describe, expect, it } from 'vitest'

import { assertReaderMeta, type ClientPortalReaderMeta } from '../../dto'

import { moduleResolverMeta } from './module-resolver'

const NATIVE_METAS_UNDER_TEST: ReadonlyArray<{ name: string; meta: ClientPortalReaderMeta }> = [
  { name: 'module-resolver', meta: moduleResolverMeta }
]

describe('client-portal/readers/native/* metadata contract (TASK-825 Slice 4)', () => {
  it.each(NATIVE_METAS_UNDER_TEST)(
    '$name declares a well-formed native ClientPortalReaderMeta',
    ({ name, meta }) => {
      expect(meta.key).toBe(name)
      expect(meta.classification).toBe('native')
      expect(meta.ownerDomain).toBeNull()
      expect(meta.clientFacing).toBe(true)
      expect(meta.routeGroup).toBe('client')
      expect(meta.dataSources.length).toBeGreaterThan(0)

      // Runtime invariant check — throws if native metadata violates §3.1.
      expect(() => assertReaderMeta(meta)).not.toThrow()
    }
  )

  it('module-resolver is the first native reader of the BFF (TASK-822 §3.1 invariant)', () => {
    expect(moduleResolverMeta.classification).toBe('native')
    expect(moduleResolverMeta.ownerDomain).toBeNull()
  })

  it('module-resolver declares only identity.organizations as data source (V1.0)', () => {
    // Forward-looking: TASK-826/827 podrían extender data_sources si emerge
    // necesidad. V1.0 solo lee organizations + client_portal tables (cross-schema
    // joins internos cuentan como 'identity.organizations' por la primary read).
    expect(moduleResolverMeta.dataSources).toEqual(['identity.organizations'])
  })
})
