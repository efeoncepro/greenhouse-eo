// TASK-356 — HiringHandoff: boundary object decisión→downstream (aggregate + state-machine
// + command + materializer + readers). Un primitive, muchos consumers (770 UI, Person 360,
// Staff Aug, Nexa por parity).

export {
  HIRING_HANDOFF_BLOCKED_REASONS,
  HIRING_HANDOFF_COMMAND_ACTIONS,
  HIRING_HANDOFF_STATES,
  HIRING_HANDOFF_SUPPORTED_DESTINATIONS,
  isSupportedHandoffDestination,
} from './types'
export type {
  HiringHandoff,
  HiringHandoffBlockedReason,
  HiringHandoffCommandAction,
  HiringHandoffState,
  MaterializeHandoffOutcome,
  TransitionHiringHandoffInput,
  TransitionHiringHandoffResult,
} from './types'
export {
  COMMAND_ACTION_TARGET,
  isPostApprovalState,
  isValidCommandTransition,
  isValidSystemTransition,
} from './state-machine'
export { getHiringHandoffById, getHiringHandoffByApplicationId } from './store'
export { materializeHandoffFromApplication } from './materialize'
export { isHiringHandoffCommandAction, transitionHiringHandoff } from './transition'
