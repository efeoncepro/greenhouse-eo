// The importer of the repository's catalog, against the local cluster (TASK-2025, Slice 5).
//
// The part that talks to the registry (`importer.ts`), fed with the documents of the repository. What reads the
// disk and asks git is the script (`scripts/commercial/quoter-import.ts`), which hands these same candidates in.
// Runs only through `pnpm quoter:test:local`. Skipped otherwise, and skipped is not green.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Client } from 'pg'

import { currentVersionsDigest } from '@/lib/finance/pricing-v3/adapters/current-versions'
import { loadStorageCorpus } from '@/lib/finance/pricing-v3/__tests__/storage-conformance'

import { importSourceDocuments, mirrorRepositoryPointer } from '../importer'
import { readCurrentPointer } from '../pointer-store'
import { findSourceDocument, listSourceDocuments } from '../source-documents-store'

import { FIXTURE_COMMIT, createLocalDatabase, inTransaction, localPgEnabled } from './local-pg'
import type { LocalDatabase } from './local-pg'
import type { ImportCandidate } from '../importer'
import type { QuoterActor } from '../types'

const JOB: QuoterActor = { kind: 'service', principalId: 'quoter-import' }
const REASON = 'Local fixture: import of the repository catalog.'

// The same document with one of its notes changed: still valid for its contract, same version, another digest.
const withOtherContent = (text: string) => {
  const value = JSON.parse(text) as unknown
  let changed = false

  const visit = (node: unknown): void => {
    if (changed || !node || typeof node !== 'object') return

    for (const [key, item] of Object.entries(node)) {
      if (changed) return

      if (['note', 'reason', 'reference'].includes(key) && typeof item === 'string') {
        ;(node as Record<string, unknown>)[key] = `${item} (altered)`
        changed = true
      } else visit(item)
    }
  }

  visit(value)

  if (!changed) throw new Error('The fixture document has no text to alter')

  return JSON.stringify(value)
}

