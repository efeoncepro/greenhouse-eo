import { describe, expect, it } from 'vitest'

import { cosineSimilarity, hybridFuse, rrfFuse } from './retrieval-fusion'

describe('rrfFuse (TASK-1136/1151)', () => {
  it('ranks an item appearing high in both lists first', () => {
    const fused = rrfFuse([['a', 'b', 'c'], ['b', 'a', 'd']])

    expect(fused.slice(0, 2).sort()).toEqual(['a', 'b'])
  })

  it('weights favor the heavier list', () => {
    // 'x' is rank1 in list2 (weight 3); 'a' is rank1 in list1 (weight 1).
    const fused = rrfFuse([['a'], ['x']], 60, [1, 3])

    expect(fused[0]).toBe('x')
  })

  it('is deterministic on ties', () => {
    expect(rrfFuse([['x', 'y'], ['x', 'y']])).toEqual(rrfFuse([['x', 'y'], ['x', 'y']]))
  })
})

describe('cosineSimilarity (TASK-1151)', () => {
  it('1 for identical, 0 for orthogonal/empty/mismatch', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    expect(cosineSimilarity([1, 2], [1])).toBe(0)
  })
})

describe('hybridFuse — two-tier fusion (TASK-1151)', () => {
  const strongFtsRank = 0.15
  const limit = 8

  it('protects strong FTS hits — never demoted by a vector-only chunk', () => {
    const fts = [
      { id: 'strong1', score: 0.9 },
      { id: 'strong2', score: 0.3 }
    ]

    const vectorOrdered = ['vec1', 'vec2'] // vector-only, high cosine order

    const fused = hybridFuse(fts, vectorOrdered, { strongFtsRank, limit })

    // strong FTS keep the top in FTS order; vector-only fills the tail.
    expect(fused.slice(0, 2)).toEqual(['strong1', 'strong2'])
    expect(fused).toContain('vec1')
    expect(fused).toContain('vec2')
  })

  it('lets a vector-only chunk beat a WEAK incidental FTS chunk', () => {
    const fts = [{ id: 'weakIncidental', score: 0.06 }] // below strong threshold
    const vectorOrdered = ['relevantVec'] // vector-only, top cosine

    const fused = hybridFuse(fts, vectorOrdered, { strongFtsRank, limit })

    // Tier-2 RRF: both at rank 1 → both present; the vector-only is NOT excluded by the weak FTS.
    expect(fused).toContain('relevantVec')
    expect(fused).toContain('weakIncidental')
  })

  it('dedupes a chunk present in both FTS and vector lists', () => {
    const fts = [{ id: 'shared', score: 0.9 }]
    const vectorOrdered = ['shared', 'vecOnly']

    const fused = hybridFuse(fts, vectorOrdered, { strongFtsRank, limit })

    expect(fused.filter(id => id === 'shared')).toHaveLength(1)
    expect(fused).toContain('vecOnly')
  })

  it('respects the limit', () => {
    const fts = Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, score: 0.9 }))
    const vectorOrdered = Array.from({ length: 10 }, (_, i) => `v${i}`)

    expect(hybridFuse(fts, vectorOrdered, { strongFtsRank, limit: 8 })).toHaveLength(8)
  })

  it('all-strong FTS filling the limit leaves no room for vector-only (golden-safe extreme)', () => {
    const fts = Array.from({ length: 8 }, (_, i) => ({ id: `f${i}`, score: 0.9 }))
    const vectorOrdered = ['vecOnly']

    const fused = hybridFuse(fts, vectorOrdered, { strongFtsRank, limit: 8 })

    expect(fused).toHaveLength(8)
    expect(fused).not.toContain('vecOnly') // strong FTS is never sacrificed
  })
})
