// TASK-770 — Bridge Hiring→HRIS (activación de colaborador desde un handoff aprobado).
// Un primitive, muchos consumers (1368 UI, Person 360, Nexa por parity).

export {
  HIRING_ACTIVATION_BLOCKED_REASONS,
  HIRING_ACTIVATION_BLOCKER_RESOLUTION_ACTIONS,
  HIRING_ACTIVATION_COMMAND_ACTIONS,
  HIRING_ACTIVATION_MEMBER_OUTCOMES,
  HIRING_ACTIVATION_STATES,
} from './types'
export type {
  HiringActivationActionableBlocker,
  HiringActivationAlternativeSurface,
  HiringActivationBlockedReason,
  HiringActivationBlockerActionContract,
  HiringActivationBlockerPayloadSchema,
  HiringActivationBlockerResolutionAction,
  HiringActivationBlockerResolutionResultStatus,
  HiringActivationBlockerResolutionStatus,
  HiringActivationBlockerSource,
  HiringActivationCommandAction,
  HiringActivationMemberOutcome,
  HiringActivationRequest,
  HiringActivationState,
  MaterializeMemberInput,
  MaterializeMemberResult,
} from './types'
export { HiringActivationError, HiringActivationIdentityConflictError, isHiringActivationError } from './errors'
export { isHiringActivationEnabled } from './config'
export { resolveOrCreateMemberForIdentityProfile } from './member-core'
export { getActivationRequestByHandoffId } from './store'
export {
  cancelHiringActivation,
  completeHiringActivation,
  createMemberForHiringActivation,
  openOnboardingForHiringActivation,
  reviewHiringActivation,
} from './service'
export {
  deriveHiringActivationBlockers,
  findHiringActivationBlocker,
  getHiringActivationBlockerActionContract,
  isHiringActivationBlockerResolutionAction,
  normalizeHiringActivationBlockerKey,
} from './blockers'
export {
  computeHiringActivationBlockerPayloadDigest,
  resolveHiringActivationBlocker,
} from './resolve-blocker'
export type { ResolveHiringActivationBlockerResult } from './resolve-blocker'
export { getHiringActivationDetail, listHiringActivationQueue } from './readers'
export type { HiringActivationDetail, HiringActivationQueueItem, HiringActivationQueueResult } from './readers'
