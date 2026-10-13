// The quote aggregate against the local cluster (TASK-2025, Slice 3).
//
// Connects as `greenhouse_app`, the user the platform logs in as (it inherits from the group `greenhouse_runtime`). Every rule is exercised twice: through the store
// (`quote-store.ts`), which answers with a `QuoterError`, and with raw SQL that skips the store, which the database
// must refuse by a NAMED constraint. Assertions read the SQLSTATE and that name, never the text of a message.
//
// Concurrency is real: two connections, two transactions, one advisory lock. Runs only through
// `pnpm quoter:test:local`. Skipped otherwise, and skipped is not green.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Client } from 'pg'

import { ROLE_CODES } from '@/config/role-codes'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { replayFrozenArtifact } from '@/lib/finance/pricing-v3/adapters/frozen-artifact'
import { loadStorageCorpus } from '@/lib/finance/pricing-v3/__tests__/storage-conformance'

import { assertQuoterAccess } from '../authz'
import { textDigest } from '../canonical-text'
import { isQuoterError } from '../errors'
import {
  addQuoteVersion,
  assignRecipient,
  createQuote,
  decideException,
  findVersionByReplayDigest,
  readExceptionApproval,
  readQuoteCurrent,
  readQuoteVersion,
  readVersionDocument,
  rebuildVersionIndex,
  recordStateTransition,
  storeVersionDocument
} from '../quote-store'
import { QUOTER_TRANSITIONS } from '../state-machine'

import { createLocalDatabase, inTransaction, localPgEnabled, rejectionOf } from './local-pg'
import { readQuoterMigrationDown } from './migration-sql'
import type { LocalDatabase } from './local-pg'
import type { QuoterNeed } from '../authz'
import type { QuoterActor, QuoterDataOrigin } from '../types'

const TIMEOUT = 120_000

const OWNER = 'org-local-efeonce'
const CLIENT = 'org-local-client'
const OTHER_CLIENT = 'org-local-other-client'

const MEMBER: QuoterActor = { kind: 'member', memberId: 'member-local-fixture', principalId: 'user-local-fixture' }
const AGENT: QuoterActor = { kind: 'agent', principalId: 'agent-local-fixture' }
const REASON = 'Local fixture: quote aggregate test.'

const SCHEMA = 'greenhouse_commercial'

// A validity date far enough that no run of this file sees it pass. The tests of expiry move "today" instead.
const VALID_UNTIL = '2090-01-01'

let commands = 0

const by = (actor: QuoterActor) => ({ actor, command: { commandExecutionId: `cmd-local-${(commands += 1)}` } })

const quoterCode = async (operation: Promise<unknown>) => {
  try {
    await operation
  } catch (error) {
    return isQuoterError(error) ? error.code : error
  }

  return 'resolved'
}

type Artifact = { path: string; text: string; replayDigest: string }

// The repository corpus, sorted into what the tests need: quotes within policy (smallest first, they replay
// fastest), quotes the engine flagged below the floor, and an artifact that did not calculate.
const classify = () => {
  const seen = new Set<string>()
  const inPolicy: Artifact[] = []
  const belowFloor: Artifact[] = []
  const notCalculated: Artifact[] = []

  for (const artifact of loadStorageCorpus().artifacts) {
    if (seen.has(artifact.replayDigest)) continue
    seen.add(artifact.replayDigest)

    // The engine's own reading, on the recomputed result: the store must freeze exactly this.
    const verdict = replayFrozenArtifact(JSON.parse(artifact.text))

    if (verdict.calculationStatus !== 'calculated') notCalculated.push(artifact)
    else if (verdict.belowFloor) belowFloor.push(artifact)
    else inPolicy.push(artifact)
  }

  const bySize = (a: Artifact, b: Artifact) => a.text.length - b.text.length

  return { inPolicy: inPolicy.sort(bySize), belowFloor: belowFloor.sort(bySize), notCalculated }
}

