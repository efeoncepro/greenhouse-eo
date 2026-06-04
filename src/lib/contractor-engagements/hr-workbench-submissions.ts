import type { ContractorWorkSubmission } from './work-submissions/types'

const actionedAt = (submission: ContractorWorkSubmission): number => {
  const raw = submission.reviewedAt ?? submission.submittedAt ?? submission.createdAt
  const parsed = Date.parse(raw)

  return Number.isNaN(parsed) ? 0 : parsed
}

const reviewContextKey = (submission: ContractorWorkSubmission): string =>
  [
    submission.contractorEngagementId,
    submission.servicePeriodStart ?? '',
    submission.servicePeriodEnd ?? '',
    submission.submissionType,
    submission.title ?? ''
  ].join('|')

const isSupersedingSubmission = (submission: ContractorWorkSubmission): boolean =>
  submission.status === 'submitted' || submission.status === 'approved'

const isSupersededDispute = (
  disputed: ContractorWorkSubmission,
  submissions: ContractorWorkSubmission[]
): boolean => {
  const disputedKey = reviewContextKey(disputed)
  const disputedAt = actionedAt(disputed)

  return submissions.some(candidate =>
    candidate.contractorWorkSubmissionId !== disputed.contractorWorkSubmissionId &&
    reviewContextKey(candidate) === disputedKey &&
    isSupersedingSubmission(candidate) &&
    actionedAt(candidate) > disputedAt
  )
}

/**
 * Workbench attention is current-state, not historical audit.
 *
 * A disputed submission remains auditable in the submission ledger, but once the
 * contractor sends a newer correction for the same review context, the HR queue
 * should follow the newer submitted/approved item instead of keeping the old
 * dispute as the engagement headline.
 */
export const resolveCurrentWorkbenchSubmissions = (
  submissions: ContractorWorkSubmission[]
): ContractorWorkSubmission[] =>
  submissions.filter(submission => {
    if (submission.status === 'approved') return submission.consumedByPayableId === null
    if (submission.status === 'submitted') return true
    if (submission.status === 'disputed') return !isSupersededDispute(submission, submissions)

    return false
  })
