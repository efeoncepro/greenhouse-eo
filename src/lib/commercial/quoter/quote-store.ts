import 'server-only'

import { replayFrozenArtifact } from '@/lib/finance/pricing-v3/adapters/frozen-artifact'
import { parseStoredText } from '@/lib/finance/pricing-v3/storage'
import type { FrozenArtifactVerdict } from '@/lib/finance/pricing-v3/adapters/frozen-artifact'

import { highest, readArtifactIndex } from './artifact-index'
import { canonicalJson, textDigest } from './canonical-text'
import { runQuoterQuery, toIso } from './db'
import { QuoterError, withQuoterRejections } from './errors'
import { QUOTER_EXPIRED, QUOTER_INITIAL_ORIGIN, findQuoterTransition, isQuoterQuoteState } from './state-machine'
import { memberIdOf } from './types'
import type { ArtifactIndex } from './artifact-index'
import type { QuoterDbClient } from './db'
import type { QuoterEffectiveState, QuoterQuoteState, QuoterTransitionOrigin } from './state-machine'
import type { QuoterActor, QuoterCommandContext, QuoterDataOrigin } from './types'

/**
 * The ONE write door of the quote aggregate (TASK-2025).
 *
 * Every row of a quote, a version, a state change, a recipient, an exception approval or a document is written by a
 * function of this file, inside the transaction it receives. The public number is the one row nobody here writes:
 * the database assigns it, in the transaction of the first issue. The storage adapter, the importer and
 * the commands of TASK-2027 call these same functions; none of them writes SQL of its own over these tables, and a
 * static test holds that line. The audit of the previous quoter found three doors; this one has one.
 *
 * What a function decides, it decides under the lock of its quote (`quoter_lock_quote`, the same lock the database
 * triggers take), so the answer it read is still true when it writes. The triggers repeat every rule: they are the
 * backstop, not the first line.
 *
 * A version IS the frozen artifact, stored as the text it was written as. Its read indexes live in a sibling table
 * that can be rebuilt from that text at any time (`rebuildVersionIndex`). No reader here rebuilds a result from
 * columns: what a quote says comes from parsing the stored text.
 */
export type QuoteWriteContext = { actor: QuoterActor; command: QuoterCommandContext }

export type VersionOrigin = 'platform' | 'local'

// ── Locks ────────────────────────────────────────────────────────────────────────────────────────────────────

const lockQuote = (client: QuoterDbClient, quoteId: string) =>
  runQuoterQuery(client, `SELECT greenhouse_commercial.quoter_lock_quote($1::text)`, [quoteId])

// One calculation is registered by one transaction at a time. Always taken BEFORE the lock of a quote, so two
// writers of the same calculation over different quotes cannot wait on each other. Two keys: a space of its own.
const lockCalculation = (client: QuoterDbClient, replayDigest: string) =>
  runQuoterQuery(
    client,
    `SELECT pg_advisory_xact_lock(hashtext('greenhouse_commercial.quoter_replay'), hashtext($1::text))`,
    [replayDigest]
  )

// ── The current view of a quote ──────────────────────────────────────────────────────────────────────────────

export type QuoteCurrent = {
  quoteId: string
  ownerOrganizationId: string
  dataOrigin: QuoterDataOrigin
  createdAt: string
  /** `null` only inside the transaction that is creating the quote. */
  state: QuoterQuoteState | null
  /**
   * The state a reader shows: the stored one, or `expired` when the quote is issued or under revision and the
   * validity of its last issue has passed. The database derives it; nothing here applies that rule again.
   */
  effectiveState: QuoterEffectiveState | null
  /** Assigned by the database at the first issue. A draft has none. */
  quoteNumber: string | null
  clientOrganizationId: string | null
  latestVersionNumber: number | null
  latestBelowFloor: boolean | null
  /** What the client holds: the version, the artifact and the document of the last issue. */
  issuedVersionNumber: number | null
  issuedArtifactDigest: string | null
  issuedDocumentSeq: number | null
  issuedDocumentDigest: string | null
  issuedAt: string | null
  /** Until which day what was issued holds, as `YYYY-MM-DD`. Fixed by each issue. */
  validUntil: string | null
}

type CurrentRow = {
  [column: string]: unknown
  quote_id: string
  owner_organization_id: string
  data_origin: QuoterDataOrigin
  created_at: Date
  state: string | null
  effective_state: string | null
  quote_number: string | null
  client_organization_id: string | null
  latest_version_number: number | null
  latest_below_floor: boolean | null
  issued_version_number: number | null
  issued_artifact_digest: string | null
  issued_document_seq: number | null
  issued_document_digest: string | null
  issued_at: Date | null
  valid_until: string | null
}