describe.skipIf(!localPgEnabled)('quoter quote aggregate (local cluster, as greenhouse_app)', () => {
  // Sorted on first use, inside a test or a hook: a skipped run never parses the 38 MB of the corpus.
  let classified: ReturnType<typeof classify> | undefined
  const corpus = () => (classified ??= classify())
  const databases: LocalDatabase[] = []

  // A cursor over the in-policy artifacts: within one database, every quote is a different calculation. `open`
  // rewinds it, because each group of tests has a database of its own.
  let next = 0

  const fresh = () => {
    const artifact = corpus().inPolicy[(next += 1) - 1]

    if (!artifact) throw new Error('The corpus has no more in-policy artifacts for this file')

    return artifact
  }

  const open = async () => {
    const database = await createLocalDatabase()

    databases.push(database)
    next = 0

    return {
      database,
      runtime: await database.connect('greenhouse_app'),
      other: await database.connect('greenhouse_app'),
      ops: await database.connect('greenhouse_ops')
    }
  }

  afterAll(async () => {
    await Promise.all(databases.map(database => database.drop()))
  })

  const create = (client: Client, artifact: Artifact, options: { origin?: QuoterDataOrigin; recipient?: string } = {}) =>
    inTransaction(client, () =>
      createQuote(client, {
        ...by(AGENT),
        ownerOrganizationId: OWNER,
        dataOrigin: options.origin ?? 'real',
        artifactText: artifact.text,
        origin: 'local',
        clientOrganizationId: options.recipient
      })
    )

  const writeDocument = (client: Client, quoteId: string, versionNumber: number, title = 'Propuesta') =>
    inTransaction(client, () =>
      storeVersionDocument(client, {
        ...by(AGENT),
        quoteId,
        versionNumber,
        brief: { title, notes: ['Local fixture'] },
        document: { title, sections: [{ heading: 'Alcance', body: title }] },
        templateDataVersion: 'local-fixture/1'
      })
    )

  const move = (
    client: Client,
    quoteId: string,
    to: 'issued' | 'revising' | 'withdrawn' | 'accepted' | 'rejected',
    options: {
      versionNumber?: number
      validUntil?: string | null
      actor?: QuoterActor
      expectedClientOrganizationId?: string
      expectedDocumentDigest?: string
    } = {}
  ) =>
    inTransaction(client, () =>
      recordStateTransition(client, {
        ...by(options.actor ?? AGENT),
        quoteId,
        to,
        versionNumber: options.versionNumber,
        // An issue declares its validity; `null` leaves it out on purpose.
        validUntil: options.validUntil === null ? undefined : (options.validUntil ?? (to === 'issued' ? VALID_UNTIL : undefined)),
        expectedClientOrganizationId: options.expectedClientOrganizationId,
        expectedDocumentDigest: options.expectedDocumentDigest,
        reason: REASON
      })
    )

  // A quote ready to be issued: a draft with its recipient and the document of its version 1.
  const ready = async (client: Client, artifact: Artifact, origin: QuoterDataOrigin = 'real') => {
    const { quoteId } = await create(client, artifact, { origin, recipient: CLIENT })

    await writeDocument(client, quoteId, 1)

    return quoteId
  }

  const counter = async (client: Client, series: QuoterDataOrigin) => {
    const { rows } = await client.query<{ next_value: string }>(
      `SELECT next_value::text FROM ${SCHEMA}.quoter_quote_number_counters WHERE series = $1`,
      [series]
    )

    return Number(rows[0].next_value)
  }

  it('the corpus gives what these tests need', () => {
    // In-policy artifacts are consumed one per quote by `fresh`, which fails loudly when the corpus runs out.
    expect(corpus().inPolicy.length).toBeGreaterThan(0)
    expect(corpus().belowFloor.length).toBeGreaterThanOrEqual(3)
    expect(corpus().notCalculated.length).toBeGreaterThanOrEqual(1)
  })

  describe('a quote from its creation to what the client holds', () => {
    let runtime: Client
    let ops: Client
    let quoteId: string
    let first: Artifact
    let second: Artifact

    beforeAll(async () => {
      ;({ runtime, ops } = await open())
      first = fresh()
      second = fresh()
    }, TIMEOUT)

    it('the state matrix in the database is the one TypeScript declares', async () => {
      const { rows } = await runtime.query<{ from_state: string; to_state: string; requires_human_gate: boolean }>(
        `SELECT from_state, to_state, requires_human_gate FROM ${SCHEMA}.quoter_state_matrix`
      )

      const pair = (from: string, to: string, gate: boolean) => `${from}>${to}:${gate}`

      expect(rows.map(row => pair(row.from_state, row.to_state, row.requires_human_gate)).sort()).toEqual(
        QUOTER_TRANSITIONS.map(transition => pair(transition.from, transition.to, transition.humanGate)).sort()
      )
    })

    it('creates a draft with its version 1: the artifact as written, no number, no recipient', async () => {
      const created = await create(runtime, first)

      quoteId = created.quoteId

      expect(created.version).toMatchObject({ versionNumber: 1, replayDigest: first.replayDigest, belowFloor: false, origin: 'local' })
      expect(created.version.text).toBe(first.text)
      expect(created.version.artifactDigest).toBe(textDigest(first.text))

      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({
        state: 'draft',
        ownerOrganizationId: OWNER,
        dataOrigin: 'real',
        quoteNumber: null,
        clientOrganizationId: null,
        latestVersionNumber: 1,
        issuedVersionNumber: null
      })

      // The database computed the same digest over the same bytes, and the row names who acted.
      const { rows } = await runtime.query<{ same: boolean; principal: string; kind: string }>(
        `SELECT ${SCHEMA}.quoter_text_digest(artifact_text) = artifact_digest AS same,
                registered_by_principal_id AS principal, registered_by_actor_kind AS kind
           FROM ${SCHEMA}.quoter_quote_versions WHERE quote_id = $1`,
        [quoteId]
      )

      expect(rows).toEqual([{ same: true, principal: AGENT.principalId, kind: 'agent' }])
    })

    it('an artifact that did not calculate is not a quote', async () => {
      expect(await quoterCode(create(runtime, corpus().notCalculated[0]))).toBe('quote_not_calculated')
    })

    it('one calculation lives in one quote that is not withdrawn', async () => {
      expect(await quoterCode(create(runtime, first))).toBe('artifact_already_registered')
      expect((await findVersionByReplayDigest(runtime, { replayDigest: first.replayDigest }))?.quoteId).toBe(quoteId)

      // Withdrawing a draft frees its calculation: an append-only table must leave that way out.
      const discarded = await create(runtime, second)

      await move(runtime, discarded.quoteId, 'withdrawn')
      expect(await quoterCode(move(runtime, discarded.quoteId, 'issued', { versionNumber: 1 }))).toBe('invalid_transition')
      expect(await quoterCode(inTransaction(runtime, () => addQuoteVersion(runtime, { ...by(AGENT), quoteId: discarded.quoteId, artifactText: fresh().text, origin: 'local' })))).toBe(
        'version_locked'
      )

      const again = await create(runtime, second)

      expect(again.quoteId).not.toBe(discarded.quoteId)
      expect((await findVersionByReplayDigest(runtime, { replayDigest: second.replayDigest }))?.quoteId).toBe(again.quoteId)
    })

    it('issuing needs a version that can be issued, a recipient and a document, in that order', async () => {
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 7 }))).toBe('version_not_issuable')
      expect(await quoterCode(move(runtime, quoteId, 'issued'))).toBe('version_not_issuable')
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1 }))).toBe('recipient_required')

      const assign = (organization: string) =>
        inTransaction(runtime, () => assignRecipient(runtime, { ...by(AGENT), quoteId, clientOrganizationId: organization, reason: REASON }))

      expect(await quoterCode(assign(OWNER))).toBe('recipient_organization_invalid')
      expect(await quoterCode(assign('org-that-does-not-exist'))).toBe('recipient_organization_invalid')

      // The recipient of a draft is reassigned as many times as needed: the last assignment rules.
      expect((await assign(OTHER_CLIENT)).assignmentSeq).toBe(1)
      expect((await assign(CLIENT)).assignmentSeq).toBe(2)
      expect((await readQuoteCurrent(runtime, quoteId))?.clientOrganizationId).toBe(CLIENT)

      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1 }))).toBe('document_required')

      const document = await writeDocument(runtime, quoteId, 1)

      expect(document.documentSeq).toBe(1)
      expect(await quoterCode(writeDocument(runtime, quoteId, 9))).toBe('version_not_found')

      // The issue is refused when what is in force is not what the caller saw.
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1, expectedClientOrganizationId: OTHER_CLIENT }))).toBe(
        'recipient_conflict'
      )
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1, expectedDocumentDigest: '0'.repeat(64) }))).toBe(
        'document_conflict'
      )
      expect((await readQuoteCurrent(runtime, quoteId))?.state).toBe('draft')
    })

    it('the first real quote issued is EO-QTE-15001, and the issue pins the version and the document', async () => {
      expect(await counter(runtime, 'real')).toBe(15001)

      const document = (await readVersionDocument(runtime, { quoteId, versionNumber: 1 }))!

      const issued = await move(runtime, quoteId, 'issued', {
        versionNumber: 1,
        expectedClientOrganizationId: CLIENT,
        expectedDocumentDigest: document.documentDigest
      })

      expect(issued.quoteNumber).toBe('EO-QTE-15001')
      expect(issued.object).toEqual({
        versionNumber: 1,
        artifactDigest: textDigest(first.text),
        documentSeq: 1,
        documentDigest: document.documentDigest
      })
      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({
        state: 'issued',
        quoteNumber: 'EO-QTE-15001',
        issuedVersionNumber: 1,
        issuedArtifactDigest: textDigest(first.text),
        issuedDocumentSeq: 1
      })
      expect(await counter(runtime, 'real')).toBe(15002)
    })

    it('what was issued is frozen: recipient, document and versions of an issued quote do not change', async () => {
      expect(await quoterCode(inTransaction(runtime, () => assignRecipient(runtime, { ...by(AGENT), quoteId, clientOrganizationId: OTHER_CLIENT, reason: REASON })))).toBe(
        'recipient_locked'
      )
      expect(await quoterCode(writeDocument(runtime, quoteId, 1, 'Corregida'))).toBe('document_locked')

      // And the database says the same to whoever skips the store.

      expect(
        await rejectionOf(
          runtime.query(
            `INSERT INTO ${SCHEMA}.quoter_quote_recipients
               (quote_id, assignment_seq, owner_organization_id, client_organization_id, assigned_by_actor_kind,
                assigned_by_principal_id, reason, command_execution_id)
             VALUES ($1, 0, $2, $3, 'agent', 'raw', 'raw reassign', 'cmd-raw')`,
            [quoteId, OWNER, OTHER_CLIENT]
          )
        )
      ).toMatchObject({ code: '23514', constraint: 'quoter_quote_recipients_only_in_draft' })

      expect(
        await rejectionOf(
          runtime.query(
            `INSERT INTO ${SCHEMA}.quoter_version_documents
               (quote_id, version_number, document_seq, owner_organization_id, brief_text, brief_digest, document_text,
                document_digest, template_data_version, stored_by_actor_kind, stored_by_principal_id, command_execution_id)
             VALUES ($1, 1, 0, $2, '{}', ${SCHEMA}.quoter_text_digest('{}'), '{}', ${SCHEMA}.quoter_text_digest('{}'),
                     'raw/1', 'agent', 'raw', 'cmd-raw')`,
            [quoteId, OWNER]
          )
        )
      ).toMatchObject({ code: '23514', constraint: 'quoter_version_documents_state_admits_document' })

      const version = fresh()

      expect(
        await rejectionOf(
          runtime.query(
            `INSERT INTO ${SCHEMA}.quoter_quote_versions
               (quote_id, version_number, owner_organization_id, artifact_text, artifact_digest, replay_digest,
                calculation_id, artifact_version, calculation_status, below_floor, origin, registered_by_actor_kind,
                registered_by_principal_id, command_execution_id)
             VALUES ($1, 2, $2, $3, $4, $5, 'calc-raw', 'pricing-v3-local-artifact/1', 'calculated', false, 'local',
                     'agent', 'raw', 'cmd-raw')`,
            [quoteId, OWNER, version.text, textDigest(version.text), version.replayDigest]
          )
        )
      ).toMatchObject({ code: '23514', constraint: 'quoter_quote_versions_state_admits_version' })
    })

    it('a new version over an issued quote opens a revision; the client still holds what was issued', async () => {
      const revision = fresh()

      const added = await inTransaction(runtime, () =>
        addQuoteVersion(runtime, { ...by(AGENT), quoteId, artifactText: revision.text, origin: 'platform', expectedVersion: 1 })
      )

      expect(added.version.versionNumber).toBe(2)
      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({
        state: 'revising',
        latestVersionNumber: 2,
        issuedVersionNumber: 1,
        quoteNumber: 'EO-QTE-15001'
      })

      // The caller that still believes the quote has one version is told so.
      expect(
        await quoterCode(inTransaction(runtime, () => addQuoteVersion(runtime, { ...by(AGENT), quoteId, artifactText: fresh().text, origin: 'local', expectedVersion: 1 })))
      ).toBe('version_conflict')

      // Version 1 stays as it was stored: nothing of the history was touched.
      expect((await readQuoteVersion(runtime, { quoteId, versionNumber: 1 }))?.text).toBe(first.text)
    })

    it('a revision is closed by issuing the new version or by going back to the one the client holds', async () => {
      // Back to version 1, the last one issued: version 2 was never sent.
      const back = await move(runtime, quoteId, 'issued', { versionNumber: 1 })

      expect(back.object?.versionNumber).toBe(1)
      expect(back.quoteNumber).toBe('EO-QTE-15001')

      // Reopened, version 2 gets its document and is issued: the number does not change and no number is consumed.
      await move(runtime, quoteId, 'revising')
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 2 }))).toBe('document_required')
      await writeDocument(runtime, quoteId, 2)

      const issued = await move(runtime, quoteId, 'issued', { versionNumber: 2 })

      expect(issued.quoteNumber).toBe('EO-QTE-15001')
      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({ state: 'issued', issuedVersionNumber: 2, latestVersionNumber: 2 })
      expect(await counter(runtime, 'real')).toBe(15002)

      // Version 1 is no longer the last one nor the last one issued.
      await move(runtime, quoteId, 'revising')
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1 }))).toBe('version_not_issuable')
    })

    it('the document of an issued quote is corrected by revising and issuing again; what was issued stays readable', async () => {
      const before = (await readVersionDocument(runtime, { quoteId, versionNumber: 2 }))!
      const corrected = await writeDocument(runtime, quoteId, 2, 'Propuesta corregida')

      expect(corrected.documentSeq).toBe(2)

      const issued = await move(runtime, quoteId, 'issued', { versionNumber: 2 })

      expect(issued.object).toMatchObject({ versionNumber: 2, documentSeq: 2, documentDigest: corrected.documentDigest })
      expect(await readVersionDocument(runtime, { quoteId, versionNumber: 2, documentSeq: 1 })).toEqual(before)

      // Every issue of the history still names the document it issued.
      const { rows } = await runtime.query<{ version_number: number; document_seq: number }>(
        `SELECT version_number, document_seq FROM ${SCHEMA}.quoter_state_transitions
          WHERE quote_id = $1 AND to_state = 'issued' ORDER BY transition_seq`,
        [quoteId]
      )

      expect(rows).toEqual([
        { version_number: 1, document_seq: 1 },
        { version_number: 1, document_seq: 1 },
        { version_number: 2, document_seq: 1 },
        { version_number: 2, document_seq: 2 }
      ])
    })

    it('the history has an order of its own: consecutive, per quote, whatever the clock says', async () => {
      const { rows } = await runtime.query<{ seq: number; from_state: string; to_state: string }>(
        `SELECT transition_seq AS seq, from_state, to_state FROM ${SCHEMA}.quoter_state_transitions
          WHERE quote_id = $1 ORDER BY transition_seq`,
        [quoteId]
      )

      expect(rows.map(row => row.seq)).toEqual(rows.map((_, index) => index + 1))
      expect(rows.map(row => `${row.from_state}>${row.to_state}`)).toEqual([
        'none>draft',
        'draft>issued',
        'issued>revising',
        'revising>issued',
        'issued>revising',
        'revising>issued',
        'issued>revising',
        'revising>issued'
      ])
    })

    it('a synthetic quote takes its number from its own series and consumes no real number', async () => {
      const synthetic = await ready(runtime, fresh(), 'synthetic')

      expect((await move(runtime, synthetic, 'issued', { versionNumber: 1 })).quoteNumber).toBe('EO-QTE-T-1')
      expect(await counter(runtime, 'real')).toBe(15002)
      expect(await counter(runtime, 'synthetic')).toBe(2)

      // The next real quote follows the first one, with no gap.
      const real = await ready(runtime, fresh())

      expect((await move(runtime, real, 'issued', { versionNumber: 1 })).quoteNumber).toBe('EO-QTE-15002')
    })

    it('an issue that does not commit consumes no number', async () => {
      const quote = await ready(runtime, fresh())
      const before = await counter(runtime, 'real')

      await runtime.query('BEGIN')

      const inside = await recordStateTransition(runtime, {
        ...by(AGENT),
        quoteId: quote,
        to: 'issued',
        versionNumber: 1,
        validUntil: VALID_UNTIL,
        reason: REASON
      })

      expect(inside.quoteNumber).toBe(`EO-QTE-${before}`)
      await runtime.query('ROLLBACK')

      expect(await counter(runtime, 'real')).toBe(before)
      expect((await readQuoteCurrent(runtime, quote))?.quoteNumber).toBeNull()
      expect((await move(runtime, quote, 'issued', { versionNumber: 1 })).quoteNumber).toBe(`EO-QTE-${before}`)
    })

    it('nobody picks a number: the runtime cannot write one nor move the counter, and the counter only steps by one', async () => {
      const draft = await ready(runtime, fresh())

      for (const statement of [
        `INSERT INTO ${SCHEMA}.quoter_quote_numbers (quote_id, quote_number, issued_transition_seq) VALUES ('${draft}', 'EO-QTE-1', 1)`,
        `UPDATE ${SCHEMA}.quoter_quote_number_counters SET next_value = next_value + 1`,
        `SELECT ${SCHEMA}.quoter_assign_number_on_first_issue()`
      ])
        expect((await rejectionOf(runtime.query(statement)))?.code, statement).toBe('42501')

      // The owner has the privilege; the rule is still there.
      for (const statement of [
        `UPDATE ${SCHEMA}.quoter_quote_number_counters SET next_value = 1 WHERE series = 'real'`,
        `UPDATE ${SCHEMA}.quoter_quote_number_counters SET next_value = next_value + 2 WHERE series = 'real'`,
        `UPDATE ${SCHEMA}.quoter_quote_number_counters SET prefix = 'EO-QTE-T-' WHERE series = 'real'`
      ])
        expect(await rejectionOf(ops.query(statement)), statement).toMatchObject({
          code: '23514',
          constraint: 'quoter_quote_number_counters_advances_by_one'
        })

      expect(await rejectionOf(ops.query(`DELETE FROM ${SCHEMA}.quoter_quote_number_counters`))).toMatchObject({
        code: '23514',
        constraint: 'quoter_append_only'
      })
    })

    it('append only: UPDATE, DELETE and TRUNCATE fail for the runtime and for the owner, on every table of the history', async () => {
      const history = [
        'quoter_quotes',
        'quoter_quote_versions',
        'quoter_state_transitions',
        'quoter_quote_recipients',
        'quoter_quote_numbers',
        'quoter_exception_approvals',
        'quoter_version_documents'
      ]

      for (const table of history) {
        const target = `${SCHEMA}.${table}`

        for (const statement of [`UPDATE ${target} SET quote_id = quote_id`, `DELETE FROM ${target}`, `TRUNCATE ${target} CASCADE`])
          expect((await rejectionOf(runtime.query(statement)))?.code, `${statement} as runtime`).toBe('42501')

        expect(await rejectionOf(ops.query(`TRUNCATE ${target} CASCADE`)), `TRUNCATE ${table} as owner`).toMatchObject({
          code: '23514',
          constraint: 'quoter_append_only'
        })
      }

      // Row triggers fire where there are rows: every table but the approvals holds some by now.
      for (const table of history.filter(name => name !== 'quoter_exception_approvals'))
        for (const statement of [`UPDATE ${SCHEMA}.${table} SET quote_id = quote_id`, `DELETE FROM ${SCHEMA}.${table}`])
          expect(await rejectionOf(ops.query(statement)), `${statement} as owner`).toMatchObject({
            code: '23514',
            constraint: 'quoter_append_only'
          })
    })

    it('the read index is rebuilt from the artifact; a wrong index never changes what a quote says', async () => {
      const ref = { quoteId, versionNumber: 1 }

      const index = async () =>
        (await runtime.query<{ currency: string | null; engine_version: string | null }>(
          `SELECT currency, engine_version FROM ${SCHEMA}.quoter_quote_version_index WHERE quote_id = $1 AND version_number = 1`,
          [quoteId]
        )).rows[0]

      const written = await index()
      const stored = (await readQuoteVersion(runtime, ref))!

      expect(written.currency).toBe(stored.index.currency)

      // The one table of the aggregate the runtime may update, and on purpose.
      await runtime.query(`UPDATE ${SCHEMA}.quoter_quote_version_index SET currency = 'XXX', engine_version = 'wrong' WHERE quote_id = $1`, [quoteId])

      expect((await readQuoteVersion(runtime, ref))?.index).toEqual(stored.index)
      expect((await readQuoteVersion(runtime, ref))?.text).toBe(first.text)

      await inTransaction(runtime, () => rebuildVersionIndex(runtime, ref))
      expect(await index()).toEqual(written)
      expect(await quoterCode(rebuildVersionIndex(runtime, { quoteId, versionNumber: 99 }))).toBe('version_not_found')
    })
  })

  describe('below the floor: the approval of a person, per version', () => {
    let runtime: Client
    let quoteId: string
    let below: Artifact
    let alsoBelow: Artifact

    const decide = (versionNumber: number, decision: 'approved' | 'revoked', actor: QuoterActor = MEMBER, target = quoteId) =>
      inTransaction(runtime, () =>
        decideException(runtime, {
          ...by(actor),
          quoteId: target,
          versionNumber,
          decision,
          reason: 'Local fixture: excepción bajo el piso.'
        })
      )

    beforeAll(async () => {
      ;({ runtime } = await open())
      ;[below, alsoBelow] = corpus().belowFloor
      quoteId = await ready(runtime, below)
    }, TIMEOUT)

    it('the version carries the verdict of the engine, and a version below the floor is not issued without approval', async () => {
      expect((await readQuoteVersion(runtime, { quoteId, versionNumber: 1 }))?.belowFloor).toBe(true)
      expect((await readQuoteCurrent(runtime, quoteId))?.latestBelowFloor).toBe(true)

      for (const actor of [AGENT, MEMBER])
        expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1, actor }))).toBe('exception_approval_required')
    })

    it('only an identified person decides, and only over a version the engine flagged', async () => {
      expect(await quoterCode(decide(1, 'approved', AGENT))).toBe('human_actor_required')
      expect(await quoterCode(decide(1, 'revoked'))).toBe('exception_decision_unchanged')
      expect(await quoterCode(decide(4, 'approved'))).toBe('version_not_found')

      const withinPolicy = await ready(runtime, fresh())

      expect(await quoterCode(decide(1, 'approved', MEMBER, withinPolicy))).toBe('exception_not_applicable')
      expect(await readExceptionApproval(runtime, { quoteId, versionNumber: 1 })).toBeNull()
    })

    it('the last decision rules: approved, revoked, approved again', async () => {
      const approved = await decide(1, 'approved')

      expect(approved).toMatchObject({ approvalSeq: 1, decision: 'approved', artifactDigest: textDigest(below.text) })
      expect(await quoterCode(decide(1, 'approved'))).toBe('exception_decision_unchanged')

      expect((await decide(1, 'revoked')).approvalSeq).toBe(2)
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1 }))).toBe('exception_approval_required')

      expect((await decide(1, 'approved')).approvalSeq).toBe(3)
      expect(await readExceptionApproval(runtime, { quoteId, versionNumber: 1 })).toMatchObject({
        approvalSeq: 3,
        decision: 'approved',
        decidedByMemberId: 'member-local-fixture'
      })

      // With the approval in force an agent issues it: the gate is the approval, not who issues.
      expect((await move(runtime, quoteId, 'issued', { versionNumber: 1, actor: AGENT })).quoteNumber).toBe('EO-QTE-15001')
    })

    it('an approval is revoked only while its version was never issued: afterwards the act is to withdraw', async () => {
      expect(await quoterCode(decide(1, 'revoked'))).toBe('exception_revocation_locked')

      const raw = runtime.query(
        `INSERT INTO ${SCHEMA}.quoter_exception_approvals
           (quote_id, version_number, approval_seq, owner_organization_id, artifact_digest, decision,
            decided_by_member_id, decided_by_principal_id, reason, command_execution_id)
         VALUES ($1, 1, 0, $2, $3, 'revoked', 'member-raw', 'raw', 'raw revocation after the issue', 'cmd-raw')`,
        [quoteId, OWNER, textDigest(below.text)]
      )

      expect(await rejectionOf(raw)).toMatchObject({ code: '23514', constraint: 'quoter_exception_approvals_revoke_before_issue' })
      expect((await readExceptionApproval(runtime, { quoteId, versionNumber: 1 }))?.decision).toBe('approved')
    })

    it('a new version does not inherit the approval', async () => {
      await inTransaction(runtime, () => addQuoteVersion(runtime, { ...by(AGENT), quoteId, artifactText: alsoBelow.text, origin: 'local' }))
      await writeDocument(runtime, quoteId, 2)

      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 2 }))).toBe('exception_approval_required')

      // Going back to the approved version the client holds needs nothing new.
      expect((await move(runtime, quoteId, 'issued', { versionNumber: 1 })).object?.versionNumber).toBe(1)
    })

    it('the database refuses the same things to whoever skips the store', async () => {
      const draft = await ready(runtime, corpus().belowFloor[2])
      const version = (await readQuoteVersion(runtime, { quoteId: draft, versionNumber: 1 }))!
      const document = (await readVersionDocument(runtime, { quoteId: draft, versionNumber: 1 }))!

      const transition = (from: string, to: string, issued: boolean) =>
        runtime.query(
          `INSERT INTO ${SCHEMA}.quoter_state_transitions
             (quote_id, transition_seq, owner_organization_id, from_state, to_state, version_number, artifact_digest,
              document_seq, document_digest, valid_until, actor_kind, actor_principal_id, reason, command_execution_id)
           VALUES ($1, 0, $2, $3, $4, $5::int, $6, $7::int, $8, $9::date, 'agent', 'raw', 'raw transition', 'cmd-raw')`,
          [
            draft,
            OWNER,
            from,
            to,
            ...(issued ? [1, version.artifactDigest, document.documentSeq, document.documentDigest, VALID_UNTIL] : [null, null, null, null, null])
          ]
        )

      const approval = (member: string | null, decision = 'approved', versionOf = draft) =>
        runtime.query(
          `INSERT INTO ${SCHEMA}.quoter_exception_approvals
             (quote_id, version_number, approval_seq, owner_organization_id, artifact_digest, decision,
              decided_by_member_id, decided_by_principal_id, reason, command_execution_id)
           VALUES ($1, 1, 0, $2, (SELECT artifact_digest FROM ${SCHEMA}.quoter_quote_versions WHERE quote_id = $1 AND version_number = 1),
                   $3, $4, 'raw', 'raw approval of an exception', 'cmd-raw')`,
          [versionOf, OWNER, decision, member]
        )

      expect(await rejectionOf(transition('draft', 'issued', true))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_issue_needs_exception_approval'
      })

      expect(await rejectionOf(transition('issued', 'revising', false))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_from_is_current'
      })
      // `draft → revising` is not a change that exists.
      expect(await rejectionOf(transition('draft', 'revising', false))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_pair_exists'
      })
      // An issue that does not say what it issues.
      expect(await rejectionOf(transition('draft', 'issued', false))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_issues_last_or_issued_version'
      })

      // An approval without a person, and one that repeats what is in force.
      expect((await rejectionOf(approval(null)))?.code).toBe('23502')
      expect(await rejectionOf(approval('member-raw', 'revoked'))).toMatchObject({
        code: '23514',
        constraint: 'quoter_exception_approvals_decision_changes_it'
      })

      const withinPolicy = await ready(runtime, fresh())

      expect(await rejectionOf(approval('member-raw', 'approved', withinPolicy))).toMatchObject({
        code: '23514',
        constraint: 'quoter_exception_approvals_version_is_below_floor'
      })
    })
  })

  describe('who owns a quote, and what the database asks of every row', () => {
    let runtime: Client

    beforeAll(async () => {
      ;({ runtime } = await open())
    }, TIMEOUT)

    const quote = (columns: string, values: string, params: unknown[] = []) =>
      runtime.query(`INSERT INTO ${SCHEMA}.quoter_quotes (${columns}) VALUES (${values})`, params)

    it('the owner is the operating entity, the origin is declared, and every row names who acted', async () => {
      const full = 'owner_organization_id, data_origin, created_by_actor_kind, created_by_principal_id, command_execution_id'

      expect(await rejectionOf(quote(full, `$1, 'real', 'agent', 'raw', 'cmd-raw'`, [CLIENT]))).toMatchObject({
        code: '23514',
        constraint: 'quoter_quotes_owner_is_operating_entity'
      })
      // The same row with the operating entity as its owner enters.
      expect(await rejectionOf(quote(full, `$1, 'real', 'agent', 'raw', 'cmd-raw'`, [OWNER]))).toBeNull()

      // No default for the origin: a quote that does not say what it is does not enter.
      expect(
        (await rejectionOf(
          quote('owner_organization_id, created_by_actor_kind, created_by_principal_id, command_execution_id', `$1, 'agent', 'raw', 'cmd-raw'`, [OWNER])
        ))?.code
      ).toBe('23502')
      // No principal, no command.
      expect((await rejectionOf(quote('owner_organization_id, data_origin, created_by_actor_kind, command_execution_id', `$1, 'real', 'agent', 'cmd-raw'`, [OWNER])))?.code).toBe(
        '23502'
      )
      expect((await rejectionOf(quote('owner_organization_id, data_origin, created_by_actor_kind, created_by_principal_id', `$1, 'real', 'agent', 'raw'`, [OWNER])))?.code).toBe(
        '23502'
      )
      // A member is named.
      expect(await rejectionOf(quote(full, `$1, 'real', 'member', 'raw', 'cmd-raw'`, [OWNER]))).toMatchObject({
        code: '23514',
        constraint: 'quoter_quotes_member_identified'
      })
      // An identifier is not a free text.
      expect((await rejectionOf(quote(`quote_id, ${full}`, `'../../etc/passwd', $1, 'real', 'agent', 'raw', 'cmd-raw'`, [OWNER])))?.code).toBe('23514')
    })

    it('the store answers the same for an owner that is not the operating entity', async () => {
      const attempt = inTransaction(runtime, () =>
        createQuote(runtime, { ...by(AGENT), ownerOrganizationId: CLIENT, dataOrigin: 'real', artifactText: fresh().text, origin: 'local' })
      )

      expect(await quoterCode(attempt)).toBe('owner_organization_unavailable')
    })

    it('a row of a quote cannot claim another owner', async () => {
      const { quoteId } = await create(runtime, fresh())

      expect(
        await rejectionOf(
          runtime.query(
            `INSERT INTO ${SCHEMA}.quoter_quote_recipients
               (quote_id, assignment_seq, owner_organization_id, client_organization_id, assigned_by_actor_kind,
                assigned_by_principal_id, reason, command_execution_id)
             VALUES ($1, 0, $2, $3, 'agent', 'raw', 'raw recipient', 'cmd-raw')`,
            [quoteId, OTHER_CLIENT, CLIENT]
          )
        )
      ).toMatchObject({ code: '23514', constraint: 'quoter_owner_matches_quote' })
    })
  })

  describe('after the issue: validity, and what the client answered', () => {
    let runtime: Client
    let other: Client
    let ops: Client

    // "Today" has one owner in the database (`quoter_today`). Replacing it, as the owner and only in this throwaway
    // database, is how a validity date is made to pass without waiting for it.
    const setToday = (day: string | null) =>
      ops.query(
        `CREATE OR REPLACE FUNCTION ${SCHEMA}.quoter_today() RETURNS date LANGUAGE sql STABLE AS $fn$ SELECT ${
          day ? `date '${day}'` : `(pg_catalog.now() AT TIME ZONE 'America/Santiago')::date`
        } $fn$`
      )

    const issuedQuote = async (validUntil = VALID_UNTIL) => {
      const quoteId = await ready(runtime, fresh())
      const issued = await move(runtime, quoteId, 'issued', { versionNumber: 1, validUntil })

      return { quoteId, quoteNumber: issued.quoteNumber! }
    }

    const transitionsOf = async (quoteId: string) =>
      (
        await runtime.query<{ to_state: string; version_number: number | null; document_seq: number | null; valid_until: string | null }>(
          `SELECT to_state, version_number, document_seq, valid_until::text AS valid_until
             FROM ${SCHEMA}.quoter_state_transitions WHERE quote_id = $1 ORDER BY transition_seq`,
          [quoteId]
        )
      ).rows

    beforeAll(async () => {
      ;({ runtime, other, ops } = await open())
    }, TIMEOUT)

    it('every issue says until which day it holds, and is not born expired', async () => {
      const quoteId = await ready(runtime, fresh())

      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1, validUntil: null }))).toBe('validity_required')
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1, validUntil: '31/12/2090' }))).toBe('validity_required')
      // Which day is "today" is the database's to say.
      expect(await quoterCode(move(runtime, quoteId, 'issued', { versionNumber: 1, validUntil: '2000-01-01' }))).toBe('validity_in_the_past')

      const issued = await move(runtime, quoteId, 'issued', { versionNumber: 1, validUntil: '2090-06-30' })

      expect(issued.validUntil).toBe('2090-06-30')
      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({ state: 'issued', effectiveState: 'issued', validUntil: '2090-06-30' })

      // Only an issue declares a validity, and it declares one always: the table says so to whoever skips the store.
      const version = (await readQuoteVersion(runtime, { quoteId, versionNumber: 1 }))!
      const document = (await readVersionDocument(runtime, { quoteId, versionNumber: 1 }))!

      const raw = (from: string, to: string, named: boolean, validUntil: string | null) =>
        runtime.query(
          `INSERT INTO ${SCHEMA}.quoter_state_transitions
             (quote_id, transition_seq, owner_organization_id, from_state, to_state, version_number, artifact_digest,
              document_seq, document_digest, valid_until, actor_kind, actor_principal_id, reason, command_execution_id)
           VALUES ($1, 0, $2, $3, $4, $5::int, $6, $7::int, $8, $9::date, 'agent', 'raw', 'raw transition', 'cmd-raw')`,
          [
            quoteId,
            OWNER,
            from,
            to,
            ...(named ? [1, version.artifactDigest, document.documentSeq, document.documentDigest] : [null, null, null, null]),
            validUntil
          ]
        )

      expect(await rejectionOf(raw('issued', 'revising', false, VALID_UNTIL))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_issue_names_its_validity'
      })
      expect(await rejectionOf(raw('issued', 'revising', true, null))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_names_its_object'
      })

      await move(runtime, quoteId, 'revising')

      expect(await rejectionOf(raw('revising', 'issued', true, null))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_issue_names_its_validity'
      })
      expect(await rejectionOf(raw('revising', 'issued', true, '2000-01-01'))).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_validity_not_past'
      })
    })

    it('the time of a change is the database clock, whatever the caller declares', async () => {
      const { quoteId } = await issuedQuote()

      await runtime.query(
        `INSERT INTO ${SCHEMA}.quoter_state_transitions
           (quote_id, transition_seq, owner_organization_id, from_state, to_state, actor_kind, actor_principal_id, reason,
            command_execution_id, occurred_at)
         VALUES ($1, 0, $2, 'issued', 'revising', 'agent', 'raw', 'raw backdated change', 'cmd-raw', '2001-01-01T00:00:00Z')`,
        [quoteId, OWNER]
      )

      const { rows } = await runtime.query<{ recent: boolean }>(
        `SELECT occurred_at > now() - interval '5 minutes' AS recent
           FROM ${SCHEMA}.quoter_state_transitions WHERE quote_id = $1 AND to_state = 'revising'`,
        [quoteId]
      )

      expect(rows).toEqual([{ recent: true }])
    })

    it('accepting and rejecting name the last thing issued, by an agent or by a person', async () => {
      const accepted = await issuedQuote()
      const outcome = await move(runtime, accepted.quoteId, 'accepted', { actor: AGENT })
      const issue = (await transitionsOf(accepted.quoteId)).find(row => row.to_state === 'issued')!

      expect(outcome.object).toMatchObject({ versionNumber: 1, documentSeq: 1 })
      expect((await transitionsOf(accepted.quoteId)).at(-1)).toEqual({ ...issue, to_state: 'accepted', valid_until: null })
      expect(await readQuoteCurrent(runtime, accepted.quoteId)).toMatchObject({
        state: 'accepted',
        effectiveState: 'accepted',
        quoteNumber: accepted.quoteNumber,
        issuedVersionNumber: 1
      })

      const rejected = await issuedQuote()

      await move(runtime, rejected.quoteId, 'rejected', { actor: MEMBER })
      expect((await readQuoteCurrent(runtime, rejected.quoteId))?.state).toBe('rejected')

      // A draft was never issued: there is nothing to answer.
      const draft = await ready(runtime, fresh())

      for (const to of ['accepted', 'rejected'] as const) expect(await quoterCode(move(runtime, draft, to))).toBe('invalid_transition')
    })

    it('the answer is about the last version ISSUED, never about one being prepared', async () => {
      const { quoteId } = await issuedQuote()

      await inTransaction(runtime, () => addQuoteVersion(runtime, { ...by(AGENT), quoteId, artifactText: fresh().text, origin: 'local' }))

      expect(await quoterCode(move(runtime, quoteId, 'accepted', { versionNumber: 2 }))).toBe('not_last_issued_version')

      const second = (await readQuoteVersion(runtime, { quoteId, versionNumber: 2 }))!
      const document = await writeDocument(runtime, quoteId, 2)

      const raw = runtime.query(
        `INSERT INTO ${SCHEMA}.quoter_state_transitions
           (quote_id, transition_seq, owner_organization_id, from_state, to_state, version_number, artifact_digest,
            document_seq, document_digest, actor_kind, actor_principal_id, reason, command_execution_id)
         VALUES ($1, 0, $2, 'revising', 'accepted', 2, $3, $4::int, $5, 'agent', 'raw', 'raw acceptance of a draft version', 'cmd-raw')`,
        [quoteId, OWNER, second.artifactDigest, document.documentSeq, document.documentDigest]
      )

      expect(await rejectionOf(raw)).toMatchObject({ code: '23514', constraint: 'quoter_state_transitions_responds_to_last_issued' })

      // While version 2 is prepared, the client accepts what it holds: version 1.
      expect((await move(runtime, quoteId, 'accepted', { versionNumber: 1 })).object?.versionNumber).toBe(1)
      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({ state: 'accepted', issuedVersionNumber: 1, latestVersionNumber: 2 })
    })

    it('no answer is a dead end: a new version, or the same one again, reopens the quote and keeps its number', async () => {
      const { quoteId, quoteNumber } = await issuedQuote()

      await move(runtime, quoteId, 'accepted')
      // Only `withdrawn` is terminal, and it is reached through a revision.
      expect(await quoterCode(move(runtime, quoteId, 'withdrawn'))).toBe('invalid_transition')
      expect(await quoterCode(move(runtime, quoteId, 'rejected'))).toBe('invalid_transition')

      // A new version over an accepted quote opens the revision by itself.
      const added = await inTransaction(runtime, () => addQuoteVersion(runtime, { ...by(AGENT), quoteId, artifactText: fresh().text, origin: 'local' }))

      expect(added.version.versionNumber).toBe(2)
      expect((await readQuoteCurrent(runtime, quoteId))?.state).toBe('revising')

      await writeDocument(runtime, quoteId, 2)
      expect((await move(runtime, quoteId, 'issued', { versionNumber: 2, validUntil: '2090-09-30' })).quoteNumber).toBe(quoteNumber)

      // An answer recorded by mistake: back to a revision, the last version issued is issued again, and answered.
      await move(runtime, quoteId, 'rejected')
      await move(runtime, quoteId, 'revising')
      await move(runtime, quoteId, 'issued', { versionNumber: 2, validUntil: '2090-10-31' })
      await move(runtime, quoteId, 'accepted')

      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({ state: 'accepted', quoteNumber, issuedVersionNumber: 2, validUntil: '2090-10-31' })
      expect((await transitionsOf(quoteId)).map(row => row.to_state)).toEqual([
        'draft', 'issued', 'accepted', 'revising', 'issued', 'rejected', 'revising', 'issued', 'accepted'
      ])

      // And from there it can still be withdrawn.
      await move(runtime, quoteId, 'revising')
      await move(runtime, quoteId, 'withdrawn')
      expect(await quoterCode(move(runtime, quoteId, 'revising'))).toBe('invalid_transition')
    })

    it('an answer and a new version at the same time: both enter, and the answer names the version that was issued', async () => {
      const { quoteId } = await issuedQuote()

      const results = await Promise.all([
        quoterCode(move(runtime, quoteId, 'accepted')),
        quoterCode(inTransaction(other, () => addQuoteVersion(other, { ...by(AGENT), quoteId, artifactText: fresh().text, origin: 'local' })))
      ])

      expect(results).toEqual(['resolved', 'resolved'])

      const answer = (await transitionsOf(quoteId)).find(row => row.to_state === 'accepted')!
      const current = (await readQuoteCurrent(runtime, quoteId))!

      expect(answer.version_number).toBe(1)
      expect(current).toMatchObject({ latestVersionNumber: 2, issuedVersionNumber: 1 })
      expect(['accepted', 'revising']).toContain(current.state)
    })

    it('expired is derived from the validity of the last issue, in one place, and only for what is still open', async () => {
      const stillOpen = await issuedQuote('2090-01-01')
      const revising = await issuedQuote('2090-01-01')
      const laterValidity = await issuedQuote('2090-12-31')
      const answered = await issuedQuote('2090-01-01')

      await move(runtime, revising.quoteId, 'revising')
      await move(runtime, answered.quoteId, 'accepted')

      try {
        // The last day of the validity still counts.
        await setToday('2090-01-01')
        expect((await readQuoteCurrent(runtime, stillOpen.quoteId))?.effectiveState).toBe('issued')

        await setToday('2090-01-02')

        expect(await readQuoteCurrent(runtime, stillOpen.quoteId)).toMatchObject({ state: 'issued', effectiveState: 'expired', validUntil: '2090-01-01' })
        expect(await readQuoteCurrent(runtime, revising.quoteId)).toMatchObject({ state: 'revising', effectiveState: 'expired' })
        expect((await readQuoteCurrent(runtime, laterValidity.quoteId))?.effectiveState).toBe('issued')
        // What was answered stays answered: only an issued or revising quote expires.
        expect((await readQuoteCurrent(runtime, answered.quoteId))?.effectiveState).toBe('accepted')

        // An expired quote is issued again with a new validity, and is open again; a validity already past is refused.
        await move(runtime, stillOpen.quoteId, 'revising')
        expect(await quoterCode(move(runtime, stillOpen.quoteId, 'issued', { versionNumber: 1, validUntil: '2090-01-01' }))).toBe('validity_in_the_past')

        const again = await move(runtime, stillOpen.quoteId, 'issued', { versionNumber: 1, validUntil: '2090-03-31' })

        expect(again.quoteNumber).toBe(stillOpen.quoteNumber)
        expect((await readQuoteCurrent(runtime, stillOpen.quoteId))?.effectiveState).toBe('issued')
      } finally {
        await setToday(null)
      }

      // With the real clock back, nothing here is expired.
      expect((await readQuoteCurrent(runtime, laterValidity.quoteId))?.effectiveState).toBe('issued')
    })

    it('an expired quote can be accepted or rejected; that the acceptance was late, and by how many days, stays readable', async () => {
      const today = (await runtime.query<{ today: string }>(`SELECT ${SCHEMA}.quoter_today()::text AS today`)).rows[0].today
      const daysSince = (day: string) => Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000)

      // In time, and on the very last day of the validity: neither is late.
      const inTime = await issuedQuote(VALID_UNTIL)
      const lastDay = await issuedQuote(today)

      await move(runtime, inTime.quoteId, 'accepted')
      await move(runtime, lastDay.quoteId, 'accepted')

      expect((await readQuoteCurrent(runtime, inTime.quoteId))?.acceptance).toMatchObject({ validUntil: VALID_UNTIL, afterValidity: false, daysAfterValidity: 0 })
      expect((await readQuoteCurrent(runtime, lastDay.quoteId))?.acceptance).toMatchObject({ validUntil: today, afterValidity: false, daysAfterValidity: 0 })

      // Two quotes whose validity is long past: "today" is moved back only to issue them.
      await setToday('2020-01-01')

      let late: Awaited<ReturnType<typeof issuedQuote>>
      let lateRejected: Awaited<ReturnType<typeof issuedQuote>>

      try {
        late = await issuedQuote('2020-01-10')
        lateRejected = await issuedQuote('2020-01-10')
      } finally {
        await setToday(null)
      }

      expect((await readQuoteCurrent(runtime, late.quoteId))?.effectiveState).toBe('expired')
      expect((await readQuoteCurrent(runtime, late.quoteId))?.acceptance).toBeNull()

      // Accepting it is allowed, by an agent too, and the record says it was late.
      await move(runtime, late.quoteId, 'accepted', { actor: AGENT })

      expect(await readQuoteCurrent(runtime, late.quoteId)).toMatchObject({
        state: 'accepted',
        effectiveState: 'accepted',
        quoteNumber: late.quoteNumber,
        acceptance: { validUntil: '2020-01-10', afterValidity: true, daysAfterValidity: daysSince('2020-01-10') }
      })
      expect(daysSince('2020-01-10')).toBeGreaterThan(2000)

      await move(runtime, lateRejected.quoteId, 'rejected')
      expect(await readQuoteCurrent(runtime, lateRejected.quoteId)).toMatchObject({ state: 'rejected', acceptance: null })

      // The reading follows the state: reopened, there is no acceptance in force; issued and accepted again in time,
      // it is not late any more, and it answers the new issue.
      await move(runtime, late.quoteId, 'revising')
      expect((await readQuoteCurrent(runtime, late.quoteId))?.acceptance).toBeNull()
      await move(runtime, late.quoteId, 'issued', { versionNumber: 1, validUntil: VALID_UNTIL })
      await move(runtime, late.quoteId, 'accepted')
      expect((await readQuoteCurrent(runtime, late.quoteId))?.acceptance).toMatchObject({ validUntil: VALID_UNTIL, afterValidity: false, daysAfterValidity: 0 })
    })

    it('an agent runs the whole life of a quote: every state, no person, no approval', async () => {
      // The machine subject of an internal binding of the ecosystem lane, as the platform derives it. Each step asks
      // the one door first, then writes through the store as the agent. A refusal anywhere here is a defect.
      const machine: TenantEntitlementSubject = {
        userId: 'consumer:efeonce-quoter-cli',
        tenantType: 'efeonce_internal',
        roleCodes: [ROLE_CODES.EFEONCE_ACCOUNT],
        primaryRoleCode: ROLE_CODES.EFEONCE_ACCOUNT,
        routeGroups: ['internal'],
        authorizedViews: []
      }

      const agent: QuoterActor = { kind: 'agent', principalId: machine.userId }
      const as = (need: QuoterNeed) => assertQuoterAccess({ subject: machine, need, actor: agent })
      const step = (to: Parameters<typeof move>[2], options: Parameters<typeof move>[3] = {}) => move(runtime, quoteId, to, { ...options, actor: agent })

      as('quote.create')

      const { quoteId } = await inTransaction(runtime, () =>
        createQuote(runtime, { ...by(agent), ownerOrganizationId: OWNER, dataOrigin: 'real', artifactText: fresh().text, origin: 'platform' })
      )

      as('quote.update')
      await inTransaction(runtime, () => assignRecipient(runtime, { ...by(agent), quoteId, clientOrganizationId: CLIENT, reason: REASON }))

      const document = (versionNumber: number) =>
        inTransaction(runtime, () =>
          storeVersionDocument(runtime, {
            ...by(agent),
            quoteId,
            versionNumber,
            brief: { title: 'Propuesta' },
            document: { title: 'Propuesta', sections: [] },
            templateDataVersion: 'local-fixture/1'
          })
        )

      await document(1)

      as('issue')

      const issued = await step('issued', { versionNumber: 1 })

      // The client rejects; a revision is opened from the rejection, and the same version is issued again.
      as('quote.update')
      await step('rejected')
      await step('revising')
      as('issue')
      await step('issued', { versionNumber: 1, validUntil: '2090-08-31' })

      // The client accepts; a new version over the accepted quote opens the revision by itself.
      as('quote.update')
      await step('accepted')
      as('quote.create')
      await inTransaction(runtime, () => addQuoteVersion(runtime, { ...by(agent), quoteId, artifactText: fresh().text, origin: 'platform' }))
      as('quote.update')
      await document(2)
      as('issue')
      await step('issued', { versionNumber: 2 })
      await step('accepted')
      await step('revising')
      await step('withdrawn')

      const { rows } = await runtime.query<{ pair: string; actor_kind: string; actor_member_id: string | null; requires_human_gate: boolean }>(
        `SELECT from_state || '>' || to_state AS pair, actor_kind, actor_member_id, requires_human_gate
           FROM ${SCHEMA}.quoter_state_transitions WHERE quote_id = $1 ORDER BY transition_seq`,
        [quoteId]
      )

      expect(rows.map(row => row.pair)).toEqual([
        'none>draft', 'draft>issued', 'issued>rejected', 'rejected>revising', 'revising>issued', 'issued>accepted',
        'accepted>revising', 'revising>issued', 'issued>accepted', 'accepted>revising', 'revising>withdrawn'
      ])
      expect(rows.every(row => row.actor_kind === 'agent' && row.actor_member_id === null && row.requires_human_gate === false)).toBe(true)
      expect(await readQuoteCurrent(runtime, quoteId)).toMatchObject({ state: 'withdrawn', quoteNumber: issued.quoteNumber, issuedVersionNumber: 2 })

      // No pair of the matrix asks for a person: nothing above passed by luck of the path taken.
      const gated = await runtime.query(`SELECT 1 FROM ${SCHEMA}.quoter_state_matrix WHERE requires_human_gate`)

      expect(gated.rows).toEqual([])

      // What the agent cannot do stays two acts: deciding an exception below the floor and activating the catalog.
      for (const need of ['exception', 'catalog.activate'] as const)
        expect(() => assertQuoterAccess({ subject: machine, need, actor: agent })).toThrow('forbidden')
    })

    it('today is the day in Santiago, not the day of the session', async () => {
      const { rows } = await runtime.query<{ today: string; santiago: string }>(
        `SELECT ${SCHEMA}.quoter_today()::text AS today, (now() AT TIME ZONE 'America/Santiago')::date::text AS santiago`
      )

      expect(rows[0].today).toBe(rows[0].santiago)

      // The same instant in a session that lives in another day still answers Santiago's.
      await runtime.query(`SET TIME ZONE 'Pacific/Kiritimati'`)

      try {
        const shifted = await runtime.query<{ today: string }>(`SELECT ${SCHEMA}.quoter_today()::text AS today`)

        expect(shifted.rows[0].today).toBe(rows[0].santiago)
      } finally {
        await runtime.query('RESET TIME ZONE')
      }
    })
  })

  describe('what the database holds on its own, whoever connects', () => {
    let database: LocalDatabase
    let runtime: Client
    let ops: Client

    beforeAll(async () => {
      ;({ database, runtime, ops } = await open())
    }, TIMEOUT)

    it('these tables are written under READ COMMITTED only: a snapshot would read what is in force before the lock', async () => {
      const artifact = fresh()

      for (const level of ['REPEATABLE READ', 'SERIALIZABLE']) {
        await runtime.query(`BEGIN ISOLATION LEVEL ${level}`)

        try {
          expect(
            await quoterCode(
              createQuote(runtime, { ...by(AGENT), ownerOrganizationId: OWNER, dataOrigin: 'synthetic', artifactText: artifact.text, origin: 'local' })
            ),
            level
          ).toBe('isolation_not_supported')
        } finally {
          await runtime.query('ROLLBACK')
        }

        await runtime.query(`BEGIN ISOLATION LEVEL ${level}`)

        try {
          expect(await rejectionOf(runtime.query(`SELECT ${SCHEMA}.quoter_lock_quote('qtr-anything')`)), level).toMatchObject({
            code: '23514',
            constraint: 'quoter_requires_read_committed'
          })
        } finally {
          await runtime.query('ROLLBACK')
        }
      }

      // The default level goes through.
      expect((await create(runtime, artifact, { origin: 'synthetic' })).version.versionNumber).toBe(1)
    })

    it('the time of every row is the database clock, whatever the caller declares', async () => {
      const { rows } = await runtime.query<{ recent: boolean }>(
        `INSERT INTO ${SCHEMA}.quoter_quotes
           (owner_organization_id, data_origin, created_by_actor_kind, created_by_principal_id, command_execution_id, created_at)
         VALUES ($1, 'synthetic', 'agent', 'raw', 'cmd-raw', '2001-01-01T00:00:00Z')
         RETURNING created_at > now() - interval '5 minutes' AS recent`,
        [OWNER]
      )

      expect(rows).toEqual([{ recent: true }])

      const { quoteId } = await create(runtime, fresh(), { origin: 'synthetic', recipient: CLIENT })

      await writeDocument(runtime, quoteId, 1)

      const stamps = await runtime.query<{ versions: boolean; recipients: boolean; documents: boolean }>(
        `SELECT (SELECT bool_and(registered_at > now() - interval '5 minutes') FROM ${SCHEMA}.quoter_quote_versions WHERE quote_id = $1) AS versions,
                (SELECT bool_and(assigned_at > now() - interval '5 minutes') FROM ${SCHEMA}.quoter_quote_recipients WHERE quote_id = $1) AS recipients,
                (SELECT bool_and(stored_at > now() - interval '5 minutes') FROM ${SCHEMA}.quoter_version_documents WHERE quote_id = $1) AS documents`,
        [quoteId]
      )

      expect(stamps.rows).toEqual([{ versions: true, recipients: true, documents: true }])

      // A raw insert that declares another time is stamped all the same.
      const backdated = await runtime.query<{ recent: boolean }>(
        `INSERT INTO ${SCHEMA}.quoter_quote_recipients
           (quote_id, assignment_seq, owner_organization_id, client_organization_id, assigned_by_actor_kind,
            assigned_by_principal_id, reason, command_execution_id, assigned_at)
         VALUES ($1, 0, $2, $3, 'agent', 'raw', 'raw backdated recipient', 'cmd-raw', '2001-01-01T00:00:00Z')
         RETURNING assigned_at > now() - interval '5 minutes' AS recent`,
        [quoteId, OWNER, OTHER_CLIENT]
      )

      expect(backdated.rows).toEqual([{ recent: true }])
    })

    it('a member is named, not an empty text', async () => {
      const quote = (member: string | null) =>
        runtime.query(
          `INSERT INTO ${SCHEMA}.quoter_quotes
             (owner_organization_id, data_origin, created_by_actor_kind, created_by_member_id, created_by_principal_id, command_execution_id)
           VALUES ($1, 'synthetic', 'member', $2, 'raw', 'cmd-raw')`,
          [OWNER, member]
        )

      for (const member of [null, '', '   '])
        expect(await rejectionOf(quote(member)), JSON.stringify(member)).toMatchObject({ code: '23514', constraint: 'quoter_quotes_member_identified' })

      expect(await rejectionOf(quote('member-raw'))).toBeNull()
    })

    it('the migrations role writes no row here: it cannot hand a number to a draft, move the counter or add a pair', async () => {
      const migrator = await database.connect('greenhouse_migrator_user')
      const { quoteId } = await create(runtime, fresh(), { origin: 'synthetic' })

      for (const statement of [
        `INSERT INTO ${SCHEMA}.quoter_quote_numbers (quote_id, quote_number, issued_transition_seq) VALUES ('${quoteId}', 'EO-QTE-15001', 1)`,
        `UPDATE ${SCHEMA}.quoter_quote_number_counters SET next_value = next_value + 1`,
        `INSERT INTO ${SCHEMA}.quoter_state_matrix (from_state, to_state, requires_human_gate) VALUES ('withdrawn', 'draft', false)`,
        `INSERT INTO ${SCHEMA}.quoter_quotes (owner_organization_id, data_origin, created_by_actor_kind, created_by_principal_id, command_execution_id)
         VALUES ('${OWNER}', 'real', 'service', 'raw', 'cmd-raw')`,
        `DELETE FROM ${SCHEMA}.quoter_source_documents`,
        `SELECT ${SCHEMA}.quoter_assign_number_on_first_issue()`
      ])
        expect((await rejectionOf(migrator.query(statement)))?.code, statement).toBe('42501')

      // It can still read, which is what a migration that checks its own work needs.
      expect((await migrator.query(`SELECT count(*)::int AS pairs FROM ${SCHEMA}.quoter_state_matrix`)).rows[0].pairs).toBeGreaterThan(0)
    })

    it('with a real quote registered the migration does not come down; with synthetic ones only, it does', async () => {
      const down = readQuoterMigrationDown('quoter-quote-aggregate')!

      const relations = async (client: Client) =>
        (await client.query<{ relations: number }>(
          `SELECT count(*)::int AS relations FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = '${SCHEMA}' AND c.relname LIKE 'quoter_quote%'`
        )).rows[0].relations

      // This database holds synthetic quotes only (the ones above): give it a real one.
      await create(runtime, fresh(), { origin: 'real' })

      const before = await relations(ops)

      expect(before).toBeGreaterThan(0)
      await ops.query('BEGIN')
      expect((await rejectionOf(ops.query(down)))?.code).toBe('P0001')
      await ops.query('ROLLBACK')
      expect(await relations(ops)).toBe(before)

      // Another database, with a synthetic quote only: the same Down runs to the end.
      const synthetic = await open()

      await create(synthetic.runtime, fresh(), { origin: 'synthetic' })
      await synthetic.ops.query('BEGIN')
      await synthetic.ops.query(down)
      await synthetic.ops.query('COMMIT')
      expect(await relations(synthetic.ops)).toBe(0)
    })
  })

  describe('two writers at once', () => {
    let runtime: Client
    let other: Client

    beforeAll(async () => {
      ;({ runtime, other } = await open())
    }, TIMEOUT)

    const outcomes = (operations: Promise<unknown>[]) => Promise.all(operations.map(quoterCode))
    const count = (results: unknown[], value: unknown) => results.filter(result => result === value).length

    it('the same draft issued twice at the same time: one issue, one number', async () => {
      const quoteId = await ready(runtime, fresh())
      const before = await counter(runtime, 'real')
      const results = await outcomes([runtime, other].map(client => move(client, quoteId, 'issued', { versionNumber: 1 })))

      expect(count(results, 'resolved')).toBe(1)
      expect(count(results, 'invalid_transition')).toBe(1)
      expect(await counter(runtime, 'real')).toBe(before + 1)
      expect((await readQuoteCurrent(runtime, quoteId))?.quoteNumber).toBe(`EO-QTE-${before}`)
    })

    it('the lock is the one of the database too: two raw issues at once, one enters and the other is told the state moved', async () => {
      const quoteId = await ready(runtime, fresh())
      const version = (await readQuoteVersion(runtime, { quoteId, versionNumber: 1 }))!
      const document = (await readVersionDocument(runtime, { quoteId, versionNumber: 1 }))!
      const before = await counter(runtime, 'real')

      // No store, no explicit transaction: only what the trigger of the table does on its own.
      const raw = (client: Client) =>
        client.query(
          `INSERT INTO ${SCHEMA}.quoter_state_transitions
             (quote_id, transition_seq, owner_organization_id, from_state, to_state, version_number, artifact_digest,
              document_seq, document_digest, valid_until, actor_kind, actor_principal_id, reason, command_execution_id)
           VALUES ($1, 0, $2, 'draft', 'issued', 1, $3, $4::int, $5, $6::date, 'agent', 'raw', 'raw concurrent issue', 'cmd-raw')`,
          [quoteId, OWNER, version.artifactDigest, document.documentSeq, document.documentDigest, VALID_UNTIL]
        )

      const rejections = await Promise.all([runtime, other].map(client => rejectionOf(raw(client))))

      expect(rejections.filter(rejection => rejection === null)).toHaveLength(1)
      expect(rejections.find(rejection => rejection !== null)).toMatchObject({
        code: '23514',
        constraint: 'quoter_state_transitions_from_is_current'
      })
      expect(await counter(runtime, 'real')).toBe(before + 1)

      const { rows } = await runtime.query<{ seq: number }>(
        `SELECT transition_seq AS seq FROM ${SCHEMA}.quoter_state_transitions WHERE quote_id = $1 ORDER BY transition_seq`,
        [quoteId]
      )

      expect(rows.map(row => row.seq)).toEqual([1, 2])
    })

    it('two quotes issued at the same time take consecutive numbers, with no gap and no repeat', async () => {
      const quotes = [await ready(runtime, fresh()), await ready(runtime, fresh())]
      const before = await counter(runtime, 'real')

      const issued = await Promise.all([runtime, other].map((client, index) => move(client, quotes[index], 'issued', { versionNumber: 1 })))

      expect(issued.map(result => result.quoteNumber).sort()).toEqual([`EO-QTE-${before}`, `EO-QTE-${before + 1}`])
      expect(await counter(runtime, 'real')).toBe(before + 2)
    })

    it('the same calculation registered twice at the same time: one quote', async () => {
      const artifact = fresh()
      const results = await outcomes([runtime, other].map(client => create(client, artifact)))

      expect(count(results, 'resolved')).toBe(1)
      expect(count(results, 'artifact_already_registered')).toBe(1)
    })

    it('two versions added at the same time: consecutive numbers, or one conflict when both expected the same', async () => {
      const { quoteId } = await create(runtime, fresh())

      const add = (client: Client, expectedVersion?: number) =>
        inTransaction(client, () => addQuoteVersion(client, { ...by(AGENT), quoteId, artifactText: fresh().text, origin: 'local', expectedVersion }))

      const both = await Promise.all([add(runtime), add(other)])

      expect(both.map(result => result.version.versionNumber).sort()).toEqual([2, 3])

      const results = await outcomes([add(runtime, 3), add(other, 3)])

      expect(count(results, 'resolved')).toBe(1)
      expect(count(results, 'version_conflict')).toBe(1)
      expect((await readQuoteCurrent(runtime, quoteId))?.latestVersionNumber).toBe(4)
    })

    it('an issue and a change of recipient at the same time: the issue never carries a recipient its caller did not see', async () => {
      const quoteId = await ready(runtime, fresh())

      const results = await outcomes([
        move(runtime, quoteId, 'issued', { versionNumber: 1, expectedClientOrganizationId: CLIENT }),
        inTransaction(other, () => assignRecipient(other, { ...by(AGENT), quoteId, clientOrganizationId: OTHER_CLIENT, reason: REASON }))
      ])

      const current = (await readQuoteCurrent(runtime, quoteId))!

      // Either the issue went first and the recipient was already frozen, or the recipient moved and the issue was told.
      expect(count(results, 'resolved')).toBe(1)
      expect([
        ['resolved', 'recipient_locked'],
        ['recipient_conflict', 'resolved']
      ]).toContainEqual(results)
      expect(current.state).toBe(results[0] === 'resolved' ? 'issued' : 'draft')
      expect(current.clientOrganizationId).toBe(results[0] === 'resolved' ? CLIENT : OTHER_CLIENT)
    })

    it('an issue and a correction of its document at the same time: the issue names the document it pinned', async () => {
      const quoteId = await ready(runtime, fresh())
      const seen = (await readVersionDocument(runtime, { quoteId, versionNumber: 1 }))!

      const results = await outcomes([
        move(runtime, quoteId, 'issued', { versionNumber: 1, expectedDocumentDigest: seen.documentDigest }),
        writeDocument(other, quoteId, 1, 'Corregida a la vez')
      ])

      expect(count(results, 'resolved')).toBe(1)
      expect([
        ['resolved', 'document_locked'],
        ['document_conflict', 'resolved']
      ]).toContainEqual(results)
    })
  })
})

