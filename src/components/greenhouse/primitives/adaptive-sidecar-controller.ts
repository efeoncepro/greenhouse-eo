export type AdaptiveSidecarKind = 'assistant' | 'inspector' | 'form' | 'preview' | 'review'

export type AdaptiveSidecarPreferredMode = 'push' | 'inline' | 'overlay' | 'temporary'

export type AdaptiveSidecarResolvedMode = AdaptiveSidecarPreferredMode | 'closed'

export type AdaptiveSidecarSide = 'left' | 'right'

export type AdaptiveSidecarTelemetryEventName =
  | 'sidecar.open'
  | 'sidecar.close'
  | 'sidecar.mode_change'
  | 'sidecar.replace'
  | 'sidecar.dirty_close_attempt'

export interface ResolveAdaptiveSidecarModeInput {
  open: boolean
  preferredMode?: AdaptiveSidecarPreferredMode
  viewportWidth?: number
  availableWidth?: number
  breakpointWidth?: number
  mainMinWidth?: number
  sidecarWidth?: number
  allowPush?: boolean
}

export interface AdaptiveSidecarTelemetryEvent {
  name: AdaptiveSidecarTelemetryEventName
  kind: AdaptiveSidecarKind
  mode: AdaptiveSidecarResolvedMode
  previousMode?: AdaptiveSidecarResolvedMode
  source?: string
  timestamp: string
}

export interface AdaptiveSidecarSearchParamsInput {
  kind?: AdaptiveSidecarKind
  sidecarId?: string
  mode?: AdaptiveSidecarPreferredMode
}

export type AdaptiveSidecarControllerLastAction =
  | 'idle'
  | 'opened'
  | 'closed'
  | 'dirty_changed'
  | 'blocked_dirty_close'
  | 'blocked_dirty_replace'

export interface AdaptiveSidecarControllerState {
  open: boolean
  kind?: AdaptiveSidecarKind
  sidecarId?: string
  mode?: AdaptiveSidecarPreferredMode
  dirty?: boolean
  lastAction?: AdaptiveSidecarControllerLastAction
}

export type AdaptiveSidecarControllerAction =
  | {
      type: 'open'
      kind: AdaptiveSidecarKind
      sidecarId?: string
      mode?: AdaptiveSidecarPreferredMode
      force?: boolean
    }
  | {
      type: 'close'
      force?: boolean
    }
  | {
      type: 'markDirty'
      dirty: boolean
    }

const DEFAULT_BREAKPOINT_WIDTH = 1200
const DEFAULT_MAIN_MIN_WIDTH = 760
const DEFAULT_SIDECAR_WIDTH = 420

export const resolveAdaptiveSidecarMode = ({
  open,
  preferredMode = 'push',
  viewportWidth,
  availableWidth,
  breakpointWidth = DEFAULT_BREAKPOINT_WIDTH,
  mainMinWidth = DEFAULT_MAIN_MIN_WIDTH,
  sidecarWidth = DEFAULT_SIDECAR_WIDTH,
  allowPush = true
}: ResolveAdaptiveSidecarModeInput): AdaptiveSidecarResolvedMode => {
  if (!open) {
    return 'closed'
  }

  if (preferredMode === 'temporary' || preferredMode === 'overlay' || preferredMode === 'inline') {
    return preferredMode
  }

  if (!allowPush) {
    return 'overlay'
  }

  if (viewportWidth === undefined) {
    return preferredMode
  }

  if (viewportWidth < breakpointWidth) {
    return 'temporary'
  }

  const fitWidth = availableWidth ?? viewportWidth

  if (fitWidth < mainMinWidth + sidecarWidth) {
    return 'overlay'
  }

  return 'push'
}

export const canReplaceAdaptiveSidecar = ({
  currentKind,
  nextKind,
  dirty
}: {
  currentKind?: AdaptiveSidecarKind
  nextKind: AdaptiveSidecarKind
  dirty?: boolean
}) => {
  if (!currentKind || currentKind === nextKind) {
    return true
  }

  return !dirty
}

export const buildSidecarSearchParams = (
  current: URLSearchParams,
  input: AdaptiveSidecarSearchParamsInput
) => {
  const next = new URLSearchParams(current.toString())

  if (input.kind) {
    next.set('sidecar', input.kind)
  }

  if (input.sidecarId) {
    next.set('sidecarId', input.sidecarId)
  }

  if (input.mode) {
    next.set('sidecarMode', input.mode)
  }

  return next
}

export const removeSidecarSearchParams = (current: URLSearchParams) => {
  const next = new URLSearchParams(current.toString())

  next.delete('sidecar')
  next.delete('sidecarId')
  next.delete('sidecarMode')

  return next
}

export const createAdaptiveSidecarEvent = ({
  name,
  kind,
  mode,
  previousMode,
  source,
  timestamp = new Date().toISOString()
}: Omit<AdaptiveSidecarTelemetryEvent, 'timestamp'> & { timestamp?: string }): AdaptiveSidecarTelemetryEvent => ({
  name,
  kind,
  mode,
  previousMode,
  source,
  timestamp
})

export const reduceAdaptiveSidecarState = (
  state: AdaptiveSidecarControllerState,
  action: AdaptiveSidecarControllerAction
): AdaptiveSidecarControllerState => {
  if (action.type === 'markDirty') {
    if (state.dirty === action.dirty) {
      return state
    }

    return { ...state, dirty: action.dirty, lastAction: 'dirty_changed' }
  }

  if (action.type === 'close') {
    if (!state.open) {
      return state
    }

    if (state.dirty && !action.force) {
      return { ...state, lastAction: 'blocked_dirty_close' }
    }

    return {
      open: false,
      kind: state.kind,
      sidecarId: state.sidecarId,
      mode: state.mode,
      dirty: false,
      lastAction: 'closed'
    }
  }

  const sameTarget =
    state.open &&
    state.kind === action.kind &&
    state.sidecarId === action.sidecarId &&
    state.mode === action.mode

  if (sameTarget) {
    return state
  }

  if (state.open && state.dirty && !action.force) {
    return { ...state, lastAction: 'blocked_dirty_replace' }
  }

  return {
    open: true,
    kind: action.kind,
    sidecarId: action.sidecarId,
    mode: action.mode,
    dirty: false,
    lastAction: 'opened'
  }
}