export const readQuoteCurrent = async (client: QuoterDbClient | undefined, quoteId: string): Promise<QuoteCurrent | null> => {
  const rows = await runQuoterQuery<CurrentRow>(
    client,
    `SELECT quote_id, owner_organization_id, data_origin, created_at, state, effective_state, quote_number,
            client_organization_id, latest_version_number, latest_below_floor, issued_version_number,
            issued_artifact_digest, issued_document_seq, issued_document_digest, issued_at,
            valid_until::text AS valid_until
       FROM greenhouse_commercial.quoter_quote_current
      WHERE quote_id = $1`,
    [quoteId]
  )

  const row = rows[0]

  if (!row) return null

  return {
    quoteId: row.quote_id,
    ownerOrganizationId: row.owner_organization_id,
    dataOrigin: row.data_origin,
    createdAt: toIso(row.created_at),
    state: isQuoterQuoteState(row.state) ? row.state : null,
    effectiveState: row.effective_state === QUOTER_EXPIRED || isQuoterQuoteState(row.effective_state) ? row.effective_state : null,
    quoteNumber: row.quote_number,
    clientOrganizationId: row.client_organization_id,
    latestVersionNumber: row.latest_version_number,
    latestBelowFloor: row.latest_below_floor,
    issuedVersionNumber: row.issued_version_number,
    issuedArtifactDigest: row.issued_artifact_digest,
    issuedDocumentSeq: row.issued_document_seq,
    issuedDocumentDigest: row.issued_document_digest,
    issuedAt: row.issued_at ? toIso(row.issued_at) : null,
    validUntil: row.valid_until
  }
}

const requireQuote = async (client: QuoterDbClient, quoteId: string): Promise<QuoteCurrent> => {
  const current = await readQuoteCurrent(client, quoteId)

  if (!current) throw new QuoterError('quote_not_found', { quoteId })

  return current
}

// ── Versions ─────────────────────────────────────────────────────────────────────────────────────────────────

export type StoredQuoteVersion = {
  quoteId: string
  versionNumber: number
  /** The artifact exactly as it was stored. */
  text: string
  /** What that text parses to. The only source of what the quote says. */
  value: unknown
  artifactDigest: string
  replayDigest: string
  calculationId: string
  /** The verdict of the engine, frozen with the version: the rule of the issue reads it. */
  belowFloor: boolean
  origin: VersionOrigin
  registeredAt: string
  /** Read from the artifact itself, never from the index table next to it. */
  index: ArtifactIndex
}

type VersionRow = {
  [column: string]: unknown
  quote_id: string
  version_number: number
  artifact_text: string
  artifact_digest: string
  replay_digest: string
  calculation_id: string
  below_floor: boolean
  origin: VersionOrigin
  registered_at: Date
}

const VERSION_COLUMNS = `quote_id, version_number, artifact_text, artifact_digest, replay_digest, calculation_id, below_floor,
  origin, registered_at`

// Both digests are recomputed on every read. What the version says is read from its text: an index that disagreed
// with the artifact would be a wrong index, never a different quote.
const verifiedVersion = (row: VersionRow): StoredQuoteVersion => {
  const mismatch = () =>
    new QuoterError('stored_digest_mismatch', { object: 'quote_version', quoteId: row.quote_id, versionNumber: row.version_number })

  if (textDigest(row.artifact_text) !== row.artifact_digest) throw mismatch()

  let value: unknown
  let index: ArtifactIndex

  try {
    value = JSON.parse(row.artifact_text)
    index = readArtifactIndex(value)
  } catch {
    throw mismatch()
  }

  if (index.replayDigest !== row.replay_digest || index.calculationId !== row.calculation_id) throw mismatch()

  return {
    quoteId: row.quote_id,
    versionNumber: row.version_number,
    text: row.artifact_text,
    value,
    artifactDigest: row.artifact_digest,
    replayDigest: row.replay_digest,
    calculationId: row.calculation_id,
    belowFloor: row.below_floor,
    origin: row.origin,
    registeredAt: toIso(row.registered_at),
    index
  }
}

export const readQuoteVersion = async (
  client: QuoterDbClient | undefined,
  ref: { quoteId: string; versionNumber: number }
): Promise<StoredQuoteVersion | null> => {
  const rows = await runQuoterQuery<VersionRow>(
    client,
    `SELECT ${VERSION_COLUMNS}
       FROM greenhouse_commercial.quoter_quote_versions
      WHERE quote_id = $1 AND version_number = $2::int`,
    [ref.quoteId, ref.versionNumber]
  )

  return rows[0] ? verifiedVersion(rows[0]) : null
}

/**
 * The version that holds a calculation: the one of a quote that is not withdrawn when there is one (at most one,
 * by the rule this file enforces), otherwise the most recently registered. Narrowed to one quote when given.
 */