describe('what is read from a quote is believed only after its digests are recomputed (no database)', () => {
  const artifact = loadStorageCorpus().artifacts.reduce((smallest, candidate) => (candidate.text.length < smallest.text.length ? candidate : smallest))

  const row = (overrides: Record<string, unknown>) => ({
    query: async () => ({
      rows: [
        {
          quote_id: 'qtr-fixture',
          version_number: 1,
          artifact_text: artifact.text,
          artifact_digest: textDigest(artifact.text),
          replay_digest: artifact.replayDigest,
          calculation_id: artifact.calculationId,
          below_floor: false,
          origin: 'local',
          registered_at: new Date(),
          ...overrides
        }
      ]
    })
  })

  const read = (overrides: Record<string, unknown>) => readQuoteVersion(row(overrides) as never, { quoteId: 'qtr-fixture', versionNumber: 1 })

  it('a version whose text, replay digest or calculation does not match is rejected by the reader', async () => {
    expect((await read({}))?.text).toBe(artifact.text)

    for (const overrides of [
      { artifact_digest: '0'.repeat(64) },
      { replay_digest: '0'.repeat(64) },
      { calculation_id: 'another-calculation' },
      { artifact_text: 'not json', artifact_digest: textDigest('not json') }
    ]) {
      const outcome = await read(overrides).then(
        () => 'resolved',
        error => (isQuoterError(error) ? error.code : error)
      )

      expect(outcome, JSON.stringify(Object.keys(overrides))).toBe('stored_digest_mismatch')
    }
  })
})
