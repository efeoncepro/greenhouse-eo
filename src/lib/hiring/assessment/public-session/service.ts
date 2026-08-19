import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

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

export const exchangePublicAssessmentAccess = async (
  rawAccessToken: string,
): Promise<PublicAssessmentSessionExchangeResult | null> => {
  if (!isValidPublicAssessmentAccessToken(rawAccessToken)) return null

  const credential = issuePublicAssessmentSessionCredential()

  const session = await withGreenhousePostgresTransaction(client =>
    exchangePublicAssessmentAccessWithClient(client, {
      accessTokenDigest: digestPublicAssessmentAccessToken(rawAccessToken),
      sessionTokenDigest: credential.digest,
    }))

  return session ? { sessionToken: credential.token, session } : null
}

export const withPublicAssessmentSession = async <T>(
  rawSessionToken: string,
  callback: (client: PoolClient, session: PublicAssessmentSessionContext) => Promise<T>,
): Promise<T | null> => {
  if (!isValidPublicAssessmentSessionToken(rawSessionToken)) return null

  return withGreenhousePostgresTransaction(async client => {
    const session = await resolvePublicAssessmentSessionWithClient(
      client,
      digestPublicAssessmentSessionToken(rawSessionToken),
    )

    return session ? callback(client, session) : null
  })
}

export const resolvePublicAssessmentSession = async (
  rawSessionToken: string,
): Promise<PublicAssessmentSessionContext | null> =>
  withPublicAssessmentSession(rawSessionToken, async (_client, session) => session)

export const revokePublicAssessmentSession = async (rawSessionToken: string): Promise<boolean> => {
  if (!isValidPublicAssessmentSessionToken(rawSessionToken)) return false

  return withGreenhousePostgresTransaction(client =>
    revokePublicAssessmentSessionWithClient(client, digestPublicAssessmentSessionToken(rawSessionToken)))
}