export const findVersionByReplayDigest = async (
  client: QuoterDbClient | undefined,
  ref: { replayDigest: string; quoteId?: string }
): Promise<StoredQuoteVersion | null> => {
  const rows = await runQuoterQuery<VersionRow>(
    client,
    `SELECT ${VERSION_COLUMNS}
       FROM greenhouse_commercial.quoter_quote_versions v
      WHERE v.replay_digest = $1
        AND ($2::text IS NULL OR v.quote_id = $2::text)
      ORDER BY (COALESCE(greenhouse_commercial.quoter_quote_state(v.quote_id), 'none') <> 'withdrawn') DESC,
               v.registered_at DESC,
               v.quote_id COLLATE "C" DESC
      LIMIT 1`,
    [ref.replayDigest, ref.quoteId ?? null]
  )

  return rows[0] ? verifiedVersion(rows[0]) : null
}

/** Every version held, by its address: identity and lane only, never the text. */
export const listQuoteVersionRefs = async (client: QuoterDbClient | undefined) => {
  const rows = await runQuoterQuery<{ quote_id: string; version_number: number; artifact_version: string; replay_digest: string }>(
    client,
    `SELECT quote_id, version_number, artifact_version, replay_digest
       FROM greenhouse_commercial.quoter_quote_versions
      ORDER BY quote_id COLLATE "C", version_number`
  )

  return rows.map(row => ({
    quoteId: row.quote_id,
    versionNumber: row.version_number,
    artifactVersion: row.artifact_version,
    replayDigest: row.replay_digest
  }))
}

type PreparedArtifact = { text: string; index: ArtifactIndex; verdict: FrozenArtifactVerdict }

// What may become a version: an artifact the engine still reproduces from the inputs it carries, and that
// calculated. One that does not reproduce is not this quote; one that did not calculate is not a quote.
//
// Whether it calculated and whether it is below the floor are the engine's to say, and it says them about the
// RECOMPUTED result (`replayFrozenArtifact`), never about the text received: the floor verdict stored with a version
// decides whether issuing it needs the approval of a person.
const prepareArtifact = (artifactText: string): PreparedArtifact => {
  const { value } = parseStoredText(artifactText)

  // Throws REPLAY_MISMATCH, a rejection of the engine, which passes through with its own code.
  const verdict = replayFrozenArtifact(value)

  if (verdict.calculationStatus !== 'calculated')
    throw new QuoterError('quote_not_calculated', { calculationStatus: verdict.calculationStatus })

  return { text: artifactText, index: readArtifactIndex(value), verdict }
}

// One calculation lives in one quote that is not withdrawn. Enforced here, under `lockCalculation`, and not by a
// constraint: a global one would leave no way out for whoever withdraws a draft and registers the calculation again.
const assertNotRegistered = async (client: QuoterDbClient, replayDigest: string) => {
  const rows = await runQuoterQuery<{ quote_id: string; version_number: number }>(
    client,
    `SELECT v.quote_id, v.version_number
       FROM greenhouse_commercial.quoter_quote_versions v
      WHERE v.replay_digest = $1
        AND COALESCE(greenhouse_commercial.quoter_quote_state(v.quote_id), 'none') <> 'withdrawn'
      ORDER BY v.registered_at DESC, v.quote_id COLLATE "C" DESC
      LIMIT 1`,
    [replayDigest]
  )

  if (rows[0])
    throw new QuoterError('artifact_already_registered', { quoteId: rows[0].quote_id, versionNumber: rows[0].version_number })
}

// The read indexes of a version. Written with the version and rewritable afterwards: the only rows of the aggregate
// that are ever updated. A wrong index here costs a wrong filter in a list; it never changes what a quote says.
const writeVersionIndex = (client: QuoterDbClient, ref: { quoteId: string; versionNumber: number }, index: ArtifactIndex) =>
  runQuoterQuery(
    client,
    `INSERT INTO greenhouse_commercial.quoter_quote_version_index
       (quote_id, version_number, contract_version, engine_version, currency, catalog_version, catalog_digest,
        policy_version, policy_digest, credits_version, credits_digest)
     VALUES ($1, $2::int, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (quote_id, version_number) DO UPDATE
       SET contract_version = EXCLUDED.contract_version,
           engine_version = EXCLUDED.engine_version,
           currency = EXCLUDED.currency,
           catalog_version = EXCLUDED.catalog_version,
           catalog_digest = EXCLUDED.catalog_digest,
           policy_version = EXCLUDED.policy_version,
           policy_digest = EXCLUDED.policy_digest,
           credits_version = EXCLUDED.credits_version,
           credits_digest = EXCLUDED.credits_digest,
           indexed_at = now()`,
    [
      ref.quoteId,
      ref.versionNumber,
      highest(index.contractVersions),
      highest(index.engineVersions),
      index.currency,
      index.sources.catalog?.version ?? null,
      index.sources.catalog?.digest ?? null,
      index.sources.policy?.version ?? null,
      index.sources.policy?.digest ?? null,
      index.sources.credits?.version ?? null,
      index.sources.credits?.digest ?? null
    ]
  )

/** Rebuilds the read indexes of a version from its stored text. `version_not_found` when there is no such version. */
export const rebuildVersionIndex = async (client: QuoterDbClient, ref: { quoteId: string; versionNumber: number }) => {
  const version = await readQuoteVersion(client, ref)

  if (!version) throw new QuoterError('version_not_found', { ...ref })

  await writeVersionIndex(client, ref, version.index)

  return version.index
}

