/**
 * TASK-848 — Production Release Control Plane: canonical state machine.
 *
 * Mirror EXACTO de la CHECK constraint `release_manifests_state_canonical_check`
 * en `migrations/20260510111229586_task-848-release-control-plane-foundation.sql`.
 *
 * Esta es la fuente de verdad TS del state machine. La DB enforce el shape
 * + transiciones via CHECK + (futuro) trigger anti-zombie. El TS guard
 * `assertValidReleaseStateTransition` enforce las mismas transiciones en
 * application code para fail-fast antes de tocar DB (defense in depth).
 *
 * **Test de paridad TS↔SQL** vive en `state-machine.test.ts`. Si la migration
 * cambia el enum, el test rompe build hasta que el TS se sincronice.
 *
 * Spec canonico: `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` §2.3.
 */

/**
 * Estados canonicos del state machine de releases. Enum cerrado.
 *
 * Mirror exacto de `release_manifests_state_canonical_check` DB constraint.
 */
export const RELEASE_STATES = [
  'preflight',
  'ready',
  'deploying',
  'verifying',
  'released',
  'degraded',
  'rolled_back',
  'aborted'
] as const

export type ReleaseState = (typeof RELEASE_STATES)[number]

/**
 * Estados terminales: una vez aqui, `attempt_n` no incrementa via UPDATE.
 * Para re-intentar, INSERT nueva row con mismo `target_sha` + `attempt_n + 1`.
 */
export const TERMINAL_RELEASE_STATES = ['released', 'rolled_back', 'aborted'] as const
export type TerminalReleaseState = (typeof TERMINAL_RELEASE_STATES)[number]

/**
 * Estados activos: cuentan contra el partial UNIQUE INDEX
 * `release_manifests_one_active_per_branch_idx`. Solo 1 release por branch
 * puede estar simultaneamente en estos estados.
 */
export const ACTIVE_RELEASE_STATES = [
  'preflight',
  'ready',
  'deploying',
  'verifying'
] as const
export type ActiveReleaseState = (typeof ACTIVE_RELEASE_STATES)[number]

/**
 * Matrix canonica de transiciones permitidas. Mirror del documento spec V1 §2.3:
 *
 *   preflight → ready
 *   ready → deploying
 *   deploying → verifying
 *   verifying → released | degraded | aborted
 *   degraded → rolled_back | released
 *   released → rolled_back
 *
 * Cualquier transicion fuera de esta tabla es bug — `assertValidReleaseStateTransition`
 * lo throw fail-loud antes de tocar DB.
 *
 * Nota: aborted es terminal sin recovery — para retry, crear nueva row con
 * mismo target_sha + attempt_n + 1.
 */
export const RELEASE_TRANSITION_MATRIX: Readonly<Record<ReleaseState, readonly ReleaseState[]>> = {
  preflight: ['ready', 'aborted'],
  ready: ['deploying', 'aborted'],
  deploying: ['verifying', 'aborted'],
  verifying: ['released', 'degraded', 'aborted'],
  released: ['rolled_back'],
  degraded: ['rolled_back', 'released'],
  rolled_back: [],
  aborted: []
}

/**
 * Verifica que una transicion `from -> to` esta permitida en la matrix
 * canonica. Throw fail-loud si no.
 */
export const isValidReleaseStateTransition = (
  from: ReleaseState,
  to: ReleaseState
): boolean => {
  const allowed = RELEASE_TRANSITION_MATRIX[from]

  return allowed.includes(to)
}

export class InvalidReleaseStateTransitionError extends Error {
  constructor(
    public readonly fromState: ReleaseState,
    public readonly toState: ReleaseState,
    public readonly releaseId?: string
  ) {
    const allowed = RELEASE_TRANSITION_MATRIX[fromState].join(', ') || '(none, terminal)'
    const releaseDescriptor = releaseId ? ` releaseId=${releaseId}` : ''

    super(
      `Invalid release state transition from='${fromState}' to='${toState}'${releaseDescriptor}. Allowed from='${fromState}': ${allowed}.`
    )
    this.name = 'InvalidReleaseStateTransitionError'
  }
}

/**
 * Application guard fail-loud. Llamar ANTES de cualquier UPDATE de
 * `release_manifests.state` o INSERT en `release_state_transitions`.
 *
 * Patron canonico (mirror TASK-765 `assertValidPaymentOrderStateTransition`).
 */
export const assertValidReleaseStateTransition = (
  from: ReleaseState,
  to: ReleaseState,
  releaseId?: string
): void => {
  if (!isValidReleaseStateTransition(from, to)) {
    throw new InvalidReleaseStateTransitionError(from, to, releaseId)
  }
}

/**
 * Type guard helper.
 */
export const isReleaseState = (value: unknown): value is ReleaseState => {
  return typeof value === 'string' && (RELEASE_STATES as readonly string[]).includes(value)
}

export const isTerminalReleaseState = (state: ReleaseState): state is TerminalReleaseState => {
  return (TERMINAL_RELEASE_STATES as readonly string[]).includes(state)
}

export const isActiveReleaseState = (state: ReleaseState): state is ActiveReleaseState => {
  return (ACTIVE_RELEASE_STATES as readonly string[]).includes(state)
}
