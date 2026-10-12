// The battery every adapter of the Pricing V3 storage port passes (TASK-2024, EPIC-053).
//
// `runStorageConformance(subject)` declares the same tests for whatever adapter it is given: files, memory, and the
// PostgreSQL adapter of the platform (TASK-2025). An adapter is interchangeable with the others because it passes
// this, not because it looks like them. A new adapter imports this function; it never copies the cases.
//
// The corpus is the repository's own: every frozen artifact under `data/pricing` and `docs/commercial`, every
// version of the catalog and of the resource policy, the credit catalog and the committed pointer. It is read here,
// with `node:fs`, because it is the test's input; the storage under test is reached only through the port.
//
// This module is a helper, not a test file: importing it declares nothing until the function is called.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { replayCatalogQuote } from '../adapters/catalog-local'
import { buildCurrentVersions, currentVersionsSchema } from '../adapters/current-versions'
import { replayPricingV3, stableJson } from '../adapters/local-snapshot'
import { replayResourceComposition, runResourceComposition } from '../adapters/resource-composition'
import { isPricingV3Error } from '../errors'
import {
  ARTIFACT_VERSIONS,
  SOURCE_ROLES,
  canonicalText,
  createCurrentSourceResolver,
  identifyArtifact,
  identifyDocument,
  pointerDigest,
  readCurrentVersions,
  verifyPointedSources
} from '../storage'
import type { PricingV3Storage, SourceRole } from '../storage'

/** A storage to test, and how it addresses what the repository holds at `path`. `undefined`: it needs no address. */
export type StorageUnderTest = {
  storage: PricingV3Storage
  locator: (path: string) => string | undefined
}

export type StorageSubject = {
  name: string
  /** A storage with nothing in it. Called more than once; each call is independent of the others. */
  empty: () => StorageUnderTest | Promise<StorageUnderTest>
  /**
   * A storage that already holds the repository corpus (the file adapter over the repository itself). Without it the
   * battery seeds an empty storage through the port, which is how every other adapter comes to hold anything.
   */
  corpus?: () => StorageUnderTest | Promise<StorageUnderTest>
}

// ── The corpus ───────────────────────────────────────────────────────────────────────────────────────────────────

const OPERATING = 'data/pricing/v3-operating'
const POINTER = `${OPERATING}/current.json`

/** Frozen artifacts in the repository when this battery was written. The walk may grow; it may never shrink. */
const ARTIFACTS_WHEN_WRITTEN = 48

const TIMEOUT = 120_000

const walk = (dir: string, suffix: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)

    return entry.isDirectory() ? walk(path, suffix) : entry.name.endsWith(suffix) ? [path] : []
  })

type Replayed = { replayDigest: string; calculationId: string }

const REPLAY: Record<(typeof ARTIFACT_VERSIONS)[number], (raw: unknown) => Replayed> = {
  'pricing-v3-local-artifact/1': replayPricingV3,
  'pricing-v3-selection-quote/1': replayCatalogQuote,
  'pricing-v3-resource-composition/1': replayResourceComposition
}

const loadCorpus = () => {
  const artifacts = [...walk('data/pricing', '.artifact.json'), ...walk('docs/commercial', '.artifact.json')]
    .sort()
    .map(path => {
      const text = readFileSync(path, 'utf8')

      return { path, text, ...identifyArtifact(JSON.parse(text)) }
    })

  const versions = (prefix: string) =>
    readdirSync(OPERATING)
      .filter(name => name.startsWith(prefix) && name.endsWith('.json'))
      .map(name => `${OPERATING}/${name}`)

  const pointerText = readFileSync(POINTER, 'utf8')
  const pointer = currentVersionsSchema.parse(JSON.parse(pointerText))

  const byRole: [SourceRole, string[]][] = [
    ['catalog', [...versions('catalog.review-'), pointer.catalog.path]],
    ['policy', [...versions('resources.review-'), pointer.policy.path]],
    ['credits', [pointer.credits.path]]
  ]

  const documents = byRole.flatMap(([role, paths]) =>
    [...new Set(paths)].sort().map(path => {
      const text = readFileSync(path, 'utf8')

      return { role, path, text, ...identifyDocument(role, JSON.parse(text)) }
    })
  )

  return { artifacts, documents, pointerText, pointer }
}

