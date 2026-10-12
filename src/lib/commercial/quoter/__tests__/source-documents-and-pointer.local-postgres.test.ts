// Source documents by digest and the pointer history, against the local cluster (TASK-2025, Slice 2).
//
// Connects as `greenhouse_runtime`, the role the platform runs as, so what is exercised is the migration with its
// GRANTs and its triggers, not a superuser walking around them. Runs only through `pnpm quoter:test:local`.
// Skipped otherwise, and skipped is not green.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Client } from 'pg'

import { buildCurrentVersions, currentVersionsDigest } from '@/lib/finance/pricing-v3/adapters/current-versions'
import { loadStorageCorpus } from '@/lib/finance/pricing-v3/__tests__/storage-conformance'
import type { CurrentVersions } from '@/lib/finance/pricing-v3/adapters/current-versions'

import { textDigest } from '../canonical-text'
import { isQuoterError } from '../errors'
import { activatePointer, readCurrentPointer } from '../pointer-store'
import { findSourceDocument, listSourceDocuments, storeSourceDocument } from '../source-documents-store'

import { FIXTURE_COMMIT, createLocalDatabase, inTransaction, localPgEnabled, rejectionOf } from './local-pg'
import type { LocalDatabase } from './local-pg'

const MEMBER = { kind: 'member', memberId: 'member-local-fixture', principalId: 'user-local-fixture' } as const
const JOB = { kind: 'service', principalId: 'quoter-import' } as const
const REASON = 'Local fixture: quoter store test.'

const quoterCode = async (operation: Promise<unknown>) => {
  try {
    await operation
  } catch (error) {
    return isQuoterError(error) ? error.code : error
  }

  return 'resolved'
}

