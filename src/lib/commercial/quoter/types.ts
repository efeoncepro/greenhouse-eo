import 'server-only'

/**
 * Who acted, and under which command, for every row the quoter registry writes (TASK-2025).
 */

/** A person identified by its member id, an agent (a machine identity acting within policy), or a service job. */
export type QuoterActor =
  | { kind: 'member'; memberId: string }
  | { kind: 'agent' }
  | { kind: 'service' }

export type QuoterActorKind = QuoterActor['kind']

export const memberIdOf = (actor: QuoterActor): string | null => (actor.kind === 'member' ? actor.memberId : null)

/**
 * The governed command a write belongs to: the row of `greenhouse_core.api_platform_command_executions` that
 * recorded it, and the fingerprint of its request. A version and a state change are refused without one, by the
 * database too: nothing reaches the aggregate that a command did not record.
 */
export type QuoterCommandContext = {
  commandExecutionId: string
  requestHash?: string | null
}

export type QuoterDataOrigin = 'real' | 'synthetic'
