import 'server-only'

/**
 * Who acted, and under which command, for every row the quoter registry writes (TASK-2025).
 */

/**
 * A person identified by its member id, an agent (a machine identity acting within policy), or a service job.
 *
 * `principalId` is the stable identifier of the authenticated principal that made the call (a user, an API consumer,
 * a service account, the name of a job). It is copied into every immutable row, because the row of the command
 * (`api_platform_command_executions`) expires and is purged: a row that only pointed there would, months later, no
 * longer say who acted.
 */
export type QuoterActor =
  | { kind: 'member'; memberId: string; principalId: string }
  | { kind: 'agent'; principalId: string }
  | { kind: 'service'; principalId: string }

export type QuoterActorKind = QuoterActor['kind']

export const memberIdOf = (actor: QuoterActor): string | null => (actor.kind === 'member' ? actor.memberId : null)

/**
 * The governed command a write belongs to: the row of `greenhouse_core.api_platform_command_executions` that
 * recorded it, and the fingerprint of its request. It is a soft reference (that row is purged with time), so it is
 * never the only trace of who acted. A version and a state change are refused without one, by the database too.
 */
export type QuoterCommandContext = {
  commandExecutionId: string
  requestHash?: string | null
}

export type QuoterDataOrigin = 'real' | 'synthetic'
