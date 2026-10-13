import 'server-only'

/**
 * The states of a quote in the registry, and the changes that exist between them (TASK-2025).
 *
 * The same matrix is seeded as data in the migration of the aggregate (`quoter_state_matrix`), and the database
 * refuses a change that is not in it. `__tests__/state-machine-parity.test.ts` reads that seed and requires the two
 * to be equal: a pair added here without its migration, or the other way round, fails there.
 *
 * After it is issued a quote is accepted or rejected by its client (decision 5, CEO 2026-10-12). "Expired" is not
 * here because it is not a stored state: it is derived from the validity date of the last issue, in one place (the
 * view `quoter_quote_current`, column `effective_state`).
 *
 * No pair requires an identified person (decision 7 of the promotion ADR, as amended by the CEO on 2026-10-12): an
 * agent issues a quote that is within policy and, by the same principle, withdraws what it may issue and records
 * what the client answered. The two acts
 * of a person in the quoter are not state changes and so are not here: approving an exception below the floor
 * (`quoter_exception_approvals`) and activating the catalog (`quoter_pointer_history`). Marking a pair as gated
 * takes a decision of the CEO and a migration.
 */
export const QUOTER_QUOTE_STATES = ['draft', 'issued', 'revising', 'accepted', 'rejected', 'withdrawn'] as const

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
  { from: 'revising', to: 'withdrawn', humanGate: false },
  // The client answered what was issued. While a new version is being prepared, the answer is still about the last
  // one issued.
  { from: 'issued', to: 'accepted', humanGate: false },
  { from: 'issued', to: 'rejected', humanGate: false },
  { from: 'revising', to: 'accepted', humanGate: false },
  { from: 'revising', to: 'rejected', humanGate: false },
  // Opening a new version after an answer. Also the way out of an answer recorded by mistake: back to `revising`,
  // and the last version issued is issued again.
  { from: 'accepted', to: 'revising', humanGate: false },
  { from: 'rejected', to: 'revising', humanGate: false }
]

/** What a quote shows once the validity of its last issue has passed. Derived by the database; never stored. */
export const QUOTER_EXPIRED = 'expired'

export type QuoterEffectiveState = QuoterQuoteState | typeof QUOTER_EXPIRED

/** The states whose change names what was issued: the issue itself, and the answers of the client. */
export const QUOTER_RESPONSE_STATES: readonly QuoterQuoteState[] = ['accepted', 'rejected']

/** `withdrawn` is the only terminal state, and there is no way back from `issued` to `draft`. */
export const QUOTER_TERMINAL_STATES: readonly QuoterQuoteState[] = ['withdrawn']

export const findQuoterTransition = (from: QuoterTransitionOrigin, to: QuoterQuoteState) =>
  QUOTER_TRANSITIONS.find(transition => transition.from === from && transition.to === to)

export const isQuoterQuoteState = (value: unknown): value is QuoterQuoteState =>
  QUOTER_QUOTE_STATES.some(state => state === value)