const insertVersion = async (
  client: QuoterDbClient,
  input: {
    quoteId: string
    ownerOrganizationId: string
    versionNumber: number
    prepared: PreparedArtifact
    origin: VersionOrigin
    context: QuoteWriteContext
  }
): Promise<StoredQuoteVersion> => {
  const { index, text, verdict } = input.prepared
  const ref = { quoteId: input.quoteId, versionNumber: input.versionNumber }

  const rows = await withQuoterRejections(
    () =>
      runQuoterQuery<VersionRow>(
        client,
        `INSERT INTO greenhouse_commercial.quoter_quote_versions
           (quote_id, version_number, owner_organization_id, artifact_text, artifact_digest, replay_digest,
            calculation_id, artifact_version, calculation_status, below_floor, origin, registered_by_actor_kind,
            registered_by_member_id, registered_by_principal_id, command_execution_id, request_hash)
         VALUES ($1, $2::int, $3, $4, $5, $6, $7, $8, 'calculated', $9::boolean, $10, $11, $12, $13, $14, $15)
         RETURNING ${VERSION_COLUMNS}`,
        [
          input.quoteId,
          input.versionNumber,
          input.ownerOrganizationId,
          text,
          textDigest(text),
          verdict.replayDigest,
          verdict.calculationId,
          verdict.artifactVersion,
          verdict.belowFloor,
          input.origin,
          input.context.actor.kind,
          memberIdOf(input.context.actor),
          input.context.actor.principalId,
          input.context.command.commandExecutionId,
          input.context.command.requestHash ?? null
        ]
      ),
    ref
  )

  await writeVersionIndex(client, ref, index)

  return verifiedVersion(rows[0])
}

// ── Documents of a version ───────────────────────────────────────────────────────────────────────────────────

export type StoredVersionDocument = {
  documentSeq: number
  brief: unknown
  document: unknown
  briefDigest: string
  documentDigest: string
  templateDataVersion: string
  storedAt: string
}

/**
 * The document of a version: the one in force (its last row) or, with `documentSeq`, that exact one, which is how
 * what was issued is read back after a correction. Both texts are verified against their digests.
 */
export const readVersionDocument = async (
  client: QuoterDbClient | undefined,
  ref: { quoteId: string; versionNumber: number; documentSeq?: number }
): Promise<StoredVersionDocument | null> => {
  const rows = await runQuoterQuery<{
    document_seq: number
    brief_text: string
    brief_digest: string
    document_text: string
    document_digest: string
    template_data_version: string
    stored_at: Date
  }>(
    client,
    `SELECT document_seq, brief_text, brief_digest, document_text, document_digest, template_data_version, stored_at
       FROM greenhouse_commercial.quoter_version_documents
      WHERE quote_id = $1 AND version_number = $2::int
        AND ($3::int IS NULL OR document_seq = $3::int)
      ORDER BY document_seq DESC
      LIMIT 1`,
    [ref.quoteId, ref.versionNumber, ref.documentSeq ?? null]
  )

  const row = rows[0]

  if (!row) return null

  if (textDigest(row.brief_text) !== row.brief_digest || textDigest(row.document_text) !== row.document_digest)
    throw new QuoterError('stored_digest_mismatch', { object: 'version_document', quoteId: ref.quoteId, versionNumber: ref.versionNumber })

  return {
    documentSeq: row.document_seq,
    brief: JSON.parse(row.brief_text) as unknown,
    document: JSON.parse(row.document_text) as unknown,
    briefDigest: row.brief_digest,
    documentDigest: row.document_digest,
    templateDataVersion: row.template_data_version,
    storedAt: toIso(row.stored_at)
  }
}

// ── Exception approvals ──────────────────────────────────────────────────────────────────────────────────────

export type ExceptionDecision = 'approved' | 'revoked'

export type StoredExceptionDecision = {
  approvalSeq: number
  decision: ExceptionDecision
  artifactDigest: string
  decidedByMemberId: string
  decidedAt: string
}

/** The decision in force over the exception of a version (its last one), or `null` when nobody ever decided. */
export const readExceptionApproval = async (
  client: QuoterDbClient | undefined,
  ref: { quoteId: string; versionNumber: number }
): Promise<StoredExceptionDecision | null> => {
  const rows = await runQuoterQuery<{
    approval_seq: number
    decision: ExceptionDecision
    artifact_digest: string
    decided_by_member_id: string
    decided_at: Date
  }>(
    client,
    `SELECT approval_seq, decision, artifact_digest, decided_by_member_id, decided_at
       FROM greenhouse_commercial.quoter_exception_approvals
      WHERE quote_id = $1 AND version_number = $2::int
      ORDER BY approval_seq DESC
      LIMIT 1`,
    [ref.quoteId, ref.versionNumber]
  )

  const row = rows[0]

  return row
    ? {
        approvalSeq: row.approval_seq,
        decision: row.decision,
        artifactDigest: row.artifact_digest,
        decidedByMemberId: row.decided_by_member_id,
        decidedAt: toIso(row.decided_at)
      }
    : null
}