describe.skipIf(!localPgEnabled)('quoter source documents and pointer (local cluster, as greenhouse_runtime)', () => {
  const corpus = loadStorageCorpus()
  const document = (role: 'catalog' | 'policy' | 'credits') => corpus.documents.find(candidate => candidate.digest === corpus.pointer[role].digest)!

  let database: LocalDatabase
  let runtime: Client
  let ops: Client

  const store = (role: 'catalog' | 'policy' | 'credits', text = document(role).text) =>
    inTransaction(runtime, () =>
      storeSourceDocument(runtime, {
        role,
        text,
        origin: 'repo_import',
        sourcePath: document(role).path,
        sourceCommitSha: FIXTURE_COMMIT,
        actor: JOB,
        reason: REASON
      })
    )

  const activate = (pointer: CurrentVersions, confirmDigest: string | null, client: Client = runtime) =>
    inTransaction(client, () =>
      activatePointer(client, {
        text: `${JSON.stringify(pointer, null, 2)}\n`,
        confirmDigest,
        origin: 'repo_mirror',
        actor: JOB,
        sourceCommitSha: FIXTURE_COMMIT,
        reason: REASON
      })
    )

  beforeAll(async () => {
    database = await createLocalDatabase()
    runtime = await database.connect('greenhouse_runtime')
    ops = await database.connect('greenhouse_ops')
  })

  afterAll(async () => database?.drop())

  it('stores a document as the canonical text of its validated value, under the digest a pointer names', async () => {
    const stored = await store('catalog')

    expect(stored).toMatchObject({
      role: 'catalog',
      version: corpus.pointer.catalog.version,
      digest: corpus.pointer.catalog.digest,
      origin: 'repo_import',
      sourceCommitSha: FIXTURE_COMMIT
    })
    // As it was written: not a rendering of it.
    expect(stored.text).toBe(document('catalog').text)

    // The database computed the same digest over the same bytes.
    const { rows } = await runtime.query<{ digest: string }>(
      `SELECT greenhouse_commercial.quoter_text_digest(document_text) AS digest
         FROM greenhouse_commercial.quoter_source_documents
        WHERE role = 'catalog' AND document_text_digest = greenhouse_commercial.quoter_text_digest(document_text)`
    )

    expect(rows[0].digest).toBe(textDigest(document('catalog').text))
  })

  it('publishes one event per stored document, in the same transaction, with no content in it', async () => {
    const { rows } = await runtime.query<{ event_type: string; aggregate_id: string; payload_json: Record<string, unknown> }>(
      `SELECT event_type, aggregate_id, payload_json FROM greenhouse_sync.outbox_events ORDER BY occurred_at`
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].event_type).toBe('commercial.quoter.source_document.stored')
    expect(rows[0].aggregate_id).toBe(`catalog:${corpus.pointer.catalog.digest}`)
    expect(Object.keys(rows[0].payload_json).sort()).toEqual(
      ['actorKind', 'documentDigest', 'documentVersion', 'origin', 'role', 'version'].sort()
    )
  })

  it('never replaces: the same role and version again is refused, same content or another', async () => {
    expect(await quoterCode(store('catalog'))).toBe('source_document_exists')

    const other = JSON.parse(document('catalog').text) as { evidence: unknown[] }

    other.evidence = [...other.evidence].reverse()
    expect(await quoterCode(store('catalog', JSON.stringify(other)))).toBe('source_document_exists')

    // The same document written another way (no indentation) is still the same document: same identity, refused.
    expect(await quoterCode(store('catalog', JSON.stringify(JSON.parse(document('catalog').text))))).toBe('source_document_exists')

    // The refused write left nothing behind: its event rolled back with it.
    const { rows } = await runtime.query<{ documents: string; events: string }>(
      `SELECT (SELECT count(*) FROM greenhouse_commercial.quoter_source_documents)::text AS documents,
              (SELECT count(*) FROM greenhouse_sync.outbox_events)::text AS events`
    )

    expect(rows[0]).toEqual({ documents: '1', events: '1' })
  })

  it('finds a document by version, by digest or by both, and not under an identity it does not have', async () => {
    const { version, digest } = corpus.pointer.catalog

    expect((await findSourceDocument(runtime, { role: 'catalog', version }))?.digest).toBe(digest)
    expect((await findSourceDocument(runtime, { role: 'catalog', digest }))?.version).toBe(version)
    expect(await findSourceDocument(runtime, { role: 'catalog', version, digest })).not.toBeNull()
    expect(await findSourceDocument(runtime, { role: 'catalog', version, digest: '0'.repeat(64) })).toBeNull()
    expect(await findSourceDocument(runtime, { role: 'policy', version })).toBeNull()
    expect(await findSourceDocument(runtime, { role: 'catalog' })).toBeNull()
    expect((await listSourceDocuments(runtime)).map(row => `${row.role}:${row.version}`)).toEqual([`catalog:${version}`])
  })

  it('the database refuses a text that does not give its digest, whoever inserts it', async () => {
    const insert = (client: Client) =>
      client.query(
        `INSERT INTO greenhouse_commercial.quoter_source_documents
           (role, version, document_digest, document_text, document_text_digest, origin, source_path,
            source_commit_sha, stored_by_actor_kind, stored_by_principal_id, reason)
         VALUES ('policy', 'forged-v1', $1, '{"forged":true}', $1, 'repo_import', 'x.json', $2, 'service', 'forger',
                 'forged digest')`,
        ['0'.repeat(64), FIXTURE_COMMIT]
      )

    for (const client of [runtime, ops])
      expect(await rejectionOf(insert(client))).toMatchObject({ code: '23514', constraint: 'quoter_source_documents_text_digest' })
  })

  it('a document read from the repository names its file and its commit; every row names who stored it', async () => {
    const withoutCommit = inTransaction(runtime, () =>
      storeSourceDocument(runtime, {
        role: 'policy',
        text: document('policy').text,
        origin: 'repo_import',
        sourcePath: document('policy').path,
        actor: JOB,
        reason: REASON
      })
    )

    expect(await quoterCode(withoutCommit)).toBe('source_commit_required')

    // And the table says the same to whoever skips the store.
    const raw = (columns: string, values: string) =>
      runtime.query(
        `INSERT INTO greenhouse_commercial.quoter_source_documents
           (role, version, document_digest, document_text, document_text_digest, origin, stored_by_actor_kind, reason${columns})
         VALUES ('policy', 'raw-v1', greenhouse_commercial.quoter_text_digest('{}'), '{}',
                 greenhouse_commercial.quoter_text_digest('{}'), 'repo_import', 'service',
                 'raw insert'${values})`
      )

    expect(await rejectionOf(raw(', stored_by_principal_id', `, 'job'`))).toMatchObject({
      code: '23514',
      constraint: 'quoter_source_documents_origin_names_its_source'
    })
    expect((await rejectionOf(raw(', source_path, source_commit_sha', `, 'x.json', '${FIXTURE_COMMIT}'`)))?.code).toBe('23502')
  })

  it('append only: UPDATE, DELETE and TRUNCATE fail for the runtime and for the owner', async () => {
    for (const table of ['quoter_source_documents', 'quoter_pointer_history']) {
      const target = `greenhouse_commercial.${table}`

      // The runtime has no such privilege at all.
      for (const statement of [`UPDATE ${target} SET reason = 'changed'`, `DELETE FROM ${target}`, `TRUNCATE ${target} CASCADE`])
        expect((await rejectionOf(runtime.query(statement)))?.code, `${statement} as runtime`).toBe('42501')
    }

    // The owner has the privilege; the trigger refuses it. The table holds a row, so the row triggers fire.
    const owned = 'greenhouse_commercial.quoter_source_documents'

    for (const statement of [`UPDATE ${owned} SET reason = 'changed'`, `DELETE FROM ${owned}`, `TRUNCATE ${owned} CASCADE`])
      expect(await rejectionOf(ops.query(statement)), `${statement} as owner`).toMatchObject({
        code: '23514',
        constraint: 'quoter_append_only'
      })

    expect(await rejectionOf(ops.query(`TRUNCATE greenhouse_commercial.quoter_pointer_history`))).toMatchObject({
      code: '23514',
      constraint: 'quoter_append_only'
    })
  })

  it('storing documents never activates: the pointer is still absent', async () => {
    await store('policy')
    await store('credits')

    expect(await readCurrentPointer(runtime)).toBeNull()
  })

  it('a pointer enters only over the pointer the caller read', async () => {
    const first = corpus.pointer
    const firstDigest = currentVersionsDigest(first)

    // A digest offered when no pointer exists means the caller expected one that is gone.
    expect(await quoterCode(activate(first, firstDigest))).toBe('pointer_conflict')

    const stored = await activate(first, null)

    expect(stored).toMatchObject({ seq: 1, digest: firstDigest, previousDigest: null, catalogDigest: first.catalog.digest })
    // Opaque: the text read is the text written, indentation and all.
    expect((await readCurrentPointer(runtime))?.text).toBe(`${JSON.stringify(first, null, 2)}\n`)

    const second = { ...first, reason: 'Local fixture: a second pointer.' }

    for (const wrong of [null, '0'.repeat(64), currentVersionsDigest(second)])
      expect(await quoterCode(activate(second, wrong))).toBe('pointer_conflict')

    expect((await activate(second, firstDigest)).seq).toBe(2)
    expect((await readCurrentPointer(runtime))?.digest).toBe(currentVersionsDigest(second))

    // Going back to the first pointer, byte for byte, is allowed: nothing in an append-only table blocks it forever.
    expect((await activate(first, currentVersionsDigest(second))).seq).toBe(3)

    const { rows } = await runtime.query<{ current: string }>(`SELECT pointer_digest AS current FROM greenhouse_commercial.quoter_current_pointer`)

    expect(rows[0].current).toBe(firstDigest)
  })

  it('two activations over the same pointer: exactly one enters', async () => {
    const other = await database.connect('greenhouse_runtime')
    const inForce = (await readCurrentPointer(runtime))!
    const base = corpus.pointer

    const outcomes = await Promise.all(
      [runtime, other].map((client, index) =>
        quoterCode(activate({ ...base, reason: `Local fixture: concurrent activation ${index}.` }, inForce.digest, client))
      )
    )

    expect(outcomes.filter(outcome => outcome === 'pointer_conflict')).toHaveLength(1)
    expect(outcomes.filter(outcome => outcome === 'resolved')).toHaveLength(1)
    expect((await readCurrentPointer(runtime))?.seq).toBe(inForce.seq + 1)
  })

  it('a pointer cannot name a document the registry does not hold; activating takes a person, mirroring takes a commit', async () => {
    const inForce = (await readCurrentPointer(runtime))!

    const unknown = buildCurrentVersions({
      paths: { catalog: 'local/catalog.json', policy: corpus.pointer.policy.path, credits: corpus.pointer.credits.path },
      documents: {
        // A real, valid catalog that was never stored here: the oldest version of the corpus.
        catalog: JSON.parse(corpus.documents.find(candidate => candidate.role === 'catalog' && candidate.digest !== corpus.pointer.catalog.digest)!.text),
        policy: JSON.parse(document('policy').text),
        credits: JSON.parse(document('credits').text)
      },
      reason: 'Local fixture: names a catalog that is not held.',
      updatedAt: '2026-10-12'
    })

    expect(await quoterCode(activate(unknown, inForce.digest))).toBe('pointer_names_unknown_document')

    const pointerText = `${JSON.stringify(corpus.pointer, null, 2)}\n`

    const activateAs = (overrides: Partial<Parameters<typeof activatePointer>[1]>) =>
      quoterCode(
        inTransaction(runtime, () =>
          activatePointer(runtime, {
            text: pointerText,
            confirmDigest: inForce.digest,
            origin: 'platform_activation',
            actor: MEMBER,
            reason: REASON,
            ...overrides
          })
        )
      )

    // Activating on the platform is the act of a person; mirroring the repository names the commit instead.
    expect(await activateAs({ actor: { kind: 'agent', principalId: 'agent-local-fixture' } })).toBe('human_actor_required')
    expect(await activateAs({ actor: JOB })).toBe('human_actor_required')
    expect(await activateAs({ origin: 'repo_mirror', actor: JOB })).toBe('source_commit_required')

    // And the table itself says the same to whoever skips the store.
    const raw = (origin: string, member: string | null, commit: string | null) =>
      runtime.query(
        `INSERT INTO greenhouse_commercial.quoter_pointer_history
           (pointer_seq, pointer_digest, pointer_text, pointer_text_digest, previous_pointer_digest, catalog_digest,
            policy_digest, credits_digest, origin, activated_by_member_id, activated_by_principal_id,
            source_commit_sha, reason)
         VALUES (0, $1, 'x', greenhouse_commercial.quoter_text_digest('x'), $2, $3, $4, $5, $6, $7, 'raw', $8, 'raw insert')`,
        ['1'.repeat(64), inForce.digest, corpus.pointer.catalog.digest, corpus.pointer.policy.digest, corpus.pointer.credits.digest, origin, member, commit]
      )

    expect(await rejectionOf(raw('platform_activation', null, null))).toMatchObject({
      code: '23514',
      constraint: 'quoter_pointer_history_activation_needs_person'
    })
    expect(await rejectionOf(raw('repo_mirror', null, null))).toMatchObject({
      code: '23514',
      constraint: 'quoter_pointer_history_mirror_names_its_commit'
    })
    expect((await readCurrentPointer(runtime))?.seq).toBe(inForce.seq)

    // A person activates on the platform, over the pointer the mirror left; the row names both.
    const activated = await inTransaction(runtime, () =>
      activatePointer(runtime, {
        text: pointerText,
        confirmDigest: inForce.digest,
        origin: 'platform_activation',
        actor: MEMBER,
        reason: REASON
      })
    )

    expect(activated).toMatchObject({
      seq: inForce.seq + 1,
      origin: 'platform_activation',
      activatedByMemberId: MEMBER.memberId,
      activatedByPrincipalId: MEMBER.principalId,
      sourceCommitSha: null
    })
  })

  it('every activation published its event, with digests and no text', async () => {
    const { rows } = await runtime.query<{ payload_json: Record<string, unknown> }>(
      `SELECT payload_json FROM greenhouse_sync.outbox_events
        WHERE event_type = 'commercial.quoter.pointer.activated' ORDER BY (payload_json->>'pointerSeq')::int`
    )

    const inForce = (await readCurrentPointer(runtime))!

    expect(rows).toHaveLength(inForce.seq)
    expect(rows.map(row => row.payload_json.pointerSeq)).toEqual(rows.map((_, index) => index + 1))
    expect(Object.keys(rows[0].payload_json).sort()).toEqual(
      ['catalogDigest', 'creditsDigest', 'origin', 'pointerDigest', 'pointerSeq', 'policyDigest', 'previousPointerDigest', 'version'].sort()
    )
  })
})

