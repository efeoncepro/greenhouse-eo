import { describe, expect, it } from 'vitest'

import type { KnowledgeGoldenQuestion } from './golden-questions'
import {
  aggregateArmMetrics,
  cosineSimilarity,
  evaluateGoldenQuestion,
  rrfFuse,
  type RetrievalEvalResultInput
} from './retrieval-eval'

const q = (overrides: Partial<KnowledgeGoldenQuestion>): KnowledgeGoldenQuestion => ({
  id: 'q',
  description: 'd',
  query: 'x',
  mode: 'human',
  ...overrides
})

const res = (overrides: Partial<RetrievalEvalResultInput>): RetrievalEvalResultInput => ({
  orderedTitles: [],
  orderedDocIds: [],
  confidence: 'none',
  deniedOrFilteredCount: 0,
  ...overrides
})

describe('evaluateGoldenQuestion (TASK-1136)', () => {
  it('recall pass when expected title appears anywhere', () => {
    const e = evaluateGoldenQuestion(
      q({ expectAnyTitleIncludes: 'Nómina', expectMinConfidence: 'medium' }),
      res({ orderedTitles: ['Guía de Nómina'], orderedDocIds: ['d1'], confidence: 'high' })
    )

    expect(e.passed).toBe(true)
    expect(e.firstRelevantRank).toBe(1)
    expect(e.failureClass).toBe('none')
  })

  it('lexical_miss when expected title absent but other results present', () => {
    const e = evaluateGoldenQuestion(
      q({ expectAnyTitleIncludes: 'Nómina' }),
      res({ orderedTitles: ['Otro doc'], orderedDocIds: ['d9'], confidence: 'low' })
    )

    expect(e.passed).toBe(false)
    expect(e.failureClass).toBe('lexical_miss')
  })

  it('corpus_gap when expected title absent and zero results', () => {
    const e = evaluateGoldenQuestion(
      q({ expectAnyTitleIncludes: 'Nómina' }),
      res({ orderedTitles: [], orderedDocIds: [], confidence: 'none' })
    )

    expect(e.failureClass).toBe('corpus_gap')
  })

  it('wrong_source when forbidden title returned', () => {
    const e = evaluateGoldenQuestion(
      q({ expectAnyTitleIncludes: 'ICO', mustNotReturnTitleIncludes: 'nómina' }),
      res({ orderedTitles: ['Motor ICO', 'Períodos de nómina'], orderedDocIds: ['d1', 'd2'], confidence: 'high' })
    )

    expect(e.passed).toBe(false)
    expect(e.failureClass).toBe('wrong_source')
  })

  it('wrong_source when correct doc present but not first', () => {
    const e = evaluateGoldenQuestion(
      q({ expectFirstTitleIncludes: 'Finiquitos', expectMinConfidence: 'medium' }),
      res({ orderedTitles: ['People end-to-end', 'Finiquitos'], orderedDocIds: ['d1', 'd2'], confidence: 'high' })
    )

    expect(e.passed).toBe(false)
    expect(e.failureClass).toBe('wrong_source')
  })

  it('cross_doc_miss when fewer distinct docs than expected', () => {
    const e = evaluateGoldenQuestion(
      q({ expectDistinctDocumentsAtLeast: 2, expectMinConfidence: 'low' }),
      res({ orderedTitles: ['A', 'A2'], orderedDocIds: ['d1', 'd1'], confidence: 'medium' })
    )

    expect(e.passed).toBe(false)
    expect(e.failureClass).toBe('cross_doc_miss')
  })

  it('no_answer_violation when answer returned for off-corpus question', () => {
    const e = evaluateGoldenQuestion(
      q({ expectNoAnswer: true }),
      res({ orderedTitles: ['Algún doc'], orderedDocIds: ['d1'], confidence: 'low' })
    )

    expect(e.passed).toBe(false)
    expect(e.failureClass).toBe('no_answer_violation')
  })

  it('no-answer pass when honest none', () => {
    const e = evaluateGoldenQuestion(
      q({ expectNoAnswer: true }),
      res({ orderedTitles: [], orderedDocIds: [], confidence: 'none' })
    )

    expect(e.passed).toBe(true)
  })

  it('denied_preservation failure in agentic policy case', () => {
    const e = evaluateGoldenQuestion(
      q({ mode: 'agentic', expectAnyTitleIncludes: 'nómina', expectDeniedAtLeast: 1 }),
      res({ orderedTitles: ['Períodos de nómina'], orderedDocIds: ['d1'], confidence: 'high', deniedOrFilteredCount: 0 })
    )

    expect(e.passed).toBe(false)
    expect(e.failureClass).toBe('denied_preservation')
  })
})

describe('aggregateArmMetrics (TASK-1136)', () => {
  it('computes pass rate, MRR and failure class counts', () => {
    const questions = [
      q({ id: 'a', expectAnyTitleIncludes: 'X' }),
      q({ id: 'b', expectAnyTitleIncludes: 'Y' })
    ]

    const evals = [
      evaluateGoldenQuestion(questions[0], res({ orderedTitles: ['noise', 'X doc'], orderedDocIds: ['d1', 'd2'], confidence: 'high' })),
      evaluateGoldenQuestion(questions[1], res({ orderedTitles: [], orderedDocIds: [], confidence: 'none' }))
    ]

    const m = aggregateArmMetrics(evals, questions)

    expect(m.total).toBe(2)
    expect(m.passed).toBe(1)
    expect(m.passRate).toBeCloseTo(0.5)
    // a: rank 2 → 1/2; b: miss → 0 ; MRR = 0.25
    expect(m.mrr).toBeCloseTo(0.25)
    expect(m.recallRate).toBeCloseTo(0.5)
    expect(m.failureClassCounts.corpus_gap).toBe(1)
  })
})

describe('cosineSimilarity (TASK-1136)', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns 0 on length mismatch or empty', () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0)
    expect(cosineSimilarity([], [])).toBe(0)
  })
})

describe('rrfFuse (TASK-1136)', () => {
  it('ranks an item appearing high in both lists first', () => {
    const fused = rrfFuse([
      ['a', 'b', 'c'],
      ['b', 'a', 'd']
    ])

    // 'a' and 'b' each appear in both; 'b' is rank1 in list2 + rank2 in list1.
    expect(fused.slice(0, 2).sort()).toEqual(['a', 'b'])
    expect(fused).toContain('c')
    expect(fused).toContain('d')
  })

  it('is deterministic and stable on ties', () => {
    const a = rrfFuse([['x', 'y'], ['x', 'y']])
    const b = rrfFuse([['x', 'y'], ['x', 'y']])

    expect(a).toEqual(b)
    expect(a[0]).toBe('x')
  })
})
