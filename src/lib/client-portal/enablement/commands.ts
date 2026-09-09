import 'server-only'

import { sql, type Transaction } from 'kysely'

import type { DB } from '@/types/db'

import { executeAtomicApiPlatformCommand } from '@/lib/api-platform/core/atomic-commands'
import { ApiPlatformError, type ApiPlatformErrorCode } from '@/lib/api-platform/core/errors'
import { enableClientPortalModule } from '@/lib/client-portal/commands/enable-module'
import { recordAssignmentEvent } from '@/lib/client-portal/commands/audit'
import { pauseClientPortalModule } from '@/lib/client-portal/commands/pause-resume'
import { lockClientPortalOrganization } from '@/lib/client-portal/commands/transaction'
import { __clearClientPortalResolverCache } from '@/lib/client-portal/readers/native/module-resolver'
import { getDb } from '@/lib/db'

import { assertServiceEnablementWritesEnabled, authorizeServiceEnablement } from './access'
import { buildServiceEnablementPreview } from './preview'
import { readServiceEnablementInventory, readServiceEnablementReceipt } from './reader'
import type { ServiceEnablementApplyRequest, ServiceEnablementReceipt, ServiceEnablementRollbackRequest } from './types'
import { serviceEnablementApplySchema, serviceEnablementRollbackSchema } from './validation'

const conflict = (errorCode: ApiPlatformErrorCode, message: string): never => {
  throw new ApiPlatformError(message, { statusCode: 409, errorCode })
}

const serializable = async <T>(run: (tx: Transaction<DB>) => Promise<T>): Promise<T> => {
  const db = await getDb()

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.transaction().setIsolationLevel('serializable').execute(run)
    } catch (error) {
      const code = (error as { code?: string }).code

      if (!['40001', '40P01'].includes(code ?? '')) throw error
      if (attempt >= 2) conflict('service_enablement_concurrent_change', 'Concurrent configuration change. Retry with the same command key.')
    }
  }
}

const principal = (userId: string) => ({
  lane: 'app' as const, principalKind: 'internal_actor' as const,
  principalId: `client-service-enablement:${userId}`, userId
})

export const applyServiceEnablement = async (raw: ServiceEnablementApplyRequest, authenticatedUserId: string) => {
  const input = serviceEnablementApplySchema.parse(raw)

  assertServiceEnablementWritesEnabled()
  const actor = await authorizeServiceEnablement(authenticatedUserId, 'apply')
  const organizationId = input.proposal.organizationId

  const result = await serializable(async tx => {
    await sql`SET LOCAL statement_timeout = '15s'`.execute(tx)
    await lockClientPortalOrganization(organizationId, tx)
    await authorizeServiceEnablement(authenticatedUserId, 'apply')

    return executeAtomicApiPlatformCommand({
      tx, principal: principal(actor.userId), scope: { organizationId, greenhouseScopeType: 'organization' },
      routeKey: 'client-services.enablement.apply', idempotencyKey: input.idempotencyKey, body: input,
      run: async operationId => {
        const inventory = await readServiceEnablementInventory(input.proposal, tx)
        const preview = buildServiceEnablementPreview(input.proposal, inventory)

        if (preview.fingerprint !== input.fingerprint) conflict('service_enablement_preview_stale', 'Preview is stale. Review a fresh preview before applying.')
        if (!preview.canApply) conflict('service_enablement_blocked', 'Preview contains unresolved service enablement blockers.')

        const created: ServiceEnablementReceipt['created'] = []
        const preserved: string[] = []

        for (const change of preview.changes) {
          if (change.action === 'preserve') {
            preserved.push(change.assignmentId!)
            continue
          }

          const enabled = await enableClientPortalModule({
            organizationId, moduleKey: change.moduleKey, approvedByUserId: actor.userId,
            source: 'manual_admin', effectiveFrom: inventory.observedAt.slice(0, 10),
            sourceRefJson: { serviceId: change.serviceId, termsId: change.termsId, operationId, fingerprint: input.fingerprint },
            reason: 'Reviewed service enablement preview'
          }, tx)

          if (enabled.idempotent) conflict('service_enablement_preview_stale', 'Assignment changed after preview. Review a fresh preview.')
          created.push({ assignmentId: enabled.assignmentId, moduleKey: change.moduleKey, revision: '' })
        }

        const after = await readServiceEnablementInventory(input.proposal, tx)

        for (const item of created) item.revision = after.assignments.find(assignment => assignment.id === item.assignmentId)!.revision

        const receipt = { version: 1 as const, operationId, organizationId, actorUserId: actor.userId,
          fingerprint: input.fingerprint, created, preserved }

        if (created.length) await recordAssignmentEvent({
          assignmentId: created[0].assignmentId, eventKind: 'enablement_receipt',
          actorUserId: actor.userId, payload: { receipt }
        }, tx)

        return receipt
      }
    })
  })

  if (!result.replayed && result.data.created.length) __clearClientPortalResolverCache(organizationId)

  return result
}

export const rollbackServiceEnablement = async (raw: ServiceEnablementRollbackRequest, authenticatedUserId: string) => {
  const input = serviceEnablementRollbackSchema.parse(raw)

  assertServiceEnablementWritesEnabled()
  const actor = await authorizeServiceEnablement(authenticatedUserId, 'rollback')

  const result = await serializable(async tx => {
    await sql`SET LOCAL statement_timeout = '15s'`.execute(tx)
    await lockClientPortalOrganization(input.organizationId, tx)
    await authorizeServiceEnablement(authenticatedUserId, 'rollback')

    return executeAtomicApiPlatformCommand({
      tx, principal: principal(actor.userId), scope: { organizationId: input.organizationId, greenhouseScopeType: 'organization' },
      routeKey: 'client-services.enablement.rollback', idempotencyKey: input.idempotencyKey, body: input,
      run: async () => {
        const receipt = await readServiceEnablementReceipt(input.organizationId, input.operationId, tx)

        if (receipt.version !== 1 || receipt.organizationId !== input.organizationId || receipt.operationId !== input.operationId) {
          conflict('service_enablement_compensation_conflict', 'Stored enablement receipt is invalid.')
        }

        const snapshot = await readServiceEnablementInventory({ organizationId: input.organizationId,
          targets: receipt.created.map(item => ({ moduleKey: item.moduleKey, serviceId: null })), personIds: [] }, tx)

        for (const item of receipt.created) {
          const assignment = snapshot.assignments.find(row => row.id === item.assignmentId)

          if (!assignment || assignment.revision !== item.revision || assignment.endsAt !== null || assignment.status !== 'active') {
            conflict('service_enablement_compensation_conflict', 'An assignment changed after apply; automatic compensation is no longer safe.')
          }

          await pauseClientPortalModule({ assignmentId: item.assignmentId, actorUserId: actor.userId,
            reason: `Compensate service enablement ${input.operationId}` }, tx)
        }

        return { operationId: input.operationId, organizationId: input.organizationId, paused: receipt.created.map(item => item.assignmentId) }
      }
    })
  })

  if (!result.replayed && result.data.paused.length) __clearClientPortalResolverCache(input.organizationId)

  return result
}
