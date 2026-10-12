// Slice 1 of TASK-2025: before any schema, prove that PostgreSQL keeps a text and its digest exactly.
//
// The quoter registry stores a frozen quote as the text it was written as and trusts two things about the
// database: that a `text` column hands back the very bytes it was given, and that the sha256 PostgreSQL computes
// over them is the sha256 Node computes. If either were false, "verified by digest on write and on read" would mean
// nothing. This runs the whole repository corpus through a `text` column of the local cluster to find out.
//
// It also decides the mechanism: a CHECK constraint needs immutable functions, and `convert_to(text, name)` is not
// one. The digest of a stored text is therefore checked by a BEFORE INSERT trigger.
//
// Runs only through `pnpm quoter:test:local`. Skipped otherwise, and skipped is not green.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { replayCatalogQuote } from '@/lib/finance/pricing-v3/adapters/catalog-local'
import { replayPricingV3 } from '@/lib/finance/pricing-v3/adapters/local-snapshot'
import { replayResourceComposition } from '@/lib/finance/pricing-v3/adapters/resource-composition'
import { loadStorageCorpus } from '@/lib/finance/pricing-v3/__tests__/storage-conformance'

import { highest, readArtifactIndex } from '../artifact-index'
import { identifySourceDocument, textDigest } from '../canonical-text'

import { createLocalDatabase, localPgEnabled } from './local-pg'
import type { LocalDatabase } from './local-pg'
import type { ArtifactLane } from '../artifact-index'

const REPLAY: Record<ArtifactLane, (raw: unknown) => { replayDigest: string }> = {
  'pricing-v3-local-artifact/1': replayPricingV3,
  'pricing-v3-selection-quote/1': replayCatalogQuote,
  'pricing-v3-resource-composition/1': replayResourceComposition
}

const TIMEOUT = 120_000

describe.skipIf(!localPgEnabled)('PostgreSQL keeps a stored text and its digest exactly (local cluster)', () => {
  const corpus = loadStorageCorpus()
  let database: LocalDatabase

  beforeAll(async () => {
    database = await createLocalDatabase()

    const ops = await database.connect('greenhouse_ops')

    await ops.query(`CREATE TABLE greenhouse_commercial.roundtrip_probe (id text PRIMARY KEY, body text NOT NULL)`)
  }, TIMEOUT)

  afterAll(async () => database?.drop())

  it('the server is PostgreSQL 16, UTF8, and the two functions have the volatility the design assumes', async () => {
    const client = await database.connect('postgres')

    const { rows } = await client.query<{ version: string; encoding: string; sha256: string; convert_to: string }>(
      `SELECT current_setting('server_version_num') AS version,
              current_setting('server_encoding') AS encoding,
              (SELECT provolatile::text FROM pg_proc WHERE proname = 'sha256' AND pronargs = 1) AS sha256,
              (SELECT provolatile::text FROM pg_proc WHERE proname = 'convert_to' AND pronargs = 2) AS convert_to`
    )

    expect(rows[0].version.startsWith('16')).toBe(true)
    expect(rows[0].encoding).toBe('UTF8')
    // Immutable and stable. A CHECK needs immutable: the digest of a text is checked by a trigger.
    expect(rows[0]).toMatchObject({ sha256: 'i', convert_to: 's' })
  })

  it(
    'every frozen artifact comes back byte for byte, with the digest Node computes, and still reproduces',
    async () => {
      const client = await database.connect('greenhouse_ops')

      for (const artifact of corpus.artifacts) {
        await client.query(`INSERT INTO greenhouse_commercial.roundtrip_probe (id, body) VALUES ($1, $2)`, [
          artifact.path,
          artifact.text
        ])

        const { rows } = await client.query<{ body: string; digest: string }>(
          `SELECT body, encode(sha256(convert_to(body, 'UTF8')), 'hex') AS digest
             FROM greenhouse_commercial.roundtrip_probe WHERE id = $1`,
          [artifact.path]
        )

        expect(rows[0].body === artifact.text, artifact.path).toBe(true)
        expect(rows[0].digest, artifact.path).toBe(textDigest(artifact.text))
        expect(REPLAY[artifact.artifactVersion as ArtifactLane](JSON.parse(rows[0].body)).replayDigest, artifact.path).toBe(
          artifact.replayDigest
        )
      }
    },
    TIMEOUT
  )

  it(
    'every source document, stored as it was written, reads back byte for byte and keeps the identity a pointer names',
    async () => {
      const client = await database.connect('greenhouse_ops')

      for (const document of corpus.documents) {
        const identified = identifySourceDocument(document.role, document.text)
        const id = `${document.role}:${document.version}`

        await client.query(`INSERT INTO greenhouse_commercial.roundtrip_probe (id, body) VALUES ($1, $2)`, [id, document.text])

        const { rows } = await client.query<{ body: string; digest: string }>(
          `SELECT body, encode(sha256(convert_to(body, 'UTF8')), 'hex') AS digest
             FROM greenhouse_commercial.roundtrip_probe WHERE id = $1`,
          [id]
        )

        expect(rows[0].body === document.text, document.path).toBe(true)
        // The database computes over those bytes the digest Node computes.
        expect(rows[0].digest, document.path).toBe(identified.textDigest)
        // What was read still has the identity the repository gives it: the version and the digest a pointer names.
        expect(identifySourceDocument(document.role, rows[0].body), document.path).toMatchObject({
          version: document.version,
          digest: document.digest
        })
        // Two digests, two jobs: the one of the text is not the one of identity.
        expect(textDigest(document.text), document.path).not.toBe(document.digest)
      }
    },
    TIMEOUT
  )

  it('a text with every awkward character survives: quotes, backslashes, newlines, astral and combining ones', async () => {
    const client = await database.connect('greenhouse_ops')
    const awkward = '{"a":"comillas \\" y barra \\\\ y salto \\n","ñ":"Ω 𝛑 🙂 e\u0301 \u00e9","tab":"\\t"}\n\r\n  '

    await client.query(`INSERT INTO greenhouse_commercial.roundtrip_probe (id, body) VALUES ('awkward', $1)`, [awkward])

    const { rows } = await client.query<{ body: string; digest: string }>(
      `SELECT body, encode(sha256(convert_to(body, 'UTF8')), 'hex') AS digest
         FROM greenhouse_commercial.roundtrip_probe WHERE id = 'awkward'`
    )

    expect(rows[0].body).toBe(awkward)
    expect(rows[0].digest).toBe(textDigest(awkward))
  })
})

