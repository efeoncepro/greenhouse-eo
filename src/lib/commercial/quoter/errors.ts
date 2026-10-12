import 'server-only'

import { constraintOf } from './db'

/**
 * Closed registry of the rejections of the quoter registry (TASK-2025).
 *
 * These are the rejections of the STATEFUL side: a document already held, a pointer that moved, a quote that did
 * not calculate. The rejections of the engine keep their own registry (`PricingV3Error`, in
 * `src/lib/finance/pricing-v3/errors.ts`) and pass through untouched: nothing here renames or wraps their codes.
 *
 * A code names the cause. `detail` carries identifiers, versions, states and digests only: never the text of a
 * document, a pointer or an artifact, which hold internal costs and margins. Turning a code into an HTTP status is
 * the job of the API tasks, not of this folder.
 */
export const QUOTER_ERROR_CODES = [
  // Source documents and pointer
  'source_document_exists',
  'source_document_not_found',
  'source_commit_required',
  'pointer_conflict',
  'pointer_names_unknown_document',
  // What is stored, or about to be, does not give the digest next to it: never a caller error
  'stored_digest_mismatch',
  // A row of the history was asked to change: never a caller error
  'immutable_record',
  // Quote aggregate
  'quote_not_found',
  'version_not_found',
  'quote_not_calculated',
  'artifact_already_registered',
  'version_conflict',
  'version_locked',
  'version_not_issuable',
  'invalid_transition',
  'state_conflict',
  'recipient_required',
  'recipient_conflict',
  'recipient_locked',
  'recipient_organization_invalid',
  'document_required',
  'document_conflict',
  'document_locked',
  'exception_approval_required',
  'exception_not_applicable',
  'exception_decision_unchanged',
  // Acts that only an identified person performs
  'human_actor_required',
  // Authorization and ownership
  'forbidden',
  'owner_organization_unavailable',
  'owner_organization_mismatch'
] as const

export type QuoterErrorCode = (typeof QUOTER_ERROR_CODES)[number]

export type QuoterErrorDetail = Record<string, string | number | boolean | null>

export class QuoterError extends Error {
  readonly code: QuoterErrorCode
  readonly detail: QuoterErrorDetail

  constructor(code: QuoterErrorCode, detail: QuoterErrorDetail = {}) {
    // The message is the code itself, so a log line or an assertion never depends on prose.
    super(code)
    this.name = 'QuoterError'
    this.code = code
    this.detail = detail
  }
}

export const isQuoterError = (error: unknown): error is QuoterError => error instanceof QuoterError

/**
 * What each named rejection of the database means.
 *
 * Every rule the migrations enforce carries a name: a constraint of a table, or the `CONSTRAINT = '<name>'` of a
 * `RAISE` in a trigger. The driver reports that name, and this map is the only place that reads it. Nothing in the
 * quoter interprets the text of a database message, which changes with the server's language and version.
 *
 * `__tests__/constraint-names.test.ts` reads the migrations and requires the two to agree: a `RAISE` without an
 * entry here, or an entry here that no migration declares, fails there.
 */
export const QUOTER_CONSTRAINT_CODES: Readonly<Record<string, QuoterErrorCode>> = {
  // Shared
  quoter_append_only: 'immutable_record',
  // Source documents
  quoter_source_documents_pkey: 'source_document_exists',
  quoter_source_documents_version_unique: 'source_document_exists',
  quoter_source_documents_text_digest: 'stored_digest_mismatch',
  quoter_source_documents_member_identified: 'human_actor_required',
  quoter_source_documents_origin_names_its_source: 'source_commit_required',
  // Pointer
  quoter_pointer_history_follows_current: 'pointer_conflict',
  quoter_pointer_history_text_digest: 'stored_digest_mismatch',
  quoter_pointer_history_catalog_fk: 'pointer_names_unknown_document',
  quoter_pointer_history_policy_fk: 'pointer_names_unknown_document',
  quoter_pointer_history_credits_fk: 'pointer_names_unknown_document',
  quoter_pointer_history_activation_needs_person: 'human_actor_required',
  quoter_pointer_history_mirror_names_its_commit: 'source_commit_required',
  // Quotes
  quoter_owner_matches_quote: 'owner_organization_mismatch',
  quoter_quotes_owner_fk: 'owner_organization_unavailable',
  quoter_quotes_owner_is_operating_entity: 'owner_organization_unavailable',
  quoter_quotes_member_identified: 'human_actor_required',
  // Versions
  quoter_quote_versions_pkey: 'version_conflict',
  quoter_quote_versions_next_number: 'version_conflict',
  quoter_quote_versions_replay_once_per_quote: 'artifact_already_registered',
  quoter_quote_versions_text_digest: 'stored_digest_mismatch',
  quoter_quote_versions_state_admits_version: 'version_locked',
  quoter_quote_versions_member_identified: 'human_actor_required',
  // Documents of a version
  quoter_version_documents_version_fk: 'version_not_found',
  quoter_version_documents_text_digest: 'stored_digest_mismatch',
  quoter_version_documents_state_admits_document: 'document_locked',
  quoter_version_documents_member_identified: 'human_actor_required',
  // Exception approvals
  quoter_exception_approvals_version_fk: 'version_not_found',
  quoter_exception_approvals_version_is_below_floor: 'exception_not_applicable',
  quoter_exception_approvals_decision_changes_it: 'exception_decision_unchanged',
  // State changes
  quoter_state_transitions_from_is_current: 'state_conflict',
  quoter_state_transitions_pair_exists: 'invalid_transition',
  quoter_state_transitions_pair_fk: 'invalid_transition',
  quoter_state_transitions_issue_names_what_it_issues: 'invalid_transition',
  quoter_state_transitions_version_fk: 'version_not_found',
  quoter_state_transitions_document_fk: 'document_conflict',
  quoter_state_transitions_issues_last_or_issued_version: 'version_not_issuable',
  quoter_state_transitions_issue_needs_recipient: 'recipient_required',
  quoter_state_transitions_issues_document_in_force: 'document_conflict',
  quoter_state_transitions_issue_needs_exception_approval: 'exception_approval_required',
  quoter_state_transitions_member_identified: 'human_actor_required',
  quoter_state_transitions_human_gate_needs_member: 'human_actor_required',
  // Recipients
  quoter_quote_recipients_client_fk: 'recipient_organization_invalid',
  quoter_quote_recipients_not_the_owner: 'recipient_organization_invalid',
  quoter_quote_recipients_only_in_draft: 'recipient_locked',
  quoter_quote_recipients_member_identified: 'human_actor_required',
  // Numbers
  quoter_quote_number_counters_advances_by_one: 'immutable_record'
}

/**
 * The rejection of the quoter a refused statement stands for, or `null` when the database named nothing this
 * registry knows (a connection that dropped, a constraint of another domain): the caller rethrows what it caught.
 */
export const quoterErrorFromDatabase = (error: unknown, detail: QuoterErrorDetail = {}): QuoterError | null => {
  const constraint = constraintOf(error)
  const code = constraint ? QUOTER_CONSTRAINT_CODES[constraint] : undefined

  return code ? new QuoterError(code, { ...detail, constraint: constraint! }) : null
}

/** Runs a statement and turns a named rejection of the database into its `QuoterError`. */
export const withQuoterRejections = async <T>(work: () => Promise<T>, detail: QuoterErrorDetail = {}): Promise<T> => {
  try {
    return await work()
  } catch (error) {
    throw quoterErrorFromDatabase(error, detail) ?? error
  }
}
