// One reading of what a frozen artifact says, for every lane (EPIC-053, TASK-2025).
//
// `replayFrozenArtifact` is what a consumer that stores or issues a quote asks: does it reproduce, did it calculate,
// is some row under its margin floor. The floor verdict decides whether issuing a quote needs the approval of a
// person, so it has ONE reading and that reading is held equal, over every artifact frozen in the repository, to the
// two things it could drift from: the kernel's diagnostics as they sit in the frozen text, and the rows the summary
// of the engine sizes for a reader (`linesBelowPolicyFloor`).
import { describe, expect, it } from 'vitest'

import { FLOOR_DIAGNOSTIC, replayFrozenArtifact, resultIsBelowFloor } from '../adapters/frozen-artifact'
import { COMPOSITION_VERSION, replayResourceComposition } from '../adapters/resource-composition'
import { PricingV3Error } from '../errors'
import { linesBelowPolicyFloor } from '../resources/summary'

import { loadStorageCorpus } from './storage-conformance'

const TIMEOUT = 120_000

// Every place a kernel result can sit inside an artifact, found without knowing the lane: any object that has a
// `diagnostics` array. Deliberately not the walk the function under test does.
const diagnosticCodes = (value: unknown, found: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach(item => diagnosticCodes(item, found))
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'diagnostics' && Array.isArray(child))
        child.forEach(diagnostic => found.push(String((diagnostic as { code?: unknown } | null)?.code)))
      else diagnosticCodes(child, found)
    }
  }

  return found
}

describe('what a frozen artifact says, after recomputing it', () => {
  const corpus = loadStorageCorpus()

  const verdicts = corpus.artifacts.map(artifact => {
    const value = JSON.parse(artifact.text) as { semantic: { result: unknown } }

    return { artifact, value, verdict: replayFrozenArtifact(value) }
  })

  it(
    'every artifact of the repository reproduces, under the identity it declares',
    () => {
      expect(verdicts.length).toBe(corpus.artifacts.length)

      for (const { artifact, verdict } of verdicts)
        expect(
          { artifactVersion: verdict.artifactVersion, replayDigest: verdict.replayDigest, calculationId: verdict.calculationId },
          artifact.path
        ).toEqual({ artifactVersion: artifact.artifactVersion, replayDigest: artifact.replayDigest, calculationId: artifact.calculationId })
    },
    TIMEOUT
  )

  it('the floor verdict is the kernel diagnostic, wherever the lane keeps it', () => {
    for (const { artifact, value, verdict } of verdicts)
      expect(verdict.belowFloor, artifact.path).toBe(diagnosticCodes(value.semantic.result).includes(FLOOR_DIAGNOSTIC))
  })

  // Replays every composition again: under coverage instrumentation it outgrew the default 15 s once the corpus took
  // the Réditos 2027 catalogs (CI Deep of 80a3fcfe7, 2026-10-24).
  it(
    'for a composition it is the same rows the summary of the engine sizes',
    () => {
      const compositions = verdicts.filter(({ verdict }) => verdict.artifactVersion === COMPOSITION_VERSION)

      expect(compositions.length).toBeGreaterThan(0)

      for (const { artifact, value, verdict } of compositions)
        expect(verdict.belowFloor, artifact.path).toBe(linesBelowPolicyFloor(replayResourceComposition(value).semantic.result).length > 0)
    },
    TIMEOUT
  )

  it('the corpus exercises both verdicts and both statuses', () => {
    // Without these the equalities above would hold over a corpus that never says "below the floor".
    expect(verdicts.filter(({ verdict }) => verdict.belowFloor).length).toBeGreaterThanOrEqual(3)
    expect(verdicts.filter(({ verdict }) => !verdict.belowFloor).length).toBeGreaterThan(0)
    expect(verdicts.filter(({ verdict }) => verdict.calculationStatus !== 'calculated').length).toBeGreaterThanOrEqual(1)
    expect(new Set(verdicts.map(({ verdict }) => verdict.artifactVersion)).size).toBeGreaterThanOrEqual(2)
  })

  it('a result is below the floor exactly when it carries the diagnostic', () => {
    expect(resultIsBelowFloor({ diagnostics: [] })).toBe(false)
    expect(resultIsBelowFloor({ diagnostics: [{ code: 'MISSING_COST' }] })).toBe(false)
    expect(resultIsBelowFloor({ diagnostics: [{ code: 'MISSING_COST' }, { code: FLOOR_DIAGNOSTIC }] })).toBe(true)
  })

  it('what is not an artifact of a known lane, or does not reproduce, is refused', () => {
    const refused = (raw: unknown) => {
      try {
        replayFrozenArtifact(raw)
      } catch (error) {
        return error instanceof PricingV3Error ? error.code : error
      }

      return 'resolved'
    }

    const { value } = verdicts[0]

    for (const raw of [null, 'text', {}, { artifactVersion: 'pricing-v3-unknown/1' }]) expect(refused(raw)).toBe('REPLAY_MISMATCH')
    expect(refused({ ...value, replayDigest: '0'.repeat(64) })).toBe('REPLAY_MISMATCH')
  })
})