// ── State changes ────────────────────────────────────────────────────────────────────────────────────────────

/** What a change of state names: the version and the document of an issue, each with its digest. */
type NamedObject = { versionNumber: number; artifactDigest: string; documentSeq: number; documentDigest: string }

const insertTransition = async (
  client: QuoterDbClient,
  input: {
    quoteId: string
    ownerOrganizationId: string
    from: QuoterTransitionOrigin
    to: QuoterQuoteState
    /** What is issued, or what the client answers about. Absent in every other change. */
    object?: NamedObject
    /** `YYYY-MM-DD`. Present exactly when `to` is `issued`. */
    validUntil?: string
    reason: string
    context: QuoteWriteContext
  }
) => {
  // `transition_seq` and `occurred_at` are assigned by the trigger, under the lock of the quote.
  const rows = await withQuoterRejections(
    () =>
      runQuoterQuery<{ transition_id: string; transition_seq: number; occurred_at: Date }>(
        client,
        `INSERT INTO greenhouse_commercial.quoter_state_transitions
           (quote_id, transition_seq, owner_organization_id, from_state, to_state, version_number, artifact_digest,
            document_seq, document_digest, valid_until, actor_kind, actor_member_id, actor_principal_id, reason,
            command_execution_id, request_hash)
         VALUES ($1, 0, $2, $3, $4, $5::int, $6, $7::int, $8, $9::date, $10, $11, $12, $13, $14, $15)
         RETURNING transition_id, transition_seq, occurred_at`,
        [
          input.quoteId,
          input.ownerOrganizationId,
          input.from,
          input.to,
          input.object?.versionNumber ?? null,
          input.object?.artifactDigest ?? null,
          input.object?.documentSeq ?? null,
          input.object?.documentDigest ?? null,
          input.validUntil ?? null,
          input.context.actor.kind,
          memberIdOf(input.context.actor),
          input.context.actor.principalId,
          input.reason,
          input.context.command.commandExecutionId,
          input.context.command.requestHash ?? null
        ]
      ),
    { quoteId: input.quoteId, from: input.from, to: input.to }
  )

  return {
    transitionId: rows[0].transition_id,
    transitionSeq: rows[0].transition_seq,
    from: input.from,
    to: input.to,
    occurredAt: toIso(rows[0].occurred_at)
  }
}

const insertRecipient = async (
  client: QuoterDbClient,
  input: { quoteId: string; ownerOrganizationId: string; clientOrganizationId: string; reason: string; context: QuoteWriteContext }
) => {
  if (input.clientOrganizationId === input.ownerOrganizationId)
    throw new QuoterError('recipient_organization_invalid', { reason: 'recipient_is_the_owner' })

  const rows = await withQuoterRejections(
    () =>
      runQuoterQuery<{ assignment_seq: number }>(
        client,
        `INSERT INTO greenhouse_commercial.quoter_quote_recipients
           (quote_id, assignment_seq, owner_organization_id, client_organization_id, assigned_by_actor_kind,
            assigned_by_member_id, assigned_by_principal_id, reason, command_execution_id, request_hash)
         VALUES ($1, 0, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING assignment_seq`,
        [
          input.quoteId,
          input.ownerOrganizationId,
          input.clientOrganizationId,
          input.context.actor.kind,
          memberIdOf(input.context.actor),
          input.context.actor.principalId,
          input.reason,
          input.context.command.commandExecutionId,
          input.context.command.requestHash ?? null
        ]
      ),
    { quoteId: input.quoteId }
  )

  return { assignmentSeq: rows[0].assignment_seq, clientOrganizationId: input.clientOrganizationId }
}

// ── Commands of the store ────────────────────────────────────────────────────────────────────────────────────

export type CreateQuoteInput = QuoteWriteContext & {
  /** The canonical organization of Efeonce, already resolved by the server. Never a value of the caller. */
  ownerOrganizationId: string
  /**
   * Decided by the identity that creates, never by a field of the request: a test quote born `real` would consume
   * a real number. There is no default, here or in the database.
   */
  dataOrigin: QuoterDataOrigin
  /** The frozen artifact, as text, exactly as it is to be stored. */
  artifactText: string
  origin: VersionOrigin
  /** Optional in a draft; required before it is issued. */
  clientOrganizationId?: string
  reason?: string
}

/**
 * Creates a quote with its version 1 and its first state (`none → draft`), and its recipient when given. All of it
 * in the transaction of `client`. A draft takes no number.
 */