describe('what is read from the registry is believed only after its digests are recomputed (no database)', () => {
  const corpus = loadStorageCorpus()

  it('a document row whose text does not give its digest is rejected by the reader', async () => {
    const corrupt = {
      query: async () => ({
        rows: [
          {
            role: 'credits',
            version: 'v1',
            document_digest: '1'.repeat(64),
            document_text: '{"tampered":true}',
            document_text_digest: '0'.repeat(64),
            schema_version: null,
            parent_digest: null,
            origin: 'repo_import',
            source_path: 'x.json',
            source_commit_sha: null,
            stored_at: new Date()
          }
        ]
      })
    }

    expect(await quoterCode(findSourceDocument(corrupt as never, { role: 'credits', version: 'v1' }))).toBe('stored_digest_mismatch')
  })

  it('a pointer row whose text or whose identity does not match is rejected by the reader', async () => {
    const text = `${JSON.stringify(corpus.pointer, null, 2)}\n`

    const row = (overrides: Record<string, unknown>) => ({
      query: async () => ({
        rows: [
          {
            pointer_seq: '1',
            pointer_digest: currentVersionsDigest(corpus.pointer),
            pointer_text: text,
            pointer_text_digest: textDigest(text),
            previous_pointer_digest: null,
            catalog_digest: corpus.pointer.catalog.digest,
            policy_digest: corpus.pointer.policy.digest,
            credits_digest: corpus.pointer.credits.digest,
            origin: 'repo_mirror',
            activated_by_member_id: null,
            activated_by_principal_id: 'job',
            source_commit_sha: null,
            reason: 'fixture',
            activated_at: new Date(),
            ...overrides
          }
        ]
      })
    })

    expect((await readCurrentPointer(row({}) as never))?.seq).toBe(1)
    expect(await quoterCode(readCurrentPointer(row({ pointer_text_digest: '0'.repeat(64) }) as never))).toBe('stored_digest_mismatch')
    expect(await quoterCode(readCurrentPointer(row({ pointer_digest: '0'.repeat(64) }) as never))).toBe('stored_digest_mismatch')
    expect(await quoterCode(readCurrentPointer(row({ pointer_text: 'not json', pointer_text_digest: textDigest('not json') }) as never))).toBe(
      'stored_digest_mismatch'
    )
  })
})
