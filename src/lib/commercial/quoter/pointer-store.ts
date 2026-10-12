import 'server-only'

import { currentVersionsDigest, currentVersionsSchema } from '@/lib/finance/pricing-v3/adapters/current-versions'

import { textDigest } from './canonical-text'
import { CHECK_VIOLATION, FOREIGN_KEY_VIOLATION, constraintOf, runQuoterQuery, sqlStateOf, toIso } from './db'
import { QuoterError } from './errors'
import { publishQuoterPointerActivated } from './events'
import type { QuoterDbClient } from './db'
import type { QuoterCommandContext } from './types'

/**
 * The pointer of current versions, as history (TASK-2025).
 *
 * "What is current" has one answer: the last row of the history. There is no "highest version wins". A row enters
 * only over the pointer the caller read (its digest is confirmed), and moving the pointer is always the act of an
 * identified person: the table has no other kind of actor.
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
  activatedByMemberId: string
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
  activated_by_member_id: string
  reason: string
  activated_at: Date
}

const COLUMNS = `pointer_seq, pointer_digest, pointer_text, pointer_text_digest, previous_pointer_digest,
  catalog_digest, policy_digest, credits_digest, origin, activated_by_member_id, reason, activated_at`

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
  /** Moving the pointer is the act of an identified person. A machine identity never has a member id. */
  activatedByMemberId: string
  reason: string
  command?: QuoterCommandContext
}

/**
 * Replaces the pointer and publishes its event, in the transaction of `client`. Comparing with the pointer in force
 * and replacing it are one act: the same lock the database trigger takes is taken here first.
 *
 * `pointer_conflict` when the pointer in force is not the one confirmed; `pointer_names_unknown_document` when it
 * names a document the registry does not hold; `human_actor_required` without a member.
 */
export const activatePointer = async (client: QuoterDbClient, input: ActivatePointerInput): Promise<StoredPointer> => {
  if (!input.activatedByMemberId.trim()) throw new QuoterError('human_actor_required', { act: 'activate_pointer' })

  // A text that is not a pointer never becomes one: its own schema rejects it before anything is written.
  const pointer = currentVersionsSchema.parse(JSON.parse(input.text))
  const digest = currentVersionsDigest(pointer)

  await runQuoterQuery(
    client,
    `SELECT pg_advisory_xact_lock(hashtextextended('greenhouse_commercial.quoter_pointer_history', 0))`
  )

  const inForce = await readCurrentPointer(client)

  if ((inForce?.digest ?? null) !== input.confirmDigest)
    throw new QuoterError('pointer_conflict', { pointerSeq: inForce?.seq ?? null })

  let rows: Row[]

  // `pointer_seq` is assigned by the trigger, under the lock: the 0 sent here is never what is stored.
  try {
    rows = await runQuoterQuery<Row>(
      client,
      `INSERT INTO greenhouse_commercial.quoter_pointer_history
         (pointer_seq, pointer_digest, pointer_text, pointer_text_digest, previous_pointer_digest,
          catalog_digest, policy_digest, credits_digest, origin, activated_by_member_id, reason,
          command_execution_id, request_hash)
       VALUES (0, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        input.activatedByMemberId,
        input.reason,
        input.command?.commandExecutionId ?? null,
        input.command?.requestHash ?? null
      ]
    )
  } catch (error) {
    if (sqlStateOf(error) === FOREIGN_KEY_VIOLATION) throw new QuoterError('pointer_names_unknown_document')

    // The trigger refused the row and no named constraint did: another activation got in between the read above and
    // this insert, which can only happen when the caller did not run this inside a transaction.
    if (sqlStateOf(error) === CHECK_VIOLATION && !constraintOf(error)) throw new QuoterError('pointer_conflict')

    throw error
  }

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
