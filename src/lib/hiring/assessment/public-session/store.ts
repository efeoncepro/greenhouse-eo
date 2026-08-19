import 'server-only'

import type { PoolClient } from 'pg'

import {
  PublicAssessmentRequestRateLimitError,
  type PublicAssessmentRequestBudget,
} from './abuse-guard'
import type { PublicAssessmentSessionContext, PublicAssessmentSessionStatus } from './contracts'

const TERMINAL_APPLICATION_STAGES = new Set(['selected', 'rejected', 'withdrawn', 'handoff_ready', 'closed'])
const OPEN_ASSESSMENT_STATUSES = new Set(['assigned', 'sent', 'in_progress'])

interface AssessmentAccessRow {
  assessment_id: string
  application_id: string
  method: string
  status: string
  access_token_hash: string | null
  access_token_version_id: string | null
  token_expires_at: Date | string | null
  answer_deadline: Date | string | null
  close_deadline: Date | string | null
}

interface ApplicationAccessRow {
  candidate_facet_id: string
  stage: string
  decision: string | null
}

interface CandidateFacetAccessRow {
  consent_status: string
}

interface PublicSessionRow {
  public_session_id: string
  assessment_id: string
  access_token_version_id: string
  status: PublicAssessmentSessionStatus
  expires_at: Date | string
}

export type PublicAssessmentAccessExchangeStoreResult =
  | { outcome: 'issued'; session: PublicAssessmentSessionContext }
  | { outcome: 'unavailable' }
  | { outcome: 'issuance_failed' }

const toMillis = (value: Date | string): number => new Date(value).getTime()
const toIso = (value: Date | string): string => new Date(value).toISOString()

const normalizeSession = (row: PublicSessionRow): PublicAssessmentSessionContext => ({
  publicSessionId: row.public_session_id,
  assessmentId: row.assessment_id,
  accessTokenVersionId: row.access_token_version_id,
  status: row.status,
  expiresAt: toIso(row.expires_at),
})

const loadAssessmentByCredential = async (
  client: PoolClient,
  accessTokenDigest: string,
): Promise<AssessmentAccessRow | null> => {
  const result = await client.query<AssessmentAccessRow>(
    `SELECT assessment_id, application_id, method, status, access_token_hash,
            access_token_version_id, token_expires_at,
            greenhouse_hiring.assessment_candidate_test_deadline(
              started_at, time_limit_minutes, accommodations_json
            ) AS answer_deadline,
            greenhouse_hiring.assessment_candidate_test_close_deadline(
              started_at, time_limit_minutes, accommodations_json
            ) AS close_deadline
     FROM greenhouse_hiring.hiring_assessment
     WHERE access_token_hash = $1
     LIMIT 1
     FOR UPDATE`,
    [accessTokenDigest],
  )

  return result.rows[0] ?? null
}

const loadAssessmentById = async (
  client: PoolClient,
  assessmentId: string,
): Promise<AssessmentAccessRow | null> => {
  const result = await client.query<AssessmentAccessRow>(
    `SELECT assessment_id, application_id, method, status, access_token_hash,
            access_token_version_id, token_expires_at,
            greenhouse_hiring.assessment_candidate_test_deadline(
              started_at, time_limit_minutes, accommodations_json
            ) AS answer_deadline,
            greenhouse_hiring.assessment_candidate_test_close_deadline(
              started_at, time_limit_minutes, accommodations_json
            ) AS close_deadline
     FROM greenhouse_hiring.hiring_assessment
     WHERE assessment_id = $1
     LIMIT 1
     FOR UPDATE`,
    [assessmentId],
  )

  return result.rows[0] ?? null
}

const loadApplicationAndConsent = async (
  client: PoolClient,
  applicationId: string,
): Promise<{ application: ApplicationAccessRow; facet: CandidateFacetAccessRow } | null> => {
  const applicationResult = await client.query<ApplicationAccessRow>(
    `SELECT candidate_facet_id, stage, decision
     FROM greenhouse_hiring.hiring_application
     WHERE application_id = $1
     LIMIT 1
     FOR UPDATE`,
    [applicationId],
  )

  const application = applicationResult.rows[0]

  if (!application) return null

  const facetResult = await client.query<CandidateFacetAccessRow>(
    `SELECT consent_status
     FROM greenhouse_hiring.candidate_facet
     WHERE candidate_facet_id = $1
     LIMIT 1
     FOR UPDATE`,
    [application.candidate_facet_id],
  )

  const facet = facetResult.rows[0]

  return facet ? { application, facet } : null
}

