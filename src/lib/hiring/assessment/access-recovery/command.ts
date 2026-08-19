import 'server-only'

import { HiringValidationError } from '../../errors'

import type {
  AssessmentAccessRecoveryChannel,
  AssessmentAccessRecoveryReason,
  AssessmentAccessRecoveryResult,
} from './contracts'
import { recoverCandidateTestAccessByEmail } from './recover-email'
import { recoverCandidateTestAccessBySecureLink } from './recover-secure-link'

export interface RecoverCandidateTestAccessInput {
  assessmentId: string
  channel: AssessmentAccessRecoveryChannel
  reasonCode: AssessmentAccessRecoveryReason
  idempotencyKey: string
  actorUserId: string
}

/** The single Product API write primitive; channel authority stays in the human adapter. */
export const recoverCandidateTestAccess = async (
  input: RecoverCandidateTestAccessInput,
): Promise<AssessmentAccessRecoveryResult> => {
  const command = {
    assessmentId: input.assessmentId,
    reasonCode: input.reasonCode,
    idempotencyKey: input.idempotencyKey,
  }

  if (input.channel === 'email') return recoverCandidateTestAccessByEmail(command, input.actorUserId)
  if (input.channel === 'secure_link') return recoverCandidateTestAccessBySecureLink(command, input.actorUserId)

  throw new HiringValidationError(
    'Debes elegir un canal de recuperación válido.',
    'assessment_recovery_invalid_channel',
    400,
  )
}
