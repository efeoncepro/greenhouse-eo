import { createHash } from 'node:crypto'

import Decimal from 'decimal.js'

import { calculatePricingV3 } from '../calculate'
import { PricingV3Error } from '../errors'
import { isPricingV3EngineVersion, parsePricingV3Input } from '../schemas'
import type { PricingV3Result } from '../calculate'
import type { PricingV3AnyInput } from '../schemas'

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

const ExactDecimal = Decimal.clone({ precision: 80 })

const hash = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex')

type Amounts = Partial<
  Record<
    | 'contingencyReserve'
    | 'contingencyBase'
    | 'contingencyReserveWaived'
    | 'marketAdjustment'
    | 'engagementAdjustment'
    | 'roundingAdjustment'
    | 'uplift'
    | 'thirdPartyCost'
    | 'thirdPartyNet',
    string
  >
> &
  Record<'cost' | 'undiscountedPrice' | 'discount' | 'net' | 'marginAmount', string>

export type PricingV3Artifact = {
  artifactVersion: 'pricing-v3-local-artifact/1'
  calculationId: string
  replayDigest: string
  semantic: { engineVersion: string; input: PricingV3AnyInput; result: PricingV3Result }
  execution: { createdAt: string }
}

export function runPricingV3(input: unknown, createdAt = new Date().toISOString()) {
  const result = calculatePricingV3(input)
  const { parsed } = parsePricingV3Input(input)

  if (!parsed.success) return { result, artifact: null }
  // The engine is the one of the input's contract, as signed on the result; there is no "current" engine.
  const semantic = { engineVersion: result.engineVersion, input: parsed.data, result }
  const replayDigest = hash(semantic)

  const artifact: PricingV3Artifact = {
    artifactVersion: 'pricing-v3-local-artifact/1',
    calculationId: `local-${replayDigest.slice(0, 24)}`,
    replayDigest,
    semantic,
    execution: { createdAt }
  }

  return { result, artifact }
}

/** Verify frozen content AND recompute with the registered engine that signed it; never load today's catalog. */
export function replayPricingV3(raw: unknown): PricingV3Artifact {
  if (!raw || typeof raw !== 'object') throw new PricingV3Error('REPLAY_MISMATCH')
  const artifact = raw as PricingV3Artifact

  if (
    artifact.artifactVersion !== 'pricing-v3-local-artifact/1' ||
    !isPricingV3EngineVersion(artifact.semantic?.engineVersion) ||
    hash(artifact.semantic) !== artifact.replayDigest
  )
    throw new PricingV3Error('REPLAY_MISMATCH')
  const recalculated = runPricingV3(artifact.semantic.input, artifact.execution?.createdAt)

  if (
    !recalculated.artifact ||
    recalculated.artifact.replayDigest !== artifact.replayDigest ||
    recalculated.artifact.calculationId !== artifact.calculationId
  )
    throw new PricingV3Error('REPLAY_MISMATCH')

  return recalculated.artifact
}

export function explainPricingV3(raw: unknown) {
  const artifact = replayPricingV3(raw)

  return {
    calculationId: artifact.calculationId,
    replayDigest: artifact.replayDigest,
    snapshot: { id: artifact.semantic.input.snapshot.snapshotId, version: artifact.semantic.input.snapshot.version },
    result: artifact.semantic.result
  }
}

export function comparePricingV3(left: unknown, right: unknown) {
  const a = replayPricingV3(left)
  const b = replayPricingV3(right)

  const matchingCurrency = a.semantic.result.outputCurrency === b.semantic.result.outputCurrency
  const totalsA = a.semantic.result.totals
  const totalsB = b.semantic.result.totals

  const differences =
    matchingCurrency && totalsA && totalsB
      ? Object.fromEntries(
          // Amounts of a later contract are compared only when both sides carry them; a 1.0.0 comparison keeps its shape.
          (
            [
              'cost',
              'contingencyReserve',
              'contingencyBase',
              'contingencyReserveWaived',
              'marketAdjustment',
              'engagementAdjustment',
              'undiscountedPrice',
              'roundingAdjustment',
              'discount',
              'uplift',
              'net',
              'marginAmount',
              'thirdPartyCost',
              'thirdPartyNet'
            ] as const
          )
            .map(key => [key, (totalsA as Amounts)[key], (totalsB as Amounts)[key]] as const)
            .flatMap(([key, before, after]) =>
              before === undefined || after === undefined
                ? []
                : [[key, new ExactDecimal(after).minus(before).toString()]]
            )
        )
      : null

  return {
    binding: false,
    differences,
    calculations: [a.calculationId, b.calculationId],
    comparability: {
      currencyMatches: a.semantic.result.outputCurrency === b.semantic.result.outputCurrency,
      scopeMatches: stableJson(a.semantic.input.request) === stableJson(b.semantic.input.request),
      snapshotMatches: stableJson(a.semantic.input.snapshot) === stableJson(b.semantic.input.snapshot),
      complete:
        a.semantic.result.calculationStatus === 'calculated' && b.semantic.result.calculationStatus === 'calculated'
    },
    // Preserve both sides rather than subtracting unlike currencies/scopes or incomplete totals.
    before: {
      totals: a.semantic.result.totals,
      diagnostics: a.semantic.result.diagnostics,
      lines: a.semantic.result.lines
    },
    after: {
      totals: b.semantic.result.totals,
      diagnostics: b.semantic.result.diagnostics,
      lines: b.semantic.result.lines
    }
  }
}
