import 'server-only'

import type { CurrentSourceRole } from '@/lib/finance/pricing-v3/adapters/current-versions'

import { identifySourceDocument, textDigest } from './canonical-text'
import { runQuoterQuery, toIso } from './db'
import { QuoterError, withQuoterRejections } from './errors'
import { publishQuoterSourceDocumentStored } from './events'
import { memberIdOf } from './types'
import type { QuoterDbClient } from './db'
import type { QuoterActor, QuoterCommandContext } from './types'

/**
 * Catalog, resource policy and credit catalog, stored by role, version and digest (TASK-2025).
 *
 * A document is stored as the text that was received, never re-serialized: a quote calculated with it carries it
 * inside, and only the same bytes give on the platform the artifact the CLI gives from the file. Two digests: the
 * one of the text, which the database checks, and the one of identity, which its contract defines and a pointer
 * names. Storing never activates: only `pointer-store.ts` adds to the pointer history.
 *
 * Nothing is ever replaced. A second document under a role and version already held is `source_document_exists`,
 * whether its content is the same or not; whoever needs an idempotent write asks first with `findSourceDocument`.
 */
export type SourceDocumentOrigin = 'repo_import' | 'artifact_embedded' | 'platform_apply'

export type StoredSourceDocument = {
  role: CurrentSourceRole
  version: string
  /** The digest of identity: the one a pointer names this document with. */
  digest: string
  /** The document, exactly as it was received and stored. */
  text: string
  schemaVersion: string | null
  parentDigest: string | null
  origin: SourceDocumentOrigin
  sourcePath: string | null
  /** The commit of the repository the file was read at. `null` only for a document applied on the platform. */
  sourceCommitSha: string | null
  storedAt: string
}

type Row = {
  [column: string]: unknown
  role: CurrentSourceRole
  version: string
  document_digest: string
  document_text: string
  document_text_digest: string
  schema_version: string | null
  parent_digest: string | null
  origin: SourceDocumentOrigin
  source_path: string | null
  source_commit_sha: string | null
  stored_at: Date
}

const COLUMNS = `role, version, document_digest, document_text, document_text_digest, schema_version, parent_digest, origin, source_path,
  source_commit_sha, stored_at`

// What is read is believed only after the sha256 of its text is recomputed: a row whose text no longer gives its
// digest is a corrupt registry, never a document to hand over. The text is NOT run through the validator of its
// role again: that validator is today's, and a document stored under an older contract must stay readable for as
// long as an artifact names it. Identity is matched by the columns (role, version, digest), which were derived from
// the validated value when the row was written.
const verified = (row: Row): StoredSourceDocument => {
  if (textDigest(row.document_text) !== row.document_text_digest)
    throw new QuoterError('stored_digest_mismatch', { object: 'source_document', role: row.role, version: row.version })

  return {
    role: row.role,
    version: row.version,
    digest: row.document_digest,
    text: row.document_text,
    schemaVersion: row.schema_version,
    parentDigest: row.parent_digest,
    origin: row.origin,
    sourcePath: row.source_path,
    sourceCommitSha: row.source_commit_sha,
    storedAt: toIso(row.stored_at)
  }
}

/**
 * The document held under a role and a version, a digest, or both, or `null`. With both, the row must carry both:
 * a version held under another digest is not the document asked for.
 */
export const findSourceDocument = async (
  client: QuoterDbClient | undefined,
  ref: { role: CurrentSourceRole; version?: string; digest?: string }
): Promise<StoredSourceDocument | null> => {
  if (ref.version === undefined && ref.digest === undefined) return null

  const rows = await runQuoterQuery<Row>(
    client,
    `SELECT ${COLUMNS}
       FROM greenhouse_commercial.quoter_source_documents
      WHERE role = $1
        AND ($2::text IS NULL OR version = $2::text)
        AND ($3::text IS NULL OR document_digest = $3::text)
      LIMIT 1`,
    [ref.role, ref.version ?? null, ref.digest ?? null]
  )

  return rows[0] ? verified(rows[0]) : null
}

/** Every document held, newest first within its role. Identity and provenance only: never the text. */
export const listSourceDocuments = async (client: QuoterDbClient | undefined) => {
  const rows = await runQuoterQuery<Omit<Row, 'document_text' | 'document_text_digest'>>(
    client,
    `SELECT role, version, document_digest, schema_version, parent_digest, origin, source_path, source_commit_sha,
            stored_at
       FROM greenhouse_commercial.quoter_source_documents
      ORDER BY role COLLATE "C", stored_at DESC, version COLLATE "C"`
  )

  return rows.map(row => ({
    role: row.role,
    version: row.version,
    digest: row.document_digest,
    schemaVersion: row.schema_version,
    parentDigest: row.parent_digest,
    origin: row.origin,
    sourcePath: row.source_path,
    sourceCommitSha: row.source_commit_sha,
    storedAt: toIso(row.stored_at)
  }))
}

export type StoreSourceDocumentInput = {
  role: CurrentSourceRole
  /** The document as received, as text. It is validated by the contract of its role and stored as it is. */
  text: string
  origin: SourceDocumentOrigin
  /** Where the file lives in the repository, and the commit it was read at. Required unless `platform_apply`. */
  sourcePath?: string | null
  sourceCommitSha?: string | null
  parentDigest?: string | null
  actor: QuoterActor
  reason: string
  command?: QuoterCommandContext
}

/**
 * Stores a new document and publishes its event, in the transaction of `client`. Does not touch the pointer.
 * `source_document_exists` when that role and version (or that digest) is already held.
 */
export const storeSourceDocument = async (
  client: QuoterDbClient,
  input: StoreSourceDocumentInput
): Promise<StoredSourceDocument> => {
  const canonical = identifySourceDocument(input.role, input.text)

  if (input.origin !== 'platform_apply' && !(input.sourcePath && input.sourceCommitSha))
    throw new QuoterError('source_commit_required', { role: input.role, version: canonical.version, origin: input.origin })

  const rows = await withQuoterRejections(
    () =>
      runQuoterQuery<Row>(
        client,
        `INSERT INTO greenhouse_commercial.quoter_source_documents
           (role, version, document_digest, document_text, document_text_digest, schema_version, parent_digest,
            origin, source_path, source_commit_sha, stored_by_actor_kind, stored_by_member_id,
            stored_by_principal_id, reason, command_execution_id, request_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING ${COLUMNS}`,
        [
          input.role,
          canonical.version,
          canonical.digest,
          canonical.text,
          canonical.textDigest,
          canonical.schemaVersion,
          input.parentDigest ?? null,
          input.origin,
          input.sourcePath ?? null,
          input.sourceCommitSha ?? null,
          input.actor.kind,
          memberIdOf(input.actor),
          input.actor.principalId,
          input.reason,
          input.command?.commandExecutionId ?? null,
          input.command?.requestHash ?? null
        ]
      ),
    { role: input.role, version: canonical.version }
  )

  const stored = verified(rows[0])

  await publishQuoterSourceDocumentStored(client, {
    version: 1,
    role: stored.role,
    documentVersion: stored.version,
    documentDigest: stored.digest,
    origin: stored.origin,
    actorKind: input.actor.kind
  })

  return stored
}
