import 'server-only'

/**
 * The states of a quote in the registry, and the changes that exist between them (TASK-2025).
 *
 * The same matrix is seeded as data in the migration of the aggregate (`quoter_state_matrix`), and the database
 * refuses a change that is not in it. `__tests__/state-machine-parity.test.ts` reads that seed and requires the two
 * to be equal: a pair added here without its migration, or the other way round, fails there.
 *
 * No pair requires an identified person (decision 7 of the promotion ADR, as amended by the CEO on 2026-10-12): an
 * agent issues a quote that is within policy and, by the same principle, withdraws what it may issue. The two acts
 * of a person in the quoter are not state changes and so are not here: approving an exception below the floor
 * (`quoter_exception_approvals`) and activating the catalog (`quoter_pointer_history`). Marking a pair as gated
 * takes a decision of the CEO and a migration.
 */
export const QUOTER_QUOTE_STATES = ['draft', 'issued', 'revising', 'withdrawn'] as const

export type QuoterQuoteState = (typeof QUOTER_QUOTE_STATES)[number]

/** The origin of the first change of a quote. It is not a state: no quote is ever "in" it. */
export const QUOTER_INITIAL_ORIGIN = 'none'

export type QuoterTransitionOrigin = QuoterQuoteState | typeof QUOTER_INITIAL_ORIGIN

export type QuoterTransition = { from: QuoterTransitionOrigin; to: QuoterQuoteState; humanGate: boolean }

export const QUOTER_TRANSITIONS: readonly QuoterTransition[] = [
  // Creating the quote with its version 1.
  { from: 'none', to: 'draft', humanGate: false },
  // Issuing.
  { from: 'draft', to: 'issued', humanGate: false },
  // Withdrawing a draft.
  { from: 'draft', to: 'withdrawn', humanGate: false },
  // Adding or registering a version over an issued quote.
  { from: 'issued', to: 'revising', humanGate: false },
  // Issuing the new version: the one issued before is replaced.
  { from: 'revising', to: 'issued', humanGate: false },
  // Withdrawing what was issued.
  { from: 'issued', to: 'withdrawn', humanGate: false },
  { from: 'revising', to: 'withdrawn', humanGate: false }
]

/** `withdrawn` is terminal, and there is no way back from `issued` to `draft`. */
export const QUOTER_TERMINAL_STATES: readonly QuoterQuoteState[] = ['withdrawn']

export const findQuoterTransition = (from: QuoterTransitionOrigin, to: QuoterQuoteState) =>
  QUOTER_TRANSITIONS.find(transition => transition.from === from && transition.to === to)

export const isQuoterQuoteState = (value: unknown): value is QuoterQuoteState =>
  QUOTER_QUOTE_STATES.some(state => state === value)
