// Permanent guard (GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1 §5).
//
// This file is the real verifier that an already-used input contract did not move: every frozen artifact is
// recomputed from its own frozen inputs by the replay of its lane, and the recomputed digest (which covers the whole
// result: values, key set, engine label and precision policy) must equal the stored one. No assertion here looks at
// the text of the kernel; a behaviour change of contract 1.0.0 turns this red even when every unit test stays green.
// Run it whenever `calculate.ts`, `schemas.ts` or the catalog/composition resolution is touched.
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { replayCatalogQuote } from '../adapters/catalog-local'
import { replayPricingV3 } from '../adapters/local-snapshot'
import { replayResourceComposition } from '../adapters/resource-composition'
import { PRICING_V3_ENGINES } from '../schemas'

const root = resolve('.')

// Committed outside data/pricing: the agreed SKY social care offer, a real commercial case frozen under each
// contract. `acordado` is the rate discount on contract 1.0.0; `acordado-neto` is the same agreement as an agreed
// net with commercial rounding, the first artifact signed by engine 1.1.0.
const COMMITTED_ELSEWHERE = [
  'docs/commercial/prospects/sky-social-care-2027/pricing/acordado.artifact.json',
  'docs/commercial/prospects/sky-social-care-2027/pricing/acordado-neto.artifact.json'
]

type Replayed = { replayDigest: string; calculationId: string }

const REPLAY_BY_ARTIFACT_VERSION: Record<string, (raw: unknown) => Replayed> = {
  'pricing-v3-local-artifact/1': replayPricingV3,
  'pricing-v3-selection-quote/1': replayCatalogQuote,
  'pricing-v3-resource-composition/1': replayResourceComposition
}

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.artifact.json') ? [path] : []
  })

const discovered = [...walk(resolve(root, 'data/pricing')), ...COMMITTED_ELSEWHERE.map(path => resolve(root, path))]
  .map(path => relative(root, path))
  .sort()

describe('Pricing V3 frozen artifacts still verify with the engine that signed them', () => {
  it('the directory walk finds the frozen corpus and every lane of it', () => {
    const versions = new Set(
      discovered.map(path => JSON.parse(readFileSync(resolve(root, path), 'utf8')).artifactVersion as string)
    )

    // 16 under data/pricing when this guard was written; the walk must never silently shrink to a trivial set.
    expect(discovered.length).toBeGreaterThanOrEqual(17)
    expect([...versions].sort()).toEqual(Object.keys(REPLAY_BY_ARTIFACT_VERSION).sort())
  })

  it('the corpus holds at least one artifact signed by every registered engine', () => {
    // Read from the frozen files themselves: a registered engine with no frozen artifact has nothing guarding it.
    const signed = new Set(
      discovered.flatMap(path =>
        [...readFileSync(resolve(root, path), 'utf8').matchAll(/"engineVersion":\s*"([^"]+)"/g)].map(match => match[1])
      )
    )

    expect([...signed].sort()).toEqual(Object.values(PRICING_V3_ENGINES).sort())
  })

  it.each(discovered)('%s', path => {
    const artifact = JSON.parse(readFileSync(resolve(root, path), 'utf8'))
    const replay = REPLAY_BY_ARTIFACT_VERSION[artifact.artifactVersion as string]

    // An artifact of a lane this guard cannot replay is a failure, never a skip.
    expect(replay, `no replay registered for ${String(artifact.artifactVersion)}`).toBeTypeOf('function')

    const verified = replay(artifact)

    expect(verified.replayDigest).toBe(artifact.replayDigest)
    expect(verified.calculationId).toBe(artifact.calculationId)
  })
})
