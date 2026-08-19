import 'server-only'

import { createHmac } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type PublicAssessmentRequestSurface =
  | 'exchange_ip'
  | 'exchange_credential'
  | 'session_read_ip'
  | 'session_read_credential'
  | 'session_write_ip'
  | 'session_write_credential'

const LIMITS: Record<PublicAssessmentRequestSurface, number> = {
  exchange_ip: 120,
  exchange_credential: 10,
  session_read_ip: 600,
  session_read_credential: 120,
  session_write_ip: 300,
  session_write_credential: 60,
}

const REQUESTER_HASH_CONTEXT = 'greenhouse-assessment-public-request:v2'

export interface PublicAssessmentRequestBudget {
  requesterDigest: string
  surface: PublicAssessmentRequestSurface
  limit: number
}

export class PublicAssessmentRequestRateLimitError extends Error {
  constructor() {
    super('Public assessment request rate limit exceeded.')
    this.name = 'PublicAssessmentRequestRateLimitError'
  }
}

export const publicAssessmentRequesterAddress = (request: Request): string | null => {
  if (process.env.VERCEL_ENV) {
    return request.headers.get('x-vercel-forwarded-for')?.split(',', 1)[0]?.trim() || null
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim()

  return process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
    ? forwarded || request.headers.get('x-real-ip')?.trim() || null
    : null
}

export const digestPublicAssessmentRequester = (
  kind: 'ip' | 'access_credential' | 'session_credential',
  value: string,
  secret = process.env.NEXTAUTH_SECRET,
): string => {
  if (!secret?.trim()) throw new Error('Assessment public requester digest key is unavailable.')

  const canonicalValue = kind === 'ip' ? value.trim().toLowerCase() : value

  return createHmac('sha256', secret)
    .update(`${REQUESTER_HASH_CONTEXT}:${kind}:${canonicalValue}`)
    .digest('hex')
}

const claim = async (digest: string, surface: PublicAssessmentRequestSurface): Promise<boolean> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ allowed: boolean }>(
      `SELECT greenhouse_hiring.claim_assessment_public_request_budget($1,$2,$3) AS allowed`,
      [digest, surface, LIMITS[surface]],
    )

    return rows[0]?.allowed === true
  } catch {
    return false
  }
}

export const claimPublicAssessmentIpCeiling = async (
  request: Request,
  surface: 'exchange' | 'session_read' | 'session_write',
): Promise<boolean> => {
  const address = publicAssessmentRequesterAddress(request)

  if (!address) return !process.env.VERCEL_ENV

  try {
    return claim(digestPublicAssessmentRequester('ip', address), `${surface}_ip`)
  } catch {
    return false
  }
}

export const buildPublicAssessmentCredentialBudget = (
  rawCredential: string,
  kind: 'access_credential' | 'session_credential',
  surface: 'exchange' | 'session_read' | 'session_write',
): PublicAssessmentRequestBudget => {
  const budgetSurface = `${surface}_credential` as PublicAssessmentRequestSurface

  return {
    requesterDigest: digestPublicAssessmentRequester(kind, rawCredential),
    surface: budgetSurface,
    limit: LIMITS[budgetSurface],
  }
}