describe('What a frozen artifact says about itself (no database)', () => {
  const corpus = loadStorageCorpus()
  const indexes = corpus.artifacts.map(artifact => ({ path: artifact.path, ...readArtifactIndex(JSON.parse(artifact.text)) }))

  it('every artifact names one engine and one input contract, so one column holds each without losing anything', () => {
    for (const index of indexes) {
      // A quote that did not calculate may have no period, and then no engine to name.
      if (index.calculationStatus !== 'calculated') continue

      expect(index.engineVersions, index.path).toHaveLength(1)
      expect(index.contractVersions, index.path).toHaveLength(1)
      expect(highest(index.engineVersions), index.path).toBe(index.engineVersions[0])
      expect(index.currency, index.path).toMatch(/^[A-Z]{3}$/)
    }
  })

  it('the corpus holds artifacts that did not calculate, which a registry of quotes must refuse', () => {
    const uncalculated = indexes.filter(index => index.calculationStatus !== 'calculated')

    // One when this was written. The registry keeps calculated quotes only; this is the case it has to reject.
    expect(uncalculated.length).toBeGreaterThanOrEqual(1)
    expect(indexes.length - uncalculated.length).toBeGreaterThanOrEqual(47)
  })

  it('each lane declares the sources the index expects of it', () => {
    const rolesByLane = new Map<string, Set<string>>()

    for (const index of indexes) {
      const roles = rolesByLane.get(index.artifactVersion) ?? new Set<string>()

      Object.keys(index.sources).forEach(role => roles.add(role))
      rolesByLane.set(index.artifactVersion, roles)
    }

    expect([...(rolesByLane.get('pricing-v3-local-artifact/1') ?? [])]).toEqual([])
    expect([...(rolesByLane.get('pricing-v3-selection-quote/1') ?? [])].sort()).toEqual(['catalog'])
    expect([...(rolesByLane.get('pricing-v3-resource-composition/1') ?? [])].sort()).toEqual(['catalog', 'credits', 'policy'])
  })

  it('highest() reads versions as numbers, not as text', () => {
    expect(highest(['pricing-v3-local/1.9.0', 'pricing-v3-local/1.10.0'])).toBe('pricing-v3-local/1.10.0')
    expect(highest([])).toBeNull()
  })
})