const isApplicationEligible = (
  application: ApplicationAccessRow,
  facet: CandidateFacetAccessRow,
): boolean => !application.decision
  && !TERMINAL_APPLICATION_STAGES.has(application.stage)
  && facet.consent_status !== 'withdrawn'

const assessmentExpiry = (assessment: AssessmentAccessRow): Date | null => {
  const value = assessment.status === 'in_progress'
    ? assessment.close_deadline
    : assessment.token_expires_at

  return value ? new Date(value) : null
}

const isAssessmentEligible = (assessment: AssessmentAccessRow, databaseNow: Date | string): boolean => {
  const expiresAt = assessmentExpiry(assessment)

  return assessment.method === 'candidate_test'
    && OPEN_ASSESSMENT_STATUSES.has(assessment.status)
    && Boolean(assessment.access_token_hash && assessment.access_token_version_id && expiresAt)
    && Boolean(expiresAt && toMillis(expiresAt) > toMillis(databaseNow))
}

const expireAssessmentIfOverdue = async (
  client: PoolClient,
  assessment: AssessmentAccessRow,
  databaseNow: Date | string,
): Promise<void> => {
  const expiresAt = assessmentExpiry(assessment)

  if (expiresAt && toMillis(expiresAt) <= toMillis(databaseNow)
      && OPEN_ASSESSMENT_STATUSES.has(assessment.status)) {
    await client.query(
      `UPDATE greenhouse_hiring.hiring_assessment
       SET status = 'expired', updated_at = clock_timestamp()
       WHERE assessment_id = $1 AND status = $2`,
      [assessment.assessment_id, assessment.status],
    )
  }
}

const claimCredentialBudgetWithClient = async (
  client: PoolClient,
  budget: PublicAssessmentRequestBudget,
): Promise<void> => {
  const result = await client.query<{ allowed: boolean }>(
    'SELECT greenhouse_hiring.claim_assessment_public_request_budget($1,$2,$3) AS allowed',
    [budget.requesterDigest, budget.surface, budget.limit],
  )

  if (result.rows[0]?.allowed !== true) throw new PublicAssessmentRequestRateLimitError()
}

export const exchangePublicAssessmentAccessWithClient = async (
  client: PoolClient,
  input: {
    accessTokenDigest: string
    sessionTokenDigest: string
    requestBudget: PublicAssessmentRequestBudget
  },
): Promise<PublicAssessmentAccessExchangeStoreResult> => {
  const assessment = await loadAssessmentByCredential(client, input.accessTokenDigest)

  if (!assessment) return { outcome: 'unavailable' }

  const lineage = await loadApplicationAndConsent(client, assessment.application_id)
  const nowResult = await client.query<{ database_now: Date | string }>('SELECT clock_timestamp() AS database_now')
  const databaseNow = nowResult.rows[0]?.database_now

  if (!lineage || !isApplicationEligible(lineage.application, lineage.facet)
      || !databaseNow || !isAssessmentEligible(assessment, databaseNow)) {
    if (databaseNow) await expireAssessmentIfOverdue(client, assessment, databaseNow)

    return { outcome: 'unavailable' }
  }

  const expiresAt = assessmentExpiry(assessment)

  if (!expiresAt || !assessment.access_token_version_id) return { outcome: 'unavailable' }

  await claimCredentialBudgetWithClient(client, input.requestBudget)

  // A valid credential consumes its budget even if session issuance fails. The savepoint
  // clears PostgreSQL's aborted-statement state without releasing the eligibility locks;
  // the outer transaction can then commit the claim and report a generic failure.
  await client.query('SAVEPOINT assessment_public_session_issue')

  try {
    const inserted = await client.query<PublicSessionRow>(
      `INSERT INTO greenhouse_hiring.hiring_assessment_public_session
         (assessment_id, access_token_version_id, session_token_hash, expires_at)
       VALUES ($1, $2::uuid, $3, $4)
       RETURNING public_session_id, assessment_id, access_token_version_id, status, expires_at`,
      [assessment.assessment_id, assessment.access_token_version_id, input.sessionTokenDigest, expiresAt],
    )

    await client.query('RELEASE SAVEPOINT assessment_public_session_issue')

    return inserted.rows[0]
      ? { outcome: 'issued', session: normalizeSession(inserted.rows[0]) }
      : { outcome: 'issuance_failed' }
  } catch {
    await client.query('ROLLBACK TO SAVEPOINT assessment_public_session_issue')
    await client.query('RELEASE SAVEPOINT assessment_public_session_issue')

    return { outcome: 'issuance_failed' }
  }
}

