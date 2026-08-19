import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { buildPublicAssessmentCredentialBudget } from './abuse-guard'
import {
  digestPublicAssessmentAccessToken,
  digestPublicAssessmentSessionToken,
  isValidPublicAssessmentAccessToken,
  isValidPublicAssessmentSessionToken,
  issuePublicAssessmentSessionCredential,
  type PublicAssessmentSessionContext,
  type PublicAssessmentSessionExchangeResult,
} from './contracts'
import {
  exchangePublicAssessmentAccessWithClient,
  resolvePublicAssessmentSessionWithClient,
  revokePublicAssessmentSessionWithClient,
} from './store'

export class PublicAssessmentSessionIssuanceError extends Error {
  constructor() {
    super('Public assessment session issuance failed.')
    this.name = 'PublicAssessmentSessionIssuanceError'
  }
}

export const exchangePublicAssessmentAccess = async (
  rawAccessToken: string,
): Promise<PublicAssessmentSessionExchangeResult | null> => {
  if (!isValidPublicAssessmentAccessToken(rawAccessToken)) return null

  const credential = issuePublicAssessmentSessionCredential()

  const exchange = await withGreenhousePostgresTransaction(client =>
    exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: digestPublicAssessmentAccessToken(rawAccessToken),
      sessionTokenDigest: credential.digest,
      requestBudget: buildPublicAssessmentCredentialBudget(rawAccessToken, 'access_credential', 'exchange'),
    }))

  if (exchange.outcome === 'issuance_failed') throw new PublicAssessmentSessionIssuanceError()

  return exchange.outcome === 'issued'
    ? { sessionToken: credential.token, session: exchange.session }
    : null
}

export const withPublicAssessmentSession = async <T>(
  rawSessionToken: string,
  callback: (client: PoolClient, session: PublicAssessmentSessionContext) => Promise<T>,
  surface: 'session_read' | 'session_write' = 'session_read',
): Promise<T | null> => {
  if (!isValidPublicAssessmentSessionToken(rawSessionToken)) return null

  const result = await withGreenhousePostgresTransaction(async client => {
    const session = await resolvePublicAssessmentSessionWithClient(client, {
      sessionTokenDigest: digestPublicAssessmentSessionToken(rawSessionToken),
      requestBudget: buildPublicAssessmentCredentialBudget(rawSessionToken, 'session_credential', surface),
    })

    if (!session) return { outcome: 'unavailable' as const }

    await client.query('SAVEPOINT assessment_public_session_action')

    try {
      const value = await callback(client, session)

      await client.query('RELEASE SAVEPOINT assessment_public_session_action')

      return { outcome: 'ok' as const, value }
    } catch (error) {
      // Undo any partial domain writes while retaining the credential-budget claim.
      // Throw only after the outer COMMIT has made that claim durable.
      await client.query('ROLLBACK TO SAVEPOINT assessment_public_session_action')
      await client.query('RELEASE SAVEPOINT assessment_public_session_action')

      return { outcome: 'callback_failed' as const, error }
    }
  })

  if (result.outcome === 'callback_failed') throw result.error

  return result.outcome === 'ok' ? result.value : null
}

export const resolvePublicAssessmentSession = async (
  rawSessionToken: string,
): Promise<PublicAssessmentSessionContext | null> =>
  withPublicAssessmentSession(rawSessionToken, async (_client, session) => session, 'session_read')

export const revokePublicAssessmentSession = async (rawSessionToken: string): Promise<boolean> => {
  if (!isValidPublicAssessmentSessionToken(rawSessionToken)) return false

  return withGreenhousePostgresTransaction(client =>
    revokePublicAssessmentSessionWithClient(client, digestPublicAssessmentSessionToken(rawSessionToken)))
}