describe.skipIf(!localPgEnabled)('quoter importer (local cluster, as greenhouse_app)', () => {
  const corpus = loadStorageCorpus()

  const candidates: ImportCandidate[] = corpus.documents.map(document => ({
    role: document.role,
    text: document.text,
    origin: 'repo_import',
    sourcePath: document.path,
    sourceCommitSha: FIXTURE_COMMIT
  }))

  let database: LocalDatabase
  let runtime: Client

  const run = (offered: ImportCandidate[], apply: boolean) =>
    inTransaction(runtime, () => importSourceDocuments(runtime, offered, { apply, actor: JOB, reason: REASON }))

  const mirror = (apply: boolean, text = corpus.pointerText) =>
    inTransaction(runtime, () => mirrorRepositoryPointer(runtime, { text, sourceCommitSha: FIXTURE_COMMIT, actor: JOB, reason: REASON }, { apply }))

  const count = (statuses: { status: string }[], status: string) => statuses.filter(outcome => outcome.status === status).length

  beforeAll(async () => {
    database = await createLocalDatabase()
    runtime = await database.connect('greenhouse_app')
  })

  afterAll(async () => database?.drop())

  it('a simulation writes nothing and says what it would store', async () => {
    const plan = await run(candidates, false)

    expect(plan.applied).toBe(false)
    expect(count(plan.outcomes, 'would_store')).toBe(candidates.length)
    expect(await listSourceDocuments(runtime)).toEqual([])
    // Identity and provenance only: never the content of a document.
    expect(Object.keys(plan.outcomes[0]).sort()).toEqual(['digest', 'origin', 'role', 'sourcePath', 'status', 'version'])
  })

  it('the pointer is not mirrored before its documents are held, and storing documents activates nothing', async () => {
    expect(await mirror(true)).toMatchObject({ status: 'missing_documents', missing: ['catalog', 'policy', 'credits'] })

    const stored = await run(candidates, true)

    expect(stored.applied).toBe(true)
    expect(count(stored.outcomes, 'stored')).toBe(candidates.length)
    expect(await readCurrentPointer(runtime)).toBeNull()

    // Every digest in the registry is the digest the repository gives, and the text is the file, byte for byte.
    for (const document of corpus.documents) {
      const held = await findSourceDocument(runtime, { role: document.role, version: document.version })

      expect(held, document.path).toMatchObject({ digest: document.digest, origin: 'repo_import', sourcePath: document.path, sourceCommitSha: FIXTURE_COMMIT })
      expect(held!.text === document.text, document.path).toBe(true)
    }
  })

  it('a second run writes nothing', async () => {
    const before = await runtime.query(`SELECT count(*)::int AS rows FROM greenhouse_commercial.quoter_source_documents`)
    const again = await run(candidates, true)

    expect(count(again.outcomes, 'already_present')).toBe(candidates.length)
    expect(count(again.outcomes, 'stored')).toBe(0)
    expect((await runtime.query(`SELECT count(*)::int AS rows FROM greenhouse_commercial.quoter_source_documents`)).rows).toEqual(before.rows)
  })

  it('a version already held with another content stops the import before it writes anything', async () => {
    const policy = corpus.documents.find(document => document.role === 'policy')!
    const conflicting: ImportCandidate = { ...candidates.find(candidate => candidate.sourcePath === policy.path)!, text: withOtherContent(policy.text) }

    const result = await run([conflicting], true)

    expect(result).toMatchObject({ applied: false, outcomes: [{ status: 'conflict', conflictWith: 'registry', version: policy.version }] })
    expect((await findSourceDocument(runtime, { role: 'policy', version: policy.version }))?.digest).toBe(policy.digest)
  })

  it('the same version offered twice with two contents is a conflict among the candidates, and nothing of the run is stored', async () => {
    const fresh = await createLocalDatabase()
    const client = await fresh.connect('greenhouse_app')

    try {
      const catalog = corpus.documents.find(document => document.role === 'catalog')!
      const first: ImportCandidate = { role: 'catalog', text: catalog.text, origin: 'repo_import', sourcePath: catalog.path, sourceCommitSha: FIXTURE_COMMIT }
      const second: ImportCandidate = { ...first, text: withOtherContent(catalog.text), origin: 'artifact_embedded', sourcePath: 'some/quote.artifact.json' }

      const result = await inTransaction(client, () => importSourceDocuments(client, [first, second, first], { apply: true, actor: JOB, reason: REASON }))

      expect(result.applied).toBe(false)
      expect(result.outcomes.map(outcome => outcome.status)).toEqual(['would_store', 'conflict'])
      expect(await listSourceDocuments(client)).toEqual([])
    } finally {
      await fresh.drop()
    }
  })

  it('mirroring the pointer names its commit, is not the act of a person, and is done once', async () => {
    expect((await mirror(false)).status).toBe('would_activate')
    expect(await readCurrentPointer(runtime)).toBeNull()

    const activated = await mirror(true)
    const inForce = (await readCurrentPointer(runtime))!

    expect(activated).toMatchObject({ status: 'activated', previousPointerDigest: null, pointerDigest: currentVersionsDigest(corpus.pointer) })
    expect(inForce).toMatchObject({
      seq: 1,
      origin: 'repo_mirror',
      activatedByMemberId: null,
      activatedByPrincipalId: 'quoter-import',
      sourceCommitSha: FIXTURE_COMMIT,
      catalogDigest: corpus.pointer.catalog.digest,
      policyDigest: corpus.pointer.policy.digest,
      creditsDigest: corpus.pointer.credits.digest
    })
    expect(inForce.text).toBe(corpus.pointerText)

    expect((await mirror(true)).status).toBe('already_current')
    expect((await readCurrentPointer(runtime))?.seq).toBe(1)

    // The repository moved its pointer: the mirror follows, over the one in force.
    const moved = `${JSON.stringify({ ...corpus.pointer, reason: 'Local fixture: the repository moved its pointer.' }, null, 2)}\n`

    expect(await mirror(true, moved)).toMatchObject({ status: 'activated', previousPointerDigest: inForce.digest })
    expect((await readCurrentPointer(runtime))?.seq).toBe(2)
  })
})
