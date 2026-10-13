import 'server-only'

import { currentVersionsDigest, currentVersionsSchema } from '@/lib/finance/pricing-v3/adapters/current-versions'

import { textDigest } from './canonical-text'
import { runQuoterQuery, toIso } from './db'
import { QuoterError, withQuoterRejections } from './errors'
import { publishQuoterPointerActivated } from './events'
import type { QuoterDbClient } from './db'
import { memberIdOf } from './types'
import type { QuoterActor, QuoterCommandContext } from './types'

/**
 * The pointer of current versions, as history (TASK-2025).
 *
 * "What is current" has one answer: the last row of the history. There is no "highest version wins". A row enters
 * only over the pointer the caller read (its digest is confirmed).
 *
 * Activating on the platform is always the act of an identified person. Mirroring the pointer of the repository is
 * not: the person decided when the file was committed, and the job that copies it names that commit instead.
 *
 * The pointer travels as the text it was written as. Its identity (`currentVersionsDigest`) covers its paths, its
 * reason and its day, so nothing re-serializes it: it is stored opaque, with the sha256 of that text next to it for
 * the database to check.
 */
export type PointerOrigin = 'repo_mirror' | 'platform_activation'

export type StoredPointer = {
  seq: number
  /** Identity of the pointer: `currentVersionsDigest`. */
  digest: string
  /** The pointer exactly as it was written. */
  text: string
  previousDigest: string | null
  catalogDigest: string
  policyDigest: string
  creditsDigest: string
  origin: PointerOrigin
  /** The person who activated it. `null` only for a mirror of the repository. */
  activatedByMemberId: string | null
  activatedByPrincipalId: string
  /** The commit the mirrored file was read at. `null` for an activation on the platform. */
  sourceCommitSha: string | null
  reason: string
  activatedAt: string
}

type Row = {
  [column: string]: unknown
  pointer_seq: string
  pointer_digest: string
  pointer_text: string
  pointer_text_digest: string
  previous_pointer_digest: string | null
  catalog_digest: string
  policy_digest: string
  credits_digest: string
  origin: PointerOrigin
  activated_by_member_id: string | null
  activated_by_principal_id: string
  source_commit_sha: string | null
  reason: string
  activated_at: Date
}

const COLUMNS = `pointer_seq, pointer_digest, pointer_text, pointer_text_digest, previous_pointer_digest,
  catalog_digest, policy_digest, credits_digest, origin, activated_by_member_id, activated_by_principal_id,
  source_commit_sha, reason, activated_at`

// Both digests are recomputed on every read: the one of the text and the one of identity.
const verified = (row: Row): StoredPointer => {
  let identity: string | null = null

  try {
    identity = currentVersionsDigest(JSON.parse(row.pointer_text))
  } catch {
    identity = null
  }

  if (textDigest(row.pointer_text) !== row.pointer_text_digest || identity !== row.pointer_digest)
    throw new QuoterError('stored_digest_mismatch', { object: 'pointer', pointerSeq: Number(row.pointer_seq) })

  return {
    seq: Number(row.pointer_seq),
    digest: row.pointer_digest,
    text: row.pointer_text,
    previousDigest: row.previous_pointer_digest,
    catalogDigest: row.catalog_digest,
    policyDigest: row.policy_digest,
    creditsDigest: row.credits_digest,
    origin: row.origin,
    activatedByMemberId: row.activated_by_member_id,
    activatedByPrincipalId: row.activated_by_principal_id,
    sourceCommitSha: row.source_commit_sha,
    reason: row.reason,
    activatedAt: toIso(row.activated_at)
  }
}

/** The pointer in force, or `null` when none was ever activated. */
export const readCurrentPointer = async (client: QuoterDbClient | undefined): Promise<StoredPointer | null> => {
  const rows = await runQuoterQuery<Row>(
    client,
    `SELECT ${COLUMNS} FROM greenhouse_commercial.quoter_pointer_history ORDER BY pointer_seq DESC LIMIT 1`
  )

  return rows[0] ? verified(rows[0]) : null
}

export type ActivatePointerInput = {
  /** The pointer exactly as it is to be stored. */
  text: string
  /** The digest of the pointer being replaced, or `null` when none is expected to exist. */
  confirmDigest: string | null
  origin: PointerOrigin
  /** `platform_activation` takes a member. `repo_mirror` takes whoever runs the copy, plus the commit below. */
  actor: QuoterActor
  /** The commit the pointer file was read at. Required for `repo_mirror`. */
  sourceCommitSha?: string | null
  reason: string
  command?: QuoterCommandContext
}

/**
 * Replaces the pointer and publishes its event, in the transaction of `client`. Comparing with the pointer in force
 * and replacing it are one act: the same lock the database trigger takes is taken here first.
 *
 * `pointer_conflict` when the pointer in force is not the one confirmed; `pointer_names_unknown_document` when it
 * names a document the registry does not hold; `human_actor_required` when a platform activation has no member;
 * `source_commit_required` when a mirror does not name its commit.
 */
export const activatePointer = async (client: QuoterDbClient, input: ActivatePointerInput): Promise<StoredPointer> => {
  if (input.origin === 'platform_activation' && input.actor.kind !== 'member')
    throw new QuoterError('human_actor_required', { act: 'activate_pointer' })
  if (input.origin === 'repo_mirror' && !input.sourceCommitSha)
    throw new QuoterError('source_commit_required', { act: 'mirror_pointer' })

  // A text that is not a pointer never becomes one: its own schema rejects it before anything is written.
  const pointer = currentVersionsSchema.parse(JSON.parse(input.text))
  const digest = currentVersionsDigest(pointer)

  // The same lock, with the same two keys, the trigger of the table takes.
  await runQuoterQuery(client, `SELECT pg_advisory_xact_lock(hashtext('greenhouse_commercial.quoter_pointer'), 0)`)

  const inForce = await readCurrentPointer(client)

  if ((inForce?.digest ?? null) !== input.confirmDigest)
    throw new QuoterError('pointer_conflict', { pointerSeq: inForce?.seq ?? null })

  // `pointer_seq` is assigned by the trigger, under the lock: the 0 sent here is never what is stored.
  const rows = await withQuoterRejections(() =>
    runQuoterQuery<Row>(
      client,
      `INSERT INTO greenhouse_commercial.quoter_pointer_history
         (pointer_seq, pointer_digest, pointer_text, pointer_text_digest, previous_pointer_digest,
          catalog_digest, policy_digest, credits_digest, origin, activated_by_member_id,
          activated_by_principal_id, source_commit_sha, reason, command_execution_id, request_hash)
       VALUES (0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING ${COLUMNS}`,
      [
        digest,
        input.text,
        textDigest(input.text),
        input.confirmDigest,
        pointer.catalog.digest,
        pointer.policy.digest,
        pointer.credits.digest,
        input.origin,
        memberIdOf(input.actor),
        input.actor.principalId,
        input.sourceCommitSha ?? null,
        input.reason,
        input.command?.commandExecutionId ?? null,
        input.command?.requestHash ?? null
      ]
    )
  )

  const stored = verified(rows[0])

  await publishQuoterPointerActivated(client, {
    version: 1,
    pointerSeq: stored.seq,
    pointerDigest: stored.digest,
    previousPointerDigest: stored.previousDigest,
    catalogDigest: stored.catalogDigest,
    policyDigest: stored.policyDigest,
    creditsDigest: stored.creditsDigest,
    origin: stored.origin
  })

  return stored
}