type Corpus = ReturnType<typeof loadCorpus>

let loaded: Corpus | undefined

// Read once per test file, whatever the number of subjects: it is 38 MB of artifacts.
const corpus = () => (loaded ??= loadCorpus())

const seed = async ({ storage, locator }: StorageUnderTest, held: Corpus) => {
  for (const document of held.documents)
    await storage.writeDocument({ role: document.role, text: document.text, locator: locator(document.path) })

  for (const artifact of held.artifacts)
    await storage.writeArtifact({ text: artifact.text, locator: locator(artifact.path) })

  await storage.replacePointer({ text: held.pointerText, confirmDigest: null })
}

const rejection = async (operation: Promise<unknown>) => {
  try {
    await operation
  } catch (error) {
    return isPricingV3Error(error) ? error.code : error
  }

  return 'resolved'
}

// A document with the same role and version and another content: one string of its tree, changed. What it says is
// irrelevant; that the adapter refuses to put it where the first one is, is the point.
const withOtherContent = (role: SourceRole, text: string) => {
  const value = JSON.parse(text)
  let changed = false

  const visit = (node: unknown): void => {
    if (changed || !node || typeof node !== 'object') return

    for (const [key, item] of Object.entries(node)) {
      if (changed) return

      if (['note', 'reason', 'reference'].includes(key) && typeof item === 'string') {
        ;(node as Record<string, unknown>)[key] = `${item} (conformance)`
        changed = true
      } else visit(item)
    }
  }

  visit(value)

  const other = `${JSON.stringify(value, null, 2)}\n`

  // The mutation must leave a valid document of the same version and another digest, or the case proves nothing.
  expect(changed).toBe(true)
  expect(identifyDocument(role, JSON.parse(other)).version).toBe(identifyDocument(role, JSON.parse(text)).version)
  expect(identifyDocument(role, JSON.parse(other)).digest).not.toBe(identifyDocument(role, JSON.parse(text)).digest)

  return other
}

// ── The battery ──────────────────────────────────────────────────────────────────────────────────────────────────

