import 'server-only'

import type { Transaction } from 'kysely'

import { getDb } from '@/lib/db'
import type { DB } from '@/types/db'

import { ClientPortalValidationError } from './errors'

export type AssignmentTransaction = Transaction<DB>

/** Serialize all module transitions for an organization, including first-time inserts. */
export const lockClientPortalOrganization = async (organizationId: string, tx: AssignmentTransaction) => {
  const organization = await tx.selectFrom('greenhouse_core.organizations')
    .select('organization_id').where('organization_id', '=', organizationId).forUpdate().executeTakeFirst()

  if (!organization) throw new ClientPortalValidationError('Organization not found', 404)
}

export const lockClientPortalAssignment = async (assignmentId: string, tx: AssignmentTransaction) => {
  const assignment = await tx.selectFrom('greenhouse_client_portal.module_assignments')
    .select('organization_id').where('assignment_id', '=', assignmentId).executeTakeFirst()

  if (!assignment) throw new ClientPortalValidationError('Assignment not found', 404)

  await lockClientPortalOrganization(assignment.organization_id, tx)
}

/** The owner of the outer transaction must invalidate caches after its commit. */
export const runAssignmentTransaction = async <T>(
  operation: (tx: AssignmentTransaction) => Promise<T>,
  tx?: AssignmentTransaction
): Promise<T> => tx ? operation(tx) : (await getDb()).transaction().execute(operation)