const closeSession = async (
  client: PoolClient,
  publicSessionId: string,
  status: 'revoked' | 'expired',
): Promise<void> => {
  await client.query(
    `UPDATE greenhouse_hiring.hiring_assessment_public_session
     SET status = $2, updated_at = clock_timestamp()
     WHERE public_session_id = $1 AND status = 'active'`,
    [publicSessionId, status],
  )
}

export const resolvePublicAssessmentSessionWithClient = async (
  client: PoolClient,
  input: { sessionTokenDigest: string; requestBudget: PublicAssessmentRequestBudget },
): Promise<PublicAssessmentSessionContext | null> => {
  // Hint only. The authoritative session row is locked after the assessment so every path
  // follows assessment → application → candidate facet → session and cannot deadlock recovery.
  const hintResult = await client.query<Pick<PublicSessionRow, 'public_session_id' | 'assessment_id'>>(
    `SELECT public_session_id, assessment_id
     FROM greenhouse_hiring.hiring_assessment_public_session
     WHERE session_token_hash = $1
     LIMIT 1`,
    [input.sessionTokenDigest],
  )

  const hint = hintResult.rows[0]

  if (!hint) return null

  const assessment = await loadAssessmentById(client, hint.assessment_id)

  if (!assessment) return null

  const lineage = await loadApplicationAndConsent(client, assessment.application_id)

  if (!lineage) return null

  const sessionResult = await client.query<PublicSessionRow>(
    `SELECT public_session_id, assessment_id, access_token_version_id, status, expires_at
     FROM greenhouse_hiring.hiring_assessment_public_session
     WHERE session_token_hash = $1 AND assessment_id = $2
     LIMIT 1
     FOR UPDATE`,
    [input.sessionTokenDigest, assessment.assessment_id],
  )

  const session = sessionResult.rows[0]

  if (!session || session.public_session_id !== hint.public_session_id) return null

  // Clock is sampled only after the authoritative session lock. A transaction that waited
  // for another resolver cannot authorize from a pre-wait timestamp.
  const nowResult = await client.query<{ database_now: Date | string }>('SELECT clock_timestamp() AS database_now')
  const databaseNow = nowResult.rows[0]?.database_now

  if (!databaseNow) return null

  const nowMs = toMillis(databaseNow)
  const effectiveExpiry = assessmentExpiry(assessment)

  const expired = session.status === 'expired'
    || toMillis(session.expires_at) <= nowMs
    || Boolean(effectiveExpiry && toMillis(effectiveExpiry) <= nowMs)

  if (expired) {
    await closeSession(client, session.public_session_id, 'expired')
    await expireAssessmentIfOverdue(client, assessment, databaseNow)

    return null
  }

  const revoked = session.status !== 'active'
    || !isApplicationEligible(lineage.application, lineage.facet)
    || !isAssessmentEligible(assessment, databaseNow)
    || !assessment.access_token_hash
    || !assessment.access_token_version_id
    || session.access_token_version_id !== assessment.access_token_version_id

  if (revoked) {
    await closeSession(client, session.public_session_id, 'revoked')

    return null
  }

  await claimCredentialBudgetWithClient(client, input.requestBudget)

  return normalizeSession(session)
}

export const revokePublicAssessmentSessionWithClient = async (
  client: PoolClient,
  sessionTokenDigest: string,
): Promise<boolean> => {
  const result = await client.query(
    `UPDATE greenhouse_hiring.hiring_assessment_public_session
     SET status = 'revoked', updated_at = clock_timestamp()
     WHERE session_token_hash = $1 AND status = 'active'
     RETURNING public_session_id`,
    [sessionTokenDigest],
  )

  return result.rowCount === 1
}