export function runStorageConformance(subject: StorageSubject) {
  describe(`Pricing V3 storage conformance: ${subject.name}`, () => {
    const held = corpus()
    let under: StorageUnderTest

    beforeAll(async () => {
      if (subject.corpus) under = await subject.corpus()
      else {
        under = await subject.empty()
        await seed(under, held)
      }
    }, TIMEOUT)

    it('9. the walk never shrinks: at least the artifacts counted when this was written, and every lane', () => {
      expect(held.artifacts.length).toBeGreaterThanOrEqual(ARTIFACTS_WHEN_WRITTEN)
      expect([...new Set(held.artifacts.map(artifact => artifact.artifactVersion))].sort()).toEqual(
        [...ARTIFACT_VERSIONS].sort()
      )
      // Every version of the catalog and of the policy, and the three the pointer names.
      expect(held.documents.filter(document => document.role === 'catalog').length).toBeGreaterThanOrEqual(10)
      expect(held.documents.filter(document => document.role === 'policy').length).toBeGreaterThanOrEqual(10)
      expect(held.documents.filter(document => document.role === 'credits').length).toBeGreaterThanOrEqual(1)
    })

    it(
      '1. every frozen artifact is read byte for byte, and the replay of its lane verifies what was read',
      async () => {
        for (const artifact of held.artifacts) {
          const stored = await under.storage.readArtifact({
            locator: under.locator(artifact.path),
            replayDigest: artifact.replayDigest
          })

          expect(stored.text === artifact.text, artifact.path).toBe(true)

          const replayed = REPLAY[artifact.artifactVersion as (typeof ARTIFACT_VERSIONS)[number]](stored.value)

          expect(replayed.replayDigest, artifact.path).toBe(artifact.replayDigest)
          expect(replayed.calculationId, artifact.path).toBe(artifact.calculationId)
        }
      },
      TIMEOUT
    )

    it('1b. the storage lists every artifact it holds, with its lane', async () => {
      const listed = await under.storage.listArtifacts()

      expect(listed.length).toBeGreaterThanOrEqual(held.artifacts.length)
      expect([...new Set(listed.map(entry => entry.artifactVersion))].sort()).toEqual([...ARTIFACT_VERSIONS].sort())
    })

    it(
      '2. round trip: an artifact written to an empty storage is read back with the same bytes',
      async () => {
        const fresh = await subject.empty()

        for (const artifact of held.artifacts) {
          const locator = fresh.locator(artifact.path)
          const identity = await fresh.storage.writeArtifact({ text: artifact.text, locator })

          expect(identity).toEqual({
            artifactVersion: artifact.artifactVersion,
            replayDigest: artifact.replayDigest,
            calculationId: artifact.calculationId
          })

          const read = await fresh.storage.readArtifact({ locator, replayDigest: artifact.replayDigest })

          expect(read.text === artifact.text, artifact.path).toBe(true)
        }
      },
      TIMEOUT
    )

    it(
      '3. canonical text: it is a fixed point, and what it parses to reproduces with the same digest',
      async () => {
        for (const artifact of held.artifacts) {
          const { value } = await under.storage.readArtifact({ locator: under.locator(artifact.path) })
          const canonical = canonicalText(value)
          const fromCanonical = JSON.parse(canonical)

          expect(stableJson(fromCanonical) === canonical, artifact.path).toBe(true)
          expect(
            REPLAY[artifact.artifactVersion as (typeof ARTIFACT_VERSIONS)[number]](fromCanonical).replayDigest,
            artifact.path
          ).toBe(artifact.replayDigest)
        }

        for (const document of held.documents) {
          const { value } = await under.storage.readDocument({
            role: document.role,
            locator: under.locator(document.path),
            version: document.version,
            digest: document.digest
          })

          const canonical = canonicalText(value)

          expect(stableJson(JSON.parse(canonical)) === canonical, document.path).toBe(true)
          expect(identifyDocument(document.role, JSON.parse(canonical)), document.path).toEqual({
            version: document.version,
            digest: document.digest
          })
        }
      },
      TIMEOUT
    )

    it('4. every source document is read by role, version and digest, and its digest recomputes', async () => {
      for (const document of held.documents) {
        const stored = await under.storage.readDocument({
          role: document.role,
          locator: under.locator(document.path),
          version: document.version,
          digest: document.digest
        })

        expect(identifyDocument(document.role, stored.value), document.path).toEqual({
          version: document.version,
          digest: document.digest
        })
      }

      // The three the pointer names are among them, by the identity the pointer gives.
      for (const role of SOURCE_ROLES)
        expect(held.documents.some(document => document.digest === held.pointer[role].digest), role).toBe(true)
    })

    it('5. a document asked for by an identity it does not have is not handed over', async () => {
      const document = held.documents.find(candidate => candidate.role === 'catalog')!
      const ref = { role: document.role, locator: under.locator(document.path) }

      expect(await rejection(under.storage.readDocument({ ...ref, version: document.version, digest: '0'.repeat(64) }))).toBe(
        'INPUT_NOT_FOUND'
      )
      expect(await rejection(under.storage.readDocument({ ...ref, version: 'no-such-version', digest: document.digest }))).toBe(
        'INPUT_NOT_FOUND'
      )

      // Nothing held at all under that identity: the tolerant read says so without failing.
      expect(
        await under.storage.findDocument({
          role: 'catalog',
          locator: under.locator('data/pricing/v3-operating/no-such-document.json'),
          version: 'no-such-version',
          digest: '0'.repeat(64)
        })
      ).toBeUndefined()

      const artifact = held.artifacts[0]

      expect(
        await rejection(
          under.storage.readArtifact({ locator: under.locator(artifact.path), replayDigest: '0'.repeat(64) })
        )
      ).toBe('INPUT_NOT_FOUND')
    })

    it('6. nothing is ever replaced: a second write under the same identity is refused and the first one stays', async () => {
      const fresh = await subject.empty()

      for (const role of SOURCE_ROLES) {
        const document = held.documents.find(candidate => candidate.role === role)!
        const locator = fresh.locator(document.path)
        const ref = { role, locator, version: document.version }

        expect(await fresh.storage.writeDocument({ role, text: document.text, locator })).toEqual({
          version: document.version,
          digest: document.digest
        })
        // The same content again, and another content under the same version: both refused.
        expect(await rejection(fresh.storage.writeDocument({ role, text: document.text, locator }))).toBe('OUTPUT_EXISTS')
        expect(
          await rejection(fresh.storage.writeDocument({ role, text: withOtherContent(role, document.text), locator }))
        ).toBe('OUTPUT_EXISTS')
        expect(identifyDocument(role, (await fresh.storage.readDocument(ref)).value).digest).toBe(document.digest)
      }

      const artifact = held.artifacts.find(candidate => candidate.artifactVersion === 'pricing-v3-selection-quote/1')!
      const locator = fresh.locator(artifact.path)

      // Same replay digest, another text: the clock of the run is outside the digest.
      const refrozen = artifact.text.replace(/("createdAt": ?)"[^"]+"/, '$1"2001-01-01T00:00:00.000Z"')

      expect(refrozen).not.toBe(artifact.text)
      await fresh.storage.writeArtifact({ text: artifact.text, locator })
      expect(await rejection(fresh.storage.writeArtifact({ text: artifact.text, locator }))).toBe('OUTPUT_EXISTS')
      expect(await rejection(fresh.storage.writeArtifact({ text: refrozen, locator }))).toBe('OUTPUT_EXISTS')
      expect((await fresh.storage.readArtifact({ locator, replayDigest: artifact.replayDigest })).text).toBe(artifact.text)
    })

    it('7. the pointer is replaced only over the pointer the caller read, and all of it', async () => {
      const fresh = await subject.empty()
      const first = held.pointerText
      const firstDigest = pointerDigest(JSON.parse(first))

      const second = `${JSON.stringify({ ...JSON.parse(first), reason: 'Conformance: a second pointer.' }, null, 2)}\n`

      expect(await fresh.storage.readPointer()).toBeNull()
      // A digest offered for a pointer that does not exist means the caller expected one that is gone.
      expect(await rejection(fresh.storage.replacePointer({ text: first, confirmDigest: firstDigest }))).toBe(
        'CURRENT_VERSIONS_CONFLICT'
      )
      expect(await fresh.storage.readPointer()).toBeNull()

      await fresh.storage.replacePointer({ text: first, confirmDigest: null })
      expect((await fresh.storage.readPointer())?.text).toBe(first)

      for (const wrong of [null, '0'.repeat(64), pointerDigest(JSON.parse(second))])
        expect(await rejection(fresh.storage.replacePointer({ text: second, confirmDigest: wrong }))).toBe(
          'CURRENT_VERSIONS_CONFLICT'
        )
      expect((await fresh.storage.readPointer())?.text).toBe(first)

      await fresh.storage.replacePointer({ text: second, confirmDigest: firstDigest })

      // Opaque: what is read is the text that was written, not a rendering of it.
      expect((await fresh.storage.readPointer())?.text).toBe(second)
    })

    it('7b. the committed pointer resolves to the sources it names, and a pointer that drifted is not followed', async () => {
      const pointer = await readCurrentVersions(under.storage, 'current')

      expect(pointer).toEqual(held.pointer)
      expect((await verifyPointedSources(under.storage, pointer)).consistent).toBe(true)

      const resolve = createCurrentSourceResolver(under.storage)

      for (const role of SOURCE_ROLES)
        expect(identifyDocument(role, await resolve(role)).digest, role).toBe(pointer[role].digest)

      // The same documents under a pointer that names another digest for one of them.
      const fresh = await subject.empty()

      for (const role of SOURCE_ROLES) {
        const document = held.documents.find(candidate => candidate.digest === held.pointer[role].digest)!

        await fresh.storage.writeDocument({ role, text: document.text, locator: fresh.locator(document.path) })
      }

      const drifted = { ...held.pointer, policy: { ...held.pointer.policy, digest: '0'.repeat(64) } }

      await fresh.storage.replacePointer({ text: `${JSON.stringify(drifted, null, 2)}\n`, confirmDigest: null })

      const verdict = await verifyPointedSources(fresh.storage, await readCurrentVersions(fresh.storage, 'current'))
      const follow = createCurrentSourceResolver(fresh.storage)

      expect(verdict.consistent).toBe(false)
      expect(verdict.sources.catalog.status).toBe('match')
      expect(verdict.sources.policy.status).not.toBe('match')
      expect(identifyDocument('catalog', await follow('catalog')).digest).toBe(held.pointer.catalog.digest)
      expect(await rejection(follow('policy'))).toBe('CURRENT_VERSIONS_MISMATCH')
    })

    it(
      '8. the whole path through the port: pointer, sources, calculation, frozen artifact and reading',
      async () => {
        // Every example of the repository with the artifact it is expected to give: `<name>.demand.json` next to
        // `<name>.artifact.json`. The storage holds, under a pointer, the sources each artifact was frozen with; the
        // demand is the file as committed. What comes out must carry the digest the repository froze.
        const pairs = held.artifacts
          .filter(artifact => artifact.artifactVersion === 'pricing-v3-resource-composition/1')
          .flatMap(artifact => {
            const demandPath = artifact.path.replace(/\.artifact\.json$/, '.demand.json')

            try {
              return [{ artifact, demand: JSON.parse(readFileSync(demandPath, 'utf8')) as unknown }]
            } catch {
              return []
            }
          })

        expect(pairs.length).toBeGreaterThanOrEqual(30)

        const fresh = await subject.empty()

        const sourcePath = (role: SourceRole, version: string) =>
          `conformance/${role}.${version.replace(/[^\w.-]/g, '_')}.json`

        let confirmDigest: string | null = null
        const notReproduced: string[] = []

        for (const { artifact, demand } of pairs) {
          const frozen = JSON.parse(artifact.text) as ReturnType<typeof runResourceComposition>
          const documents = { catalog: frozen.semantic.catalog, policy: frozen.semantic.policy, credits: frozen.semantic.credits }

          const paths = {
            catalog: sourcePath('catalog', frozen.semantic.catalog.version),
            policy: sourcePath('policy', frozen.semantic.policy.version),
            credits: sourcePath('credits', frozen.semantic.credits.version)
          }

          // Asked before written: a version is stored once, and the port never replaces.
          for (const role of SOURCE_ROLES) {
            const identity = identifyDocument(role, documents[role])
            const ref = { role, locator: fresh.locator(paths[role]), ...identity }

            if (!(await fresh.storage.findDocument(ref)))
              await fresh.storage.writeDocument({
                role,
                text: `${JSON.stringify(documents[role], null, 2)}\n`,
                locator: ref.locator
              })
          }

          const pointer = buildCurrentVersions({
            paths,
            documents,
            reason: `Conformance: the sources of ${artifact.calculationId}.`,
            updatedAt: '2026-10-12'
          })

          await fresh.storage.replacePointer({ text: `${JSON.stringify(pointer, null, 2)}\n`, confirmDigest })
          confirmDigest = pointerDigest(pointer)

          const resolve = createCurrentSourceResolver(fresh.storage)

          const computed = runResourceComposition(
            await resolve('catalog'),
            await resolve('policy'),
            await resolve('credits'),
            demand,
            frozen.execution.createdAt
          )

          if (computed.replayDigest !== artifact.replayDigest) {
            notReproduced.push(artifact.path)
            continue
          }

          const text = `${JSON.stringify(computed, null, 2)}\n`
          const locator = fresh.locator(`conformance/${artifact.calculationId}.artifact.json`)

          // Same clock, same sources, same demand: the artifact is the committed file, byte for byte.
          expect(text === artifact.text, artifact.path).toBe(true)
          expect((await fresh.storage.writeArtifact({ text, locator })).replayDigest).toBe(artifact.replayDigest)

          const read = await fresh.storage.readArtifact({ locator, replayDigest: artifact.replayDigest })

          expect(replayResourceComposition(read.value).replayDigest).toBe(artifact.replayDigest)
        }

        expect(notReproduced).toEqual(DEMANDS_THAT_NO_LONGER_GIVE_THEIR_ARTIFACT)
      },
      TIMEOUT
    )
  })
}

/**
 * Examples whose committed demand no longer gives the artifact committed next to it. Listed, never skipped in
 * silence: an entry here is a demand that was edited after its artifact was frozen (the artifact still reproduces
 * from its own frozen inputs, which is what cases 1 and 3 verify).
 */
export const DEMANDS_THAT_NO_LONGER_GIVE_THEIR_ARTIFACT: string[] = []
