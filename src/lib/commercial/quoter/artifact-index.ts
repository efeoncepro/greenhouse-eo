import 'server-only'

import { identifyCurrentSource } from '@/lib/finance/pricing-v3/adapters/current-versions'
import type { ARTIFACT_VERSIONS} from '@/lib/finance/pricing-v3/storage';
import { identifyArtifact } from '@/lib/finance/pricing-v3/storage'
import type { CurrentSourceRole } from '@/lib/finance/pricing-v3/adapters/current-versions'

/**
 * What a frozen artifact says about itself, read for the index columns of a stored version.
 *
 * These values are READ INDEXES: they let a list filter and sort without opening two megabytes of text. They are
 * never the source of a result. A reader that needs what a quote says parses the stored text or calls the engine;
 * nothing rebuilds a result from these fields. A test stores a version whose columns contradict its text on purpose
 * and checks the reader still answers what the text says.
 *
 * The three lanes keep the same facts in different places, which is the only reason this file exists.
 */
export type ArtifactLane = (typeof ARTIFACT_VERSIONS)[number]

export type ArtifactSourceIndex = { version: string; digest: string }

export type ArtifactIndex = {
  artifactVersion: ArtifactLane
  replayDigest: string
  calculationId: string
  /** `calculated` or whatever else the engine reported. Only a calculated artifact is a quote. */
  calculationStatus: string | null
  /** Every engine that signed a period of this quote. One, in every artifact frozen so far. */
  engineVersions: string[]
  /** Every input contract its periods were written under. */
  contractVersions: string[]
  currency: string | null
  /** The sources the artifact carries inside, by the identity a pointer would name them with. */
  sources: Partial<Record<CurrentSourceRole, ArtifactSourceIndex>>
}

type Json = Record<string, unknown>

const object = (value: unknown): Json | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : undefined

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const text = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)
const distinct = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => value !== null))].sort()

// The quote of a period-based lane: its status and totals, the engine of each period and the contract of each input.
const quoteFacts = (quote: Json | undefined) => ({
  calculationStatus: text(quote?.calculationStatus),
  engineVersions: distinct(list(quote?.periods).map(period => text(object(object(period)?.result)?.engineVersion))),
  contractVersions: distinct(
    list(object(quote?.resolution)?.inputs).map(input =>
      text(object(object(object(input)?.input)?.request)?.schemaVersion)
    )
  ),
  currency: text(object(quote?.totals)?.currency)
})

const sourcesOf = (semantic: Json | undefined, roles: readonly CurrentSourceRole[]) => {
  const sources: ArtifactIndex['sources'] = {}

  for (const role of roles) {
    if (semantic?.[role] === undefined) continue

    try {
      sources[role] = identifyCurrentSource(role, semantic[role])
    } catch {
      // A source its own contract no longer parses is left out of the index; the artifact still holds it.
    }
  }

  return sources
}

export const readArtifactIndex = (value: unknown): ArtifactIndex => {
  const identity = identifyArtifact(value)
  const lane = identity.artifactVersion as ArtifactLane
  const semantic = object(object(value)?.semantic)
  const result = object(semantic?.result)

  if (lane === 'pricing-v3-local-artifact/1') {
    const request = object(object(semantic?.input)?.request)

    return {
      ...identity,
      artifactVersion: lane,
      calculationStatus: text(result?.calculationStatus),
      engineVersions: distinct([text(semantic?.engineVersion)]),
      contractVersions: distinct([text(request?.schemaVersion)]),
      currency: text(request?.outputCurrency),
      sources: {}
    }
  }

  if (lane === 'pricing-v3-selection-quote/1')
    return { ...identity, artifactVersion: lane, ...quoteFacts(result), sources: sourcesOf(semantic, ['catalog']) }

  return {
    ...identity,
    artifactVersion: lane,
    ...quoteFacts(object(result?.quote)),
    sources: sourcesOf(semantic, ['catalog', 'policy', 'credits'])
  }
}

/** The single value a column holds when an artifact names several: the highest, as a read index and nothing more. */
export const highest = (versions: string[]): string | null =>
  versions.length ? [...versions].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1)! : null
