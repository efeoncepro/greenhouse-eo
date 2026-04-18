import 'server-only'

import { withTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

export type PasswordChangeSource =
  | 'user_reset'
  | 'accept_invite'
  | 'bootstrap_admin'
  | 'test_fixture'

interface MutationParams {
  userId: string
  source: PasswordChangeSource
  actorUserId?: string
}

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

/**
 * Wraps a password_hash-mutating statement in a transaction that:
 *   1. Authorizes the DB trigger `guard_password_hash_mutation` via
 *      `SET LOCAL app.password_change_authorized = 'true'`.
 *   2. Executes the caller's writer.
 *   3. Publishes `identity.password_hash.rotated` outbox event for observability.
 *
 * TASK-451 / ISSUE-053. Required for any legitimate password write path
 * (reset-password, accept-invite, bootstrap seed). Any write outside this
 * helper will be rejected by the trigger.
 */
export const withPasswordChangeAuthorization = async <T>(
  params: MutationParams,
  callback: (client: QueryableClient) => Promise<T>
): Promise<T> => {
  return withTransaction(async client => {
    await client.query(`SET LOCAL app.password_change_authorized = 'true'`)

    const result = await callback(client)

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.identityCredential,
        aggregateId: params.userId,
        eventType: EVENT_TYPES.identityPasswordHashRotated,
        payload: {
          userId: params.userId,
          source: params.source,
          actorUserId: params.actorUserId ?? params.userId,
          rotatedAt: new Date().toISOString()
        }
      },
      client
    )

    return result
  })
}
