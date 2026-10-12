import { PricingV3Error } from '../errors'
import { QUOTE_VERSION } from '../catalog/quote'
import { replayCatalogQuote } from './catalog-local'
import { replayPricingV3 } from './local-snapshot'
import { COMPOSITION_VERSION, replayResourceComposition } from './resource-composition'

/**
 * What the engine says about a frozen artifact, whatever its lane, after recomputing it.
 *
 * A consumer that stores or issues a quote needs three facts no matter which of the three lanes froze it: that it
 * still reproduces, whether it calculated, and whether the kernel flagged a row under its margin floor. Each lane
 * keeps those facts in a different place, and before this function every consumer walked the artifact on its own.
 * This is the one reading: it replays the artifact with the replay of its lane and reads the facts from the
 * RECOMPUTED result, typed, never from the text it was handed.
 *
 * The floor verdict is the kernel's: a `MARGIN_BELOW_FLOOR` diagnostic on some row of some period (calculate.ts).
 * `resources/summary.ts` (`linesBelowPolicyFloor`) sizes those same rows for a reader; a test holds the two equal
 * over every composition frozen in the repository.
 */
export const FLOOR_DIAGNOSTIC = 'MARGIN_BELOW_FLOOR'

type Diagnosed = { diagnostics: readonly { code: string }[] }

/** Whether the kernel flagged a row of this result under its margin floor. */
export const resultIsBelowFloor = (result: Diagnosed): boolean =>
  result.diagnostics.some(diagnostic => diagnostic.code === FLOOR_DIAGNOSTIC)

const somePeriodIsBelowFloor = (periods: readonly { result: Diagnosed }[]): boolean =>
  periods.some(period => resultIsBelowFloor(period.result))

export const LOCAL_ARTIFACT_VERSION = 'pricing-v3-local-artifact/1'

export type FrozenArtifactVerdict = {
  artifactVersion: typeof LOCAL_ARTIFACT_VERSION | typeof QUOTE_VERSION | typeof COMPOSITION_VERSION
  replayDigest: string
  calculationId: string
  /** `calculated`, or whatever else the engine reported. Only a calculated artifact is a quote. */
  calculationStatus: string
  /** Some row of some period is under its margin floor. */
  belowFloor: boolean
}

/**
 * Replays a frozen artifact with the replay of its lane and reports what the recomputed result says.
 * `REPLAY_MISMATCH` when it is not an artifact of a known lane or does not reproduce its digest.
 */
export function replayFrozenArtifact(raw: unknown): FrozenArtifactVerdict {
  const lane = (raw as { artifactVersion?: unknown } | null)?.artifactVersion

  if (lane === LOCAL_ARTIFACT_VERSION) {
    const artifact = replayPricingV3(raw)
    const result = artifact.semantic.result

    return {
      artifactVersion: LOCAL_ARTIFACT_VERSION,
      replayDigest: artifact.replayDigest,
      calculationId: artifact.calculationId,
      calculationStatus: result.calculationStatus,
      belowFloor: resultIsBelowFloor(result)
    }
  }

  if (lane === QUOTE_VERSION) {
    const artifact = replayCatalogQuote(raw)
    const quote = artifact.semantic.result

    return {
      artifactVersion: QUOTE_VERSION,
      replayDigest: artifact.replayDigest,
      calculationId: artifact.calculationId,
      calculationStatus: quote.calculationStatus,
      belowFloor: somePeriodIsBelowFloor(quote.periods)
    }
  }

  if (lane === COMPOSITION_VERSION) {
    const artifact = replayResourceComposition(raw)
    const quote = artifact.semantic.result.quote

    return {
      artifactVersion: COMPOSITION_VERSION,
      replayDigest: artifact.replayDigest,
      calculationId: artifact.calculationId,
      calculationStatus: quote.calculationStatus,
      belowFloor: somePeriodIsBelowFloor(quote.periods)
    }
  }

  throw new PricingV3Error('REPLAY_MISMATCH')
}