export const createQuote = async (client: QuoterDbClient, input: CreateQuoteInput) => {
  const prepared = prepareArtifact(input.artifactText)
  const context: QuoteWriteContext = { actor: input.actor, command: input.command }

  await lockCalculation(client, prepared.verdict.replayDigest)
  await assertNotRegistered(client, prepared.verdict.replayDigest)

  const created = await withQuoterRejections(() =>
    runQuoterQuery<{ quote_id: string }>(
      client,
      `INSERT INTO greenhouse_commercial.quoter_quotes
         (owner_organization_id, data_origin, created_by_actor_kind, created_by_member_id, created_by_principal_id,
          command_execution_id, request_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING quote_id`,
      [
        input.ownerOrganizationId,
        input.dataOrigin,
        input.actor.kind,
        memberIdOf(input.actor),
        input.actor.principalId,
        input.command.commandExecutionId,
        input.command.requestHash ?? null
      ]
    )
  )

  const quoteId = created[0].quote_id
  const base = { quoteId, ownerOrganizationId: input.ownerOrganizationId, context }
  const version = await insertVersion(client, { ...base, versionNumber: 1, prepared, origin: input.origin })

  await insertTransition(client, {
    ...base,
    from: QUOTER_INITIAL_ORIGIN,
    to: 'draft',
    reason: input.reason ?? 'Cotización creada con su versión 1.'
  })

  if (input.clientOrganizationId)
    await insertRecipient(client, {
      ...base,
      clientOrganizationId: input.clientOrganizationId,
      reason: input.reason ?? 'Destinataria declarada al crear la cotización.'
    })

  return { quoteId, version }
}

export type AddQuoteVersionInput = QuoteWriteContext & {
  quoteId: string
  artifactText: string
  origin: VersionOrigin
  /** The last version the caller knows. When given and the quote moved on, `version_conflict`. */
  expectedVersion?: number
  reason?: string
}

/**
 * Adds version N+1, which replaces N. No earlier row changes. Over a quote the client already has (issued, accepted
 * or rejected) it records the change to `revising` FIRST and then the version: such a quote takes no version, and
 * what was issued stays what the client holds until the new version is issued.
 */
export const addQuoteVersion = async (client: QuoterDbClient, input: AddQuoteVersionInput) => {
  const prepared = prepareArtifact(input.artifactText)
  const context: QuoteWriteContext = { actor: input.actor, command: input.command }

  await lockCalculation(client, prepared.verdict.replayDigest)
  await lockQuote(client, input.quoteId)

  const current = await requireQuote(client, input.quoteId)

  if (current.state === 'withdrawn') throw new QuoterError('version_locked', { quoteId: input.quoteId, state: current.state })

  const latest = current.latestVersionNumber ?? 0

  if (input.expectedVersion !== undefined && input.expectedVersion !== latest)
    throw new QuoterError('version_conflict', { latestVersionNumber: latest })

  await assertNotRegistered(client, prepared.verdict.replayDigest)

  const base = { quoteId: input.quoteId, ownerOrganizationId: current.ownerOrganizationId, context }

  // A quote the client already has (issued, accepted or rejected) takes no version: a revision is opened first.
  if (current.state === 'issued' || current.state === 'accepted' || current.state === 'rejected')
    await insertTransition(client, {
      ...base,
      from: current.state,
      to: 'revising',
      reason: input.reason ?? 'Versión nueva sobre una cotización emitida.'
    })

  const version = await insertVersion(client, { ...base, versionNumber: latest + 1, prepared, origin: input.origin })

  return { quoteId: input.quoteId, version }
}

