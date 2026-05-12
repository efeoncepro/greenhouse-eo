// TASK-822 Slice 4 — Smoke tests for curated re-export metadata.
//
// Validates that every curated re-export in this folder exposes a
// `ClientPortalReaderMeta` that respects the invariants from spec §3.1:
//   - classification === 'curated'
//   - ownerDomain non-null (the producer domain that retains canonical ownership)
//   - dataSources non-empty
//   - key matches the file slug
//
// When a new curated re-export is added, append it to CURATED_METAS_UNDER_TEST.
// The `assertReaderMeta` runtime check catches structural drift; the per-meta
// assertions here pin the canonical contract for each re-export individually.

import { describe, expect, it } from 'vitest'

import { assertReaderMeta, type ClientPortalReaderMeta } from '../../dto'
import { accountSummaryMeta } from './account-summary'
import { icoOverviewMeta } from './ico-overview'

const CURATED_METAS_UNDER_TEST: ReadonlyArray<{ name: string; meta: ClientPortalReaderMeta }> = [
  { name: 'account-summary', meta: accountSummaryMeta },
  { name: 'ico-overview', meta: icoOverviewMeta }
]

describe('client-portal/readers/curated/* metadata contract (TASK-822 Slice 4)', () => {
  it.each(CURATED_METAS_UNDER_TEST)(
    '$name declares a well-formed curated ClientPortalReaderMeta',
    ({ name, meta }) => {
      expect(meta.key).toBe(name)
      expect(meta.classification).toBe('curated')
      expect(meta.ownerDomain).not.toBeNull()
      expect(meta.clientFacing).toBe(true)
      expect(meta.routeGroup).toBe('client')
      expect(meta.dataSources.length).toBeGreaterThan(0)

      // Runtime invariant check — throws if curated metadata violates §3.1.
      expect(() => assertReaderMeta(meta)).not.toThrow()
    }
  )

  it('account-summary owner is account-360 (ownership stays in producer domain)', () => {
    expect(accountSummaryMeta.ownerDomain).toBe('account-360')
  })

  it('ico-overview owner is ico-engine (ownership stays in producer domain)', () => {
    expect(icoOverviewMeta.ownerDomain).toBe('ico-engine')
  })
})

describe('assertReaderMeta invariants (TASK-822 §3.1)', () => {
  it('throws when curated meta has null ownerDomain', () => {
    expect(() =>
      assertReaderMeta({
        key: 'broken',
        classification: 'curated',
        ownerDomain: null,
        dataSources: ['agency.ico'],
        clientFacing: true,
        routeGroup: 'client'
      })
    ).toThrow(/curated but ownerDomain is null/)
  })

  it('throws when native meta declares ownerDomain', () => {
    expect(() =>
      assertReaderMeta({
        key: 'broken-native',
        classification: 'native',
        ownerDomain: 'agency',
        dataSources: ['agency.ico'],
        clientFacing: true,
        routeGroup: 'client'
      })
    ).toThrow(/native but declares ownerDomain/)
  })

  it('throws when dataSources is empty', () => {
    expect(() =>
      assertReaderMeta({
        key: 'no-sources',
        classification: 'curated',
        ownerDomain: 'agency',
        dataSources: [],
        clientFacing: true,
        routeGroup: 'client'
      })
    ).toThrow(/declares zero dataSources/)
  })
})
