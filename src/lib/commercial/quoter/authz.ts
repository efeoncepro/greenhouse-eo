import 'server-only'

import { can } from '@/lib/entitlements/runtime'
import type { TenantEntitlementSubject } from '@/lib/entitlements/types'

import { runQuoterQuery } from './db'
import { QuoterError } from './errors'
import type { QuoterDbClient } from './db'
import type { QuoterActor } from './types'

/**
 * The ONE door of the quoter (TASK-2025). Routes, Nexa, the ecosystem lane and the MCP tools ask here, with the same
 * subject shape, whether an act is allowed. Three planes:
 *
 *   1. who may be here at all: an internal identity. A client identity is never a subject of the quoter; opening a
 *      read to one is another decision (TASK-2027).
 *   2. the capability of the act, with `can()` written with LITERALS on purpose: the grant coverage guard
 *      (`capability-grant-coverage.test.ts`) finds capabilities by reading these calls, and a map from need to
 *      capability would hide them from it. Grants live in `src/lib/entitlements/runtime.ts`, by explicit role.
 *   3. the two acts of a person: activating the catalog and deciding an exception below the floor. A role holding
 *      the capability is not enough: the actor must be an identified member. An agent session or a consumer token
 *      never is. Everything else (issuing, withdrawing, recording what the client answered) depends only on the
 *      capability and on policy.
 *
 * An identity that is not a person passes through the same door. The ecosystem lane derives a machine subject from
 * an internal binding (`userId: consumer:<publicId>`, role `efeonce_account`, `routeGroups: ['internal']`), and the
 * right of an agent to issue IS the grant of `commercial.quoter.issue:approve` to that role. There is no separate
 * concession for a non-human identity.
 */
export const QUOTER_NEEDS = [
  'catalog.read',
  'catalog.update',
  'catalog.activate',
  'simulate',
  'quote.read',
  'quote.create',
  'quote.update',
  'issue',
  'exception'
] as const

export type QuoterNeed = (typeof QUOTER_NEEDS)[number]

/** The acts only an identified person performs, whatever the role holds. */
export const QUOTER_HUMAN_ONLY_NEEDS: readonly QuoterNeed[] = ['catalog.activate', 'exception']

/** Whether the subject holds the capability of the act. One literal `can()` per need. */
export const hasQuoterCapability = (subject: TenantEntitlementSubject, need: QuoterNeed): boolean => {
  switch (need) {
    case 'catalog.read':
      return can(subject, 'commercial.quoter.catalog', 'read', 'tenant')
    case 'catalog.update':
      return can(subject, 'commercial.quoter.catalog', 'update', 'tenant')
    case 'catalog.activate':
      return can(subject, 'commercial.quoter.catalog.activate', 'execute', 'tenant')
    case 'simulate':
      return can(subject, 'commercial.quoter.simulate', 'read', 'tenant')
    case 'quote.read':
      return can(subject, 'commercial.quoter.quote', 'read', 'tenant')
    case 'quote.create':
      return can(subject, 'commercial.quoter.quote', 'create', 'tenant')
    // Also what recording the answer of the client takes (accepted, rejected): no capability of its own.
    case 'quote.update':
      return can(subject, 'commercial.quoter.quote', 'update', 'tenant')
    // Issuing, and withdrawing what was issued.
    case 'issue':
      return can(subject, 'commercial.quoter.issue', 'approve', 'tenant')
    case 'exception':
      return can(subject, 'commercial.quoter.exception', 'approve', 'tenant')
  }
}

/**
 * Lets the act through or throws: `forbidden` for an identity that is not internal or lacks the capability,
 * `human_actor_required` for an act of a person asked by anything else. `actor` is who the command will record as
 * having acted; the door needs it only for the two acts of a person.
 */
export const assertQuoterAccess = (input: { subject: TenantEntitlementSubject; need: QuoterNeed; actor?: QuoterActor }): void => {
  if (input.subject.tenantType !== 'efeonce_internal') throw new QuoterError('forbidden', { need: input.need, reason: 'not_internal' })
  if (!hasQuoterCapability(input.subject, input.need)) throw new QuoterError('forbidden', { need: input.need, reason: 'capability' })

  if (QUOTER_HUMAN_ONLY_NEEDS.includes(input.need) && input.actor?.kind !== 'member')
    throw new QuoterError('human_actor_required', { need: input.need })
}

/** Public id of the canonical organization of Efeonce: the owner and issuer of every quote. */
export const QUOTER_OWNER_ORGANIZATION_PUBLIC_ID = 'EO-ORG-0007'

/**
 * The organization that owns every quote: the canonical one of Efeonce, whoever creates it, a person or an agent.
 *
 * Found by its stable public id and required to be the active operating entity. No UUID is written anywhere: not
 * here, not in a migration, not in a test. When that row is missing or is not what it must be, this fails closed:
 * nothing falls back to "the organization of whoever is calling" (a binding of the ecosystem lane has none).
 */
export const resolveQuoterOwnerOrganizationId = async (client?: QuoterDbClient): Promise<string> => {
  const rows = await runQuoterQuery<{ organization_id: string }>(
    client,
    `SELECT organization_id
       FROM greenhouse_core.organizations
      WHERE public_id = $1
        AND is_operating_entity = TRUE
        AND active = TRUE
        AND status = 'active'
      LIMIT 1`,
    [QUOTER_OWNER_ORGANIZATION_PUBLIC_ID]
  )

  if (!rows[0]) throw new QuoterError('owner_organization_unavailable', { publicId: QUOTER_OWNER_ORGANIZATION_PUBLIC_ID })

  return rows[0].organization_id
}