export type RecordStateTransitionInput = QuoteWriteContext & {
  quoteId: string
  to: QuoterQuoteState
  /**
   * With `issued`, required: the version being issued. It is the last one or, to go back to what the client already
   * held, the last one issued. With `accepted` or `rejected`, optional: the version the caller believes the client
   * answered; when it is not the last one issued, `not_last_issued_version`.
   */
  versionNumber?: number
  /** With `issued`, required: until which day what is issued holds, as `YYYY-MM-DD`. Not before today. */
  validUntil?: string
  /** When given with `issued`: the recipient the caller saw. A different one in force is `recipient_conflict`. */
  expectedClientOrganizationId?: string
  /** When given with `issued`: the document the caller saw. A different one in force is `document_conflict`. */
  expectedDocumentDigest?: string
  reason: string
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Records a state change from the state in force. `invalid_transition` when the pair is not in the matrix.
 *
 * Issuing pins what is issued: the version with its digest and the document in force with its digest, and until
 * which day it holds. It needs a recipient, a document and, when the version is below the floor, an approval in
 * force. Accepting and rejecting name the last thing issued, and an expired quote is not accepted: it is issued
 * again with a new validity (and keeps its number). Every one of those rules is also a rule of the database: whoever
 * reached the table by another way would be refused the same.
 *
 * The public number is assigned by the database when a quote is issued for the first time; it comes back here.
 */
export const recordStateTransition = async (client: QuoterDbClient, input: RecordStateTransitionInput) => {
  await lockQuote(client, input.quoteId)

  const current = await requireQuote(client, input.quoteId)
  const from: QuoterTransitionOrigin = current.state ?? QUOTER_INITIAL_ORIGIN
  const transition = findQuoterTransition(from, input.to)

  if (!transition) throw new QuoterError('invalid_transition', { from, to: input.to })
  if (transition.humanGate && input.actor.kind !== 'member') throw new QuoterError('human_actor_required', { from, to: input.to })

  let object: NamedObject | undefined
  let validUntil: string | undefined

  if (input.to === 'issued') {
    const ref = { quoteId: input.quoteId, versionNumber: input.versionNumber ?? -1 }

    if (ref.versionNumber !== current.latestVersionNumber && ref.versionNumber !== current.issuedVersionNumber)
      throw new QuoterError('version_not_issuable', {
        latestVersionNumber: current.latestVersionNumber,
        issuedVersionNumber: current.issuedVersionNumber
      })

    if (!current.clientOrganizationId) throw new QuoterError('recipient_required', { quoteId: input.quoteId })

    if (input.expectedClientOrganizationId !== undefined && input.expectedClientOrganizationId !== current.clientOrganizationId)
      throw new QuoterError('recipient_conflict', { quoteId: input.quoteId })

    const version = await readQuoteVersion(client, ref)

    if (!version) throw new QuoterError('version_not_found', ref)

    const document = await readVersionDocument(client, ref)

    if (!document) throw new QuoterError('document_required', ref)

    if (input.expectedDocumentDigest !== undefined && input.expectedDocumentDigest !== document.documentDigest)
      throw new QuoterError('document_conflict', { ...ref, documentSeq: document.documentSeq })

    if (version.belowFloor && (await readExceptionApproval(client, ref))?.decision !== 'approved')
      throw new QuoterError('exception_approval_required', ref)

    // Whether the day already passed is for the database to say: it is the one that knows what day it is.
    if (!input.validUntil || !ISO_DAY.test(input.validUntil)) throw new QuoterError('validity_required', ref)

    validUntil = input.validUntil
    object = {
      versionNumber: version.versionNumber,
      artifactDigest: version.artifactDigest,
      documentSeq: document.documentSeq,
      documentDigest: document.documentDigest
    }
  } else if (input.to === 'accepted' || input.to === 'rejected') {
    // The matrix only lets a quote that was issued get here, so the last issue exists.
    if (
      current.issuedVersionNumber === null ||
      current.issuedArtifactDigest === null ||
      current.issuedDocumentSeq === null ||
      current.issuedDocumentDigest === null
    )
      throw new QuoterError('invalid_transition', { from, to: input.to })

    if (input.versionNumber !== undefined && input.versionNumber !== current.issuedVersionNumber)
      throw new QuoterError('not_last_issued_version', { quoteId: input.quoteId, issuedVersionNumber: current.issuedVersionNumber })

    // `effectiveState` is the database's reading of the validity date: the rule is not applied again here.
    if (input.to === 'accepted' && current.effectiveState === QUOTER_EXPIRED)
      throw new QuoterError('quote_expired', { quoteId: input.quoteId, validUntil: current.validUntil })

    object = {
      versionNumber: current.issuedVersionNumber,
      artifactDigest: current.issuedArtifactDigest,
      documentSeq: current.issuedDocumentSeq,
      documentDigest: current.issuedDocumentDigest
    }
  }

  const recorded = await insertTransition(client, {
    quoteId: input.quoteId,
    ownerOrganizationId: current.ownerOrganizationId,
    from,
    to: input.to,
    object,
    validUntil,
    reason: input.reason,
    context: { actor: input.actor, command: input.command }
  })

  const after = input.to === 'issued' ? await requireQuote(client, input.quoteId) : current

  return { ...recorded, object: object ?? null, quoteNumber: after.quoteNumber, validUntil: after.validUntil }
}

export type AssignRecipientInput = QuoteWriteContext & { quoteId: string; clientOrganizationId: string; reason: string }

/**
 * Assigns the recipient organization, or reassigns it: the last assignment is the one in force. Only while the
 * quote is a draft; from its first issue the recipient is frozen (`recipient_locked`). That the organization is a
 * client or a prospect is validated by the command; here, that it exists and is not the owner.
 */
export const assignRecipient = async (client: QuoterDbClient, input: AssignRecipientInput) => {
  await lockQuote(client, input.quoteId)

  const current = await requireQuote(client, input.quoteId)

  if (current.state !== 'draft') throw new QuoterError('recipient_locked', { state: current.state })

  return insertRecipient(client, {
    quoteId: input.quoteId,
    ownerOrganizationId: current.ownerOrganizationId,
    clientOrganizationId: input.clientOrganizationId,
    reason: input.reason,
    context: { actor: input.actor, command: input.command }
  })
}

const versionWasIssued = async (client: QuoterDbClient, ref: { quoteId: string; versionNumber: number }) => {
  const rows = await runQuoterQuery<{ issued: boolean }>(
    client,
    `SELECT EXISTS (
       SELECT 1 FROM greenhouse_commercial.quoter_state_transitions t
        WHERE t.quote_id = $1 AND t.to_state = 'issued' AND t.version_number = $2::int
     ) AS issued`,
    [ref.quoteId, ref.versionNumber]
  )

  return rows[0].issued
}

export type DecideExceptionInput = QuoteWriteContext & {
  quoteId: string
  versionNumber: number
  decision: ExceptionDecision
  reason: string
}

/**
 * Records the approval of an exception below the floor, or its revocation, for one version and its digest. It is
 * not a state: it is an act the issue checks, and the last decision is the one in force. Only an identified person
 * decides; only a version the engine flagged below the floor takes a decision; a new version does not inherit one.
 * An approval is revoked only while its version was never issued (`exception_revocation_locked` afterwards).
 */
export const decideException = async (client: QuoterDbClient, input: DecideExceptionInput) => {
  if (input.actor.kind !== 'member') throw new QuoterError('human_actor_required', { act: 'decide_exception' })

  const decidedBy = input.actor
  const ref = { quoteId: input.quoteId, versionNumber: input.versionNumber }

  await lockQuote(client, input.quoteId)

  const current = await requireQuote(client, input.quoteId)
  const version = await readQuoteVersion(client, ref)

  if (!version) throw new QuoterError('version_not_found', ref)
  if (!version.belowFloor) throw new QuoterError('exception_not_applicable', ref)

  const inForce = (await readExceptionApproval(client, ref))?.decision ?? 'revoked'

  if (inForce === input.decision) throw new QuoterError('exception_decision_unchanged', { ...ref, decision: input.decision })

  // Once a version was issued, revoking its approval would be a record that means nothing: the act is to withdraw.
  if (input.decision === 'revoked' && (await versionWasIssued(client, ref)))
    throw new QuoterError('exception_revocation_locked', ref)

  // `approval_seq` is assigned by the trigger, under the lock of the quote.
  const rows = await withQuoterRejections(
    () =>
      runQuoterQuery<{ approval_seq: number }>(
        client,
        `INSERT INTO greenhouse_commercial.quoter_exception_approvals
           (quote_id, version_number, approval_seq, owner_organization_id, artifact_digest, decision,
            decided_by_member_id, decided_by_principal_id, reason, command_execution_id, request_hash)
         VALUES ($1, $2::int, 0, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING approval_seq`,
        [
          input.quoteId,
          input.versionNumber,
          current.ownerOrganizationId,
          version.artifactDigest,
          input.decision,
          decidedBy.memberId,
          decidedBy.principalId,
          input.reason,
          input.command.commandExecutionId,
          input.command.requestHash ?? null
        ]
      ),
    ref
  )

  return { ...ref, approvalSeq: rows[0].approval_seq, decision: input.decision, artifactDigest: version.artifactDigest }
}

export type StoreVersionDocumentInput = QuoteWriteContext & {
  quoteId: string
  versionNumber: number
  /** What was written for the document: texts and references. */
  brief: unknown
  /** The data of the document that `compose document` produced over the stored artifact. */
  document: unknown
  templateDataVersion: string
}

/**
 * Stores the data of the client document of a version. Correcting the texts is storing again: the last row is the
 * one in force. A document is written while the quote is a draft or under revision; over an issued or withdrawn
 * quote it is `document_locked`. What was issued never changes: the issue named its document and its digest. To
 * correct the document of an issued quote, it goes back to `revising`, the document is stored, and it is issued again.
 */
export const storeVersionDocument = async (client: QuoterDbClient, input: StoreVersionDocumentInput) => {
  const brief = canonicalJson(input.brief)
  const document = canonicalJson(input.document)
  const ref = { quoteId: input.quoteId, versionNumber: input.versionNumber }

  await lockQuote(client, input.quoteId)

  const current = await requireQuote(client, input.quoteId)

  if (current.state !== 'draft' && current.state !== 'revising')
    throw new QuoterError('document_locked', { ...ref, state: current.state })

  // `document_seq` is assigned by the trigger, under the lock of the quote.
  const rows = await withQuoterRejections(
    () =>
      runQuoterQuery<{ document_seq: number }>(
        client,
        `INSERT INTO greenhouse_commercial.quoter_version_documents
           (quote_id, version_number, document_seq, owner_organization_id, brief_text, brief_digest, document_text,
            document_digest, template_data_version, stored_by_actor_kind, stored_by_member_id,
            stored_by_principal_id, command_execution_id, request_hash)
         VALUES ($1, $2::int, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING document_seq`,
        [
          input.quoteId,
          input.versionNumber,
          current.ownerOrganizationId,
          brief.text,
          brief.digest,
          document.text,
          document.digest,
          input.templateDataVersion,
          input.actor.kind,
          memberIdOf(input.actor),
          input.actor.principalId,
          input.command.commandExecutionId,
          input.command.requestHash ?? null
        ]
      ),
    ref
  )

  return { documentSeq: rows[0].document_seq, briefDigest: brief.digest, documentDigest: document.digest }
}
